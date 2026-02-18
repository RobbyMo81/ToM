# Lessons Learned: OpenClaw Gateway "Ghost Token Mismatch" Debug Session

**Date:** 2026-02-17
**Issue:** `status` command reports `unauthorized: gateway token mismatch` while `gateway probe --token X` succeeds
**Resolution time:** Multiple sessions
**Outcome:** Root causes identified and fixed

---

## 1. Executive Summary

A persistent "ghost" `token mismatch` error in the `status` command turned out to be three compounding issues acting together:

1. **No `OPENCLAW_STATE_DIR` in `.env`** — the gateway and CLI were reading from different config files
2. **Port mismatch from empty config** — `status` connected to the wrong port (18789 default) where a stale/old gateway process was sitting
3. **Code asymmetry** — `status` re-resolved auth independently in `callGateway()` instead of reusing the probe's credentials, and `resolveGatewayProbeAuth()` was missing a fallback env var that `callGateway()` had

Each issue alone was masked or hard to see; together they made the bug appear "ghost-like" — tokens that `config get` showed as identical were actually being read from different files by different commands.

---

## 2. Timeline of What Was Fixed (Pre-Session)

| Fix                                                                                               | Root Cause                                                                      | Symptom                                                                       |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile=false`                                                            | DNS failure (`EAI_AGAIN`) + `EACCES` rename on relink left `tsdown` uninstalled | `pnpm dev` → `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL: Command "tsdown" not found` |
| Replace Unix env syntax in `gateway:dev` script                                                   | PowerShell rejects `KEY=val cmd` syntax                                         | `gateway:dev` script fails on Windows                                         |
| `src/infra/ssh-config.ts` — hardcoded `/usr/bin/ssh` → `process.env.OPENCLAW_SSH_PATH \|\| "ssh"` | Windows OpenSSH is at `C:\Windows\System32\OpenSSH\ssh.exe`, not `/usr/bin/ssh` | `gateway probe` crashed: `spawn /usr/bin/ssh ENOENT`                          |
| `src/infra/ssh-tunnel.ts` — same fix                                                              | Same root cause                                                                 | Same symptom                                                                  |
| `icacls` on `C:\Users\RobMo\.openclaw-dev\`                                                       | Default Windows ACL too permissive for secrets                                  | Security audit warnings at startup                                            |

---

## 3. The Ghost Issue — Full Diagnosis

### 3.1 Symptom

```
pnpm exec -- node dist/entry.js --dev status
→ unauthorized: gateway token mismatch (set gateway.remote.token to match gateway.auth.token)
```

This persisted even when:

- `config get gateway.auth.token` = `local-dev-token-a9b8c7d6e5f4`
- `config get gateway.remote.token` = `local-dev-token-a9b8c7d6e5f4`
- `gateway probe --token local-dev-token-a9b8c7d6e5f4` → **Connect ok · RPC ok**

### 3.2 Why It Felt Like a Ghost

Two commands appeared to use the same token but produced different results. The reason: they were **not connecting to the same gateway process on the same port**.

### 3.3 Root Cause 1 — Missing `OPENCLAW_STATE_DIR` in `.env`

The gateway was started (at some point) with `OPENCLAW_STATE_DIR=~/.openclaw-dev` or equivalent, causing it to write and read config from:

```
C:\Users\RobMo\.openclaw-dev\openclaw.json
```

But `.env` did not include `OPENCLAW_STATE_DIR`. When the CLI (`status`, `config get`, etc.) ran without that env var, `resolveStateDir()` searched in order:

1. `OPENCLAW_STATE_DIR` env var — **not set**
2. `~/.openclaw/` — **exists** (has `identity/`, `canvas/`, `workspace-dev/` but **no `openclaw.json`**)
3. Falls back to `~/.openclaw/openclaw.json` canonical path

Result: `loadConfig()` returned `{}` (empty). The CLI had no knowledge of the gateway port or tokens from the config file — it relied entirely on the `OPENCLAW_GATEWAY_TOKEN` env var from `.env`.

**The gateway config file was invisible to the CLI.**

### 3.4 Root Cause 2 — Port Mismatch → Stale Process

With empty config, `resolveGatewayPort({})` returns `DEFAULT_GATEWAY_PORT = 18789`.

The "working" gateway (that `gateway probe --token X` reaches) was on port **19001** (started with `--port 19001` or a previous explicit invocation).

`status` was connecting to **18789**, where either:

- A **stale old gateway process** was still running (from a previous session), or
- Nothing was there but something on that port returned a token mismatch (e.g., an old process started without a token but responding differently)

Meanwhile, `gateway probe` uses `resolveTargets()` which reads `gateway.remote.url = "ws://127.0.0.1:19001"` and probes it via SSH tunnel — hitting the **correct** gateway.

**Two commands, two different ports, two different processes.**

### 3.5 Root Cause 3 — Code Asymmetry in Auth Resolution

`gateway probe` command uses `resolveAuthForTarget()` — **target-aware**:

- SSH/remote target → `gateway.remote.token`
- Local loopback target → `gateway.auth.token`

`status` command uses `resolveGatewayProbeAuth()` — **mode-based only**:

- `gateway.mode = "remote"` → `gateway.remote.token`
- `gateway.mode = "local"` → `OPENCLAW_GATEWAY_TOKEN` env var OR `gateway.auth.token`

Additional asymmetry: `callGateway()` checked `CLAWDBOT_GATEWAY_TOKEN` as a fallback but `resolveGatewayProbeAuth()` did not. If `CLAWDBOT_GATEWAY_TOKEN` was set to a legacy/wrong value, `callGateway()` could pick it up while the probe would not.

Additionally, `status.scan.ts` called `callGateway()` with no explicit auth — it re-resolved credentials independently instead of reusing the credentials that the successful probe used.

---

## 4. Fixes Applied

### 4.1 `.env` — Add `OPENCLAW_STATE_DIR`

```diff
+ OPENCLAW_STATE_DIR=~/.openclaw-dev
```

**Effect:** Every command (`gateway`, `status`, `config get/set`, `gateway probe`) now reads from the same config file. Port, auth tokens, and mode are consistent across all CLI operations.

### 4.2 `src/commands/status.scan.ts` — Pass auth explicitly to `callGateway`

```diff
+ const probeAuth = resolveGatewayProbeAuth(cfg);
  const gatewayProbe = remoteUrlMissing
    ? null
    : await probeGateway({
        url: gatewayConnection.url,
-       auth: resolveGatewayProbeAuth(cfg),
+       auth: probeAuth,
        ...
      }).catch(() => null);
  ...
  const channelsStatus = gatewayReachable
    ? await callGateway({
        method: "channels.status",
        params: { ... },
+       token: probeAuth.token,
+       password: probeAuth.password,
        ...
      }).catch(() => null)
    : null;
```

**Effect:** `callGateway()` uses the exact same credentials as the successful probe instead of independently re-resolving them (which could pick up different env vars).

### 4.3 `src/commands/status.gateway-probe.ts` — Add missing env var fallback

```diff
  const token = isRemoteMode
    ? remote?.token?.trim() || undefined
    : process.env.OPENCLAW_GATEWAY_TOKEN?.trim() ||
+     process.env.CLAWDBOT_GATEWAY_TOKEN?.trim() ||
      (authToken?.trim() || undefined);
```

**Effect:** `resolveGatewayProbeAuth()` now has parity with `callGateway()`'s env var resolution order. Avoids scenario where `callGateway()` picks up a legacy token that the probe doesn't.

### 4.4 SSH path fixes (pre-session, for record)

```typescript
// src/infra/ssh-config.ts and src/infra/ssh-tunnel.ts
// Before:
spawn("/usr/bin/ssh", ...)

// After:
spawn(process.env.OPENCLAW_SSH_PATH || "ssh", ...)
```

**Effect:** Windows resolves `ssh` from `PATH` (`C:\Windows\System32\OpenSSH\ssh.exe`). No longer hardcoded to Linux path.

---

## 5. Key Lessons

### L1 — "Same token in `config get`" does not mean "same token in runtime"

`config get` reads from whatever config file the CLI resolves at that moment. If the running gateway was started with a different `OPENCLAW_STATE_DIR` than your current shell, they are reading from different files. Always verify:

```powershell
node dist/entry.js config info   # shows actual config path being read
```

### L2 — Multiple gateway processes are the most common source of ghost errors

When you see inconsistent auth behavior (probe works, status doesn't), the first diagnostic should be:

```powershell
netstat -ano | findstr :18789
netstat -ano | findstr :19001
Get-Process node
```

Kill **all** Node gateway processes and restart from a clean state. The `--force` flag exists for this:

```powershell
node dist/entry.js gateway --dev --force
```

### L3 — `DEFAULT_GATEWAY_PORT` is a silent footgun

The default port (18789) is only used when no config file is found and no `OPENCLAW_GATEWAY_PORT` env var is set. If any of these are missing or inconsistent:

- Gateway starts on 19001 (explicit `--port`)
- CLI connects to 18789 (default from empty config)
- They never talk to each other — but the error may look like auth failure, not connection failure, if something _else_ is on 18789

**Fix:** Always set `gateway.port` explicitly in config or `OPENCLAW_GATEWAY_PORT` in `.env`.

### L4 — Windows vs WSL home directory split causes invisible config divergence

Node.js running natively on Windows: `os.homedir()` = `C:\Users\RobMo`
Node.js running in WSL: `os.homedir()` = `/home/robbymo`

These are completely separate filesystem locations. If the gateway runs on Windows and the CLI runs in WSL (or vice versa), they will never find the same `~/.openclaw/` directory unless you use `OPENCLAW_STATE_DIR` with an explicit path that both environments agree on.

**For cross-env setups:** Use `OPENCLAW_STATE_DIR` pointing to a Windows path accessible from WSL via `/mnt/c/...`.

### L5 — dotenv precedence matters: existing env vars are never overridden

`loadDotEnv()` loads `.env` from CWD first, then `~/.openclaw/.env`, with `override: false`. This means:

- If `OPENCLAW_GATEWAY_TOKEN` was already set in your PowerShell session (e.g., from a previous `$env:OPENCLAW_GATEWAY_TOKEN = "X"` command), the `.env` file's value is silently ignored
- The token you think is being used may not be the token being sent

**Always check the shell environment directly:**

```powershell
echo $env:OPENCLAW_GATEWAY_TOKEN
echo $env:OPENCLAW_STATE_DIR
echo $env:OPENCLAW_GATEWAY_PORT
```

### L6 — `gateway probe` and `status` use different auth resolution paths

| Command                  | Auth resolver               | Target-awareness                                           |
| ------------------------ | --------------------------- | ---------------------------------------------------------- |
| `gateway probe`          | `resolveAuthForTarget()`    | Yes — SSH/remote → `remote.token`, loopback → `auth.token` |
| `status` (probe step)    | `resolveGatewayProbeAuth()` | No — mode-based only                                       |
| `status` (channels step) | `callGateway()` internal    | No — mode-based + env vars                                 |

This asymmetry means a successful `gateway probe` does **not** guarantee `status` will also succeed. After the fix, `status` explicitly threads `probeAuth` through to `callGateway()` to ensure consistency.

### L7 — The error hint "set gateway.remote.token to match gateway.auth.token" is about the _client_, not the server

This hint appears in `formatGatewayAuthFailureMessage()` whenever a **CLI client** (`isGatewayCliClient = true`) sends the wrong token. It tells you what config key the _client_ should set — not that the server is misconfigured. Do not interpret it as "the server's remote token is wrong."

### L8 — On Windows, `OPENCLAW_SKIP_CHANNELS=1` cannot be set inline in PowerShell

Unix shell: `OPENCLAW_SKIP_CHANNELS=1 node ...` — works
PowerShell: same syntax — **silently fails** (env var not set, command runs anyway)

PowerShell equivalent:

```powershell
$env:OPENCLAW_SKIP_CHANNELS = "1"
node dist/entry.js gateway --dev
```

Or in a single command:

```powershell
$env:OPENCLAW_SKIP_CHANNELS = "1"; pnpm exec -- node dist/entry.js gateway --dev
```

### L9 — Hardcoded Unix paths break Windows silently at runtime, not compile time

`spawn("/usr/bin/ssh", ...)` compiles fine on any platform. The error `ENOENT` only surfaces at runtime when the gateway actually tries to create an SSH tunnel. This makes it appear as if the feature is broken when it is simply a path issue.

**Pattern to follow for any system binary:**

```typescript
spawn(process.env.OPENCLAW_SSH_PATH || "ssh", ...)
// or
spawn(process.env.OPENCLAW_FFMPEG_PATH || "ffmpeg", ...)
```

Letting the OS resolve from `PATH` is always more portable than hardcoding Unix paths.

### L10 — Config backups (`openclaw.json.bak.*`) indicate repeated resets

Multiple `.bak` files in `~/.openclaw-dev/` suggest `--reset` was run several times or the config was overwritten. Each reset wipes auth tokens. If you reset and then set tokens, old running gateway processes still have the pre-reset tokens in memory.

**After any config reset:**

1. Stop all gateway processes
2. Set your tokens fresh
3. Start the gateway again

---

## 6. Operational Checklist for Dev Gateway Setup (Windows)

```powershell
# Step 1 — Ensure .env is complete
# (check that OPENCLAW_STATE_DIR and OPENCLAW_GATEWAY_PORT are set)
cat .env

# Step 2 — Kill any old gateway processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Step 3 — Build latest
pnpm dev

# Step 4 — Start gateway (reads config from OPENCLAW_STATE_DIR)
$env:OPENCLAW_SKIP_CHANNELS = "1"
pnpm exec -- node dist/entry.js gateway --dev

# Step 5 — In a new terminal, verify status
pnpm exec -- node dist/entry.js status

# Step 6 — If still seeing issues, check what config path is being read
pnpm exec -- node dist/entry.js config info
```

---

## 7. Recommended `.env` Template for Dev

```env
# Core identity
OPENCLAW_IMAGE=assistantrobby

# State dir — MUST match the directory the gateway uses
# This ensures all CLI commands (status, config, probe) read from the same file
OPENCLAW_STATE_DIR=~/.openclaw-dev

# Gateway auth token — MUST match gateway.auth.token in the config file
OPENCLAW_GATEWAY_TOKEN=local-dev-token-a9b8c7d6e5f4

# Gateway port — MUST match the port the gateway listens on
# Set this explicitly to avoid DEFAULT_GATEWAY_PORT (18789) surprises
# OPENCLAW_GATEWAY_PORT=18789

# Docker/container paths (not used by native Windows run)
OPENCLAW_CONFIG_DIR=./.openclaw-config
OPENCLAW_WORKSPACE_DIR=./.openclaw-workspace
OPENCLAW_SECRETS_DIR=./.secrets

# Optional: skip channel connections during dev
# (set in PowerShell session, not here, due to per-command nature)
# OPENCLAW_SKIP_CHANNELS=1

# Session keys (fill in if using Claude web channel)
CLAUDE_AI_SESSION_KEY=
CLAUDE_WEB_SESSION_KEY=
CLAUDE_WEB_COOKIE=
```

---

## 8. Files Changed in This Session

| File                                   | Change                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `.env`                                 | Added `OPENCLAW_STATE_DIR=~/.openclaw-dev`                                 |
| `src/commands/status.scan.ts`          | Extract `probeAuth`, pass `token`/`password` explicitly to `callGateway()` |
| `src/commands/status.gateway-probe.ts` | Added `CLAWDBOT_GATEWAY_TOKEN` fallback to match `callGateway()` parity    |
| `src/infra/ssh-config.ts`              | `OPENCLAW_SSH_PATH \|\| "ssh"` — remove hardcoded `/usr/bin/ssh`           |
| `src/infra/ssh-tunnel.ts`              | `OPENCLAW_SSH_PATH \|\| "ssh"` — remove hardcoded `/usr/bin/ssh`           |
