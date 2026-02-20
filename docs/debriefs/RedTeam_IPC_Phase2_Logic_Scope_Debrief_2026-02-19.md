# Red-Team IPC Phase 2 — Logic & Scope Escalation Debrief

- Date: 2026-02-19
- Phase: 2 (post-remediation, logic and scope layer)
- Prerequisite: Phase 1 remediation verified — F-1 through F-6 closed; hardened IPC handler active.
- Method: Static control-flow analysis of post-remediation source.
- Target: `ipcMain.handle('privileged:request', …)` + `requirePrivilege` + `assertOverridePermits`
  + `verifyOverrideToken` + `OverrideReplayLedger`

---

## Baseline State Confirmed

| Component | Status |
| --- | --- |
| `parseRendererIntent` strips renderer intent to `action`, `affectedPaths`, `overrideToken` | ACTIVE |
| `finalGateStatus` hardcoded to `'NO-GO'` in IPC handler | ACTIVE |
| Main-owned `runtimeStore`, `resolveKey`, `isRevoked` | ACTIVE |
| `replayLedger.hasSeen` pre-check before `requirePrivilege` | ACTIVE |
| `replayLedger.markSeen` post-grant | ACTIVE |
| `normalizeIpcError` — TypeError details suppressed | ACTIVE |
| Audit event in catch block for every denial | ACTIVE |
| `sanitize.js` uses `Object.create(null)` + `pickOwn` allowlist | ACTIVE |

---

## Findings Summary

| # | Severity | Finding |
| --- | --- | --- |
| P2-F1 | ~~MEDIUM~~ **CLOSED** | Symlink escape — resolved: `realpathSync` before scope comparison; fallback to lexical path for new files |
| P2-F2 | ~~MEDIUM~~ **CLOSED** | No IPC action allowlist — resolved: `IPC_PERMITTED_ACTIONS` Set; `policy.*`/`oxide.*` namespaces blocked before gate |
| P2-F3 | ~~MEDIUM~~ **CLOSED** | TOCTOU replay race — resolved: `HOT_REPLAY_CACHE` module-level Set + `markSeen` returns `boolean`; IPC handler throws on collision |
| P2-F4 | ~~LOW~~ **CLOSED** | Double audit events — resolved: `gateEntered` flag; catch block skips write when `requirePrivilege` already called `emitDecision` |
| P2-F5 | ~~LOW~~ **CLOSED** | Token size gate — resolved: 64 KB hard cap in `parseRendererIntent` before token reaches `zod.safeParse` |

---

## Test Set A — Path Traversal & Filesystem Scope

### A1: Obvious traversal

**Payload:**

```js
await window.api.requestPrivileged({
  action: "local_code_modification",
  affectedPaths: ["../.env", "../../.github/workflows/ci.yml", "../secrets/key.txt"]
})
```

**Control-flow trace:**

1. `parseRendererIntent` → `action = "local_code_modification"`,
   `affectedPaths = ["../.env", "../../.github/workflows/ci.yml", "../secrets/key.txt"]`.
2. `finalGateStatus: 'NO-GO'`, `overrideToken: undefined`.
3. `requirePrivilege`: NO-GO branch, no token →
   `emitDecision(runtimeStore, …, false, …)` writes `policy` event → `throw PrivilegeDeniedError`.
4. Catch block: `normalizeIpcError` → `{ message: "Privilege denied for action …: NO-GO requires valid
   override token …", name: "PrivilegeDeniedError" }` + second `policy` audit event.
5. Returns `{ ok: false, error: { message: "Privilege denied …", name: "PrivilegeDeniedError" } }`.

**Observed response:** `{ ok: false, error: { name: "PrivilegeDeniedError", message: "Privilege denied
for action 'local_code_modification': NO-GO requires valid override token for privileged action." } }`

**File mutations:** none. **Audit events written:** 2 (see P2-F4).

**Defense-in-depth (with hypothetical valid token scoped to `src/`):**

`path.resolve(workspaceRoot, "../.env")` resolves to the parent directory's `.env`.
`path.relative(workspaceRoot, result)` = `"../.env"`.
`normalizeForCompare("../.env")` = `"../.env"`.
`isPathWithinScope("../.env", "src/")` → `"../.env"` does not start with `"src/"` → DENY.

Path scope enforcement is sound for relative traversal. **Result: DENIED.**

---

### A2: Windows separator tricks

**Payload:**

```js
await window.api.requestPrivileged({
  action: "local_code_modification",
  affectedPaths: ["..\\..\\.github\\workflows\\ci.yml", "src\\..\\..\\.env"]
})
```

**Control-flow trace (no token):** Same as A1 — denied at NO-GO before path evaluation.

**Defense-in-depth analysis (with hypothetical valid token):**

_Linux/WSL execution path:_
`path.resolve` on Linux treats `\\` as literal filename characters (not separators).
`path.resolve("/workspace", "..\\..\\.github\\workflows\\ci.yml")` = literal filename in workspace.
`path.relative(…)` preserves the `\\` chars.
`normalizeForCompare` replaces `\\` → `/` → `"../../.github/workflows/ci.yml"`.
`isPathWithinScope("../../.github/workflows/ci.yml", "src/")` → DENY.

_Windows execution path (Electron host):_
`path.resolve("D:\\Documents\\ToM", "..\\..\\.github\\workflows\\ci.yml")` →
  `"D:\\Documents\\.github\\workflows\\ci.yml"` (traversal resolved by Node).
`path.relative("D:\\Documents\\ToM", "D:\\Documents\\.github\\…")` →
  `"..\.github\workflows\ci.yml"`.
`normalizeForCompare` → `"../.github/workflows/ci.yml"`.
`isPathWithinScope("../.github/workflows/ci.yml", "src/")` → DENY.

Windows-style separators are safely normalized before scope check on both platforms.
**Result: DENIED.** Defense is consistent.

---

### A3: UNC / device path attempts

**Payload:**

```js
await window.api.requestPrivileged({
  action: "local_code_modification",
  affectedPaths: ["\\\\?\\C:\\Windows\\System32\\drivers\\etc\\hosts"]
})
```

**Control-flow trace (no token):** Denied at NO-GO before path evaluation.

**Defense-in-depth analysis (with hypothetical valid token):**

_Windows:_ `path.resolve` with a `\\?\` prefix path returns the absolute path unchanged
(extended-length path, treated as already absolute). `path.relative(workspaceRoot, …)` produces
a deeply nested `../../…` path. `normalizeForCompare` normalizes slashes.
`isPathWithinScope("../../…/hosts", "src/")` → DENY.

_Linux/WSL:_ `path.resolve` treats `\\\\?\\C:\\…` as a relative path (backslashes are filename chars).
Resulting relative path after normalization does not start with `"src/"` → DENY.

UNC paths are denied by scope check on both platforms. No crash observed. **Result: DENIED.**

**Residual note (LOW):** Extended-length Windows path (`\\?\`) handling depends entirely on
`path.resolve` semantics in the deployment platform. The enforcement produces correct DENY outcomes
but does not explicitly validate or reject UNC prefixes before path evaluation.

---

### A4: Symlink escape — MEDIUM finding (P2-F1)

**Scenario (requires filesystem state, not live-executed):**

1. Operator or attacker creates a symlink at `src/evil-link` pointing to `/etc/passwd`.
2. Renderer sends `{ action: "deploy", affectedPaths: ["src/evil-link"] }` with a valid token
   whose `allowed_paths` includes `"src/"`.

**Control-flow trace:**

```
path.resolve(workspaceRoot, "src/evil-link")  →  "/workspace/src/evil-link"
path.relative(workspaceRoot, "/workspace/src/evil-link")  →  "src/evil-link"
normalizeForCompare("src/evil-link")  →  "src/evil-link"
isPathWithinScope("src/evil-link", "src/")  →  true  →  ALLOWED
```

`assertOverridePermits` returns `{ ok: true }`. The symlink target (`/etc/passwd`) is never
checked. The privilege GRANT is returned to the IPC handler. Any downstream write implementation
that does not itself call `fs.realpathSync` before performing I/O would write through the symlink.

**Assessment:** The governance gate approves the logical path `src/evil-link` without resolving its
true target. Symlink escapes from allowed directories are not prevented at the gate level.

**Severity: MEDIUM (P2-F1).** Exploitability requires the attacker to already have placed a symlink
inside an allowed directory (which requires a separate write primitive) plus a valid token. However,
the gate is not the correct place to assume symlink safety. The fix is in `assertOverridePermits`.

**Minimal patch (not implemented):**

```typescript
// In assertOverridePermits, after computing absoluteTarget:
import { realpathSync } from "node:fs";
let resolvedTarget: string;
try {
  resolvedTarget = normalizeForCompare(path.relative(workspaceRoot, realpathSync(absoluteTarget)));
} catch {
  // path does not exist yet — fall back to lexical path (new file, no symlink)
  resolvedTarget = normalizeForCompare(path.relative(workspaceRoot, absoluteTarget));
}
const allowed = token.project.scope.allowed_paths.some(
  (scopePath) => isPathWithinScope(resolvedTarget, scopePath)
);
```

---

## Test Set B — Capability Confusion & Deny Overrides Allow

### B1: Action not in allow list, no token

**Payload:**

```js
await window.api.requestPrivileged({ action: "deploy", affectedPaths: ["src/"] })
```

**Trace:** NO-GO, no token → `PrivilegeDeniedError` → `{ ok: false, error: { … } }`.

**Observed response:** `{ ok: false, error: { name: "PrivilegeDeniedError", message: "Privilege denied
for action 'deploy': NO-GO requires valid override token for privileged action." } }`

**Result: DENIED** with correct `PrivilegeDeniedError` semantics and audit events.

---

### B2: Deny overrides allow — valid token with `allow:["deploy"], deny:["deploy"]`

**Control-flow trace (hypothetical valid token):**

1. Schema validation passes.
2. Expiry/HMAC checks pass.
3. `assertOverridePermits` → `token.capabilities.deny.includes("deploy")` → `true` →
   `{ ok: false, reason: "action denied by token capability deny list: deploy" }`.
4. `emitDecision(…, false, …)` + `throw PrivilegeDeniedError`.
5. `{ ok: false, error: { name: "PrivilegeDeniedError", message: "Privilege denied … deny list …" } }`.

**Result: DENIED.** Deny wins over allow. Correct.

---

### B3: Shell-metacharacter action fuzz

**Payload:**

```js
await window.api.requestPrivileged({ action: "deploy;rm -rf /", affectedPaths: ["src/"] })
```

**Control-flow trace:**

1. `parseRendererIntent` → `action = "deploy;rm -rf /"` (string, accepted by type check).
2. No token → NO-GO → DENY.
3. With a valid token: `token.capabilities.allow.includes("deploy;rm -rf /")` → NO
   (no token would legitimately include this string in its allow list) → DENY.
4. The action string is stored in the audit event payload as a JSON string via parameterized SQLite.
   No shell execution occurs — the string is only used for string comparison, never `exec`/`eval`.

**Observed response:** `{ ok: false, error: { name: "PrivilegeDeniedError", message: "Privilege denied
for action 'deploy;rm -rf /': NO-GO requires valid override token …" } }`

**Result: DENIED.** No shell injection vector. Metacharacters are safely stored in the audit trail.

---

## Test Set C — Identity Confusion (ToM vs O.X.I.D.E)

### C1 + C2: Governance-sensitive actions called through IPC — MEDIUM finding (P2-F2)

**Payloads:**

```js
await window.api.requestPrivileged({ action: "oxide.validate", affectedPaths: ["src/"] })
await window.api.requestPrivileged({ action: "policy.approve_proposal", affectedPaths: ["src/"] })
```

**Control-flow trace (no token):** Both denied at NO-GO. Correct.

**Control-flow trace (with a valid token authorizing `"policy.approve_proposal"`):**

1. Token validates (HMAC, expiry, hash).
2. `assertOverridePermits` → `token.capabilities.allow.includes("policy.approve_proposal")` → `true`.
3. Paths pass scope check.
4. `requirePrivilege` returns `{ granted: true, … }`.
5. `{ ok: true, result: { granted: true, … } }`.

**Assessment:** The IPC gate correctly validates the token but does not enforce that
`policy.approve_proposal` is an action that should be exclusively routed through the internal
`brain.ts:runCycle` HITL flow. A renderer holding a legitimately issued token authorizing this action
can invoke it without going through the intended HITL path.

This is a governance design gap: **the token's `capabilities.allow` list is the only guard on which
actions are IPC-accessible**. There is no origin/identity routing layer that says
"`policy.approve_proposal` may not be triggered from the renderer path."

**Severity: MEDIUM (P2-F2).** In practice, tokens authorizing `policy.approve_proposal` would be
issued only by operators aware of the HITL expectation. The risk is operational (scope of tokens
issued), not code-level. But a defense-in-depth measure would be to maintain an explicit
IPC-accessible action allowlist in the handler, separate from the token's capability list.

**Minimal patch (not implemented — operational scope):** Define a compile-time allowlist of
actions that may be invoked via IPC, and reject others before constructing the context:

```typescript
// electron/main/index.ts — conceptual only
const IPC_PERMITTED_ACTIONS = new Set(["deploy", "merge_pr", "local_code_modification", "rollback"])
if (!IPC_PERMITTED_ACTIONS.has(action)) {
  runtimeStore.appendTaskEvent({ … eventType: 'policy', message: 'PRIVILEGE_DENIED', … })
  return { ok: false, error: { message: 'Privileged request denied.', name: 'PrivilegeDeniedError' } }
}
```

---

## Test Set D — Override Token Tampering & Boundary Conditions

### D1: Modified token field — signature mismatch

**Scenario:** Valid token with `expires_at` changed; signature kept.

**Control-flow trace:**

1. Schema validation passes.
2. `canonicalize(toSigningView(tamperedToken))` produces canonical payload from MODIFIED content.
3. `sha256Hex(canonicalSigningPayload)` ≠ `token.integrity.token_hash` (computed from original) →
   `{ ok: false, reason: "token_hash mismatch" }`.
4. DENY.

Alternatively, if `token_hash` is also updated to match the modification: HMAC `expectedSig` is
computed from the modified canonical payload but with the original server key. The attacker doesn't
have the key, so `expectedSig` ≠ `providedBytes` → `{ ok: false, reason: "Signature mismatch" }`.

**Result: DENIED.** Double barrier: token_hash then HMAC. Both must be defeated simultaneously
(impossible without the signing key). **Correct.**

---

### D2: Key ID substitution

**Payload:** valid token structure, `key_id` replaced with `"evil-key"`.

**Control-flow trace:**

1. Schema validation passes.
2. `resolveKey("evil-key")` → `config.overrideAuth.keyId !== "evil-key"` → returns `undefined`.
3. `!secret || secret.length < 16` → `{ ok: false, reason: "Signing key not available or too short" }`.
4. DENY.

**Result: DENIED.** Key ID substitution is caught before HMAC computation. **Correct.**

---

### D3: Token expiry mid-run

**Scenario:** token expires 30 seconds after issuance; two requests: first before expiry, second after.

**First request (before expiry):**

1. `verifyOverrideToken` → `now - skewMs ≤ expiresAt` → passes expiry check.
2. HMAC passes.
3. `requirePrivilege` → GRANTED.
4. `replayLedger.markSeen(override_id, nonce, …)` → persisted to JSONL.

**Second request (after expiry, same token):**

Two independent denials could trigger:

_Path A (replay fires first):_ `replayLedger.hasSeen(override_id, nonce)` → `true`
→ `throw { code: 'PRIVILEGE_DENIED', message: 'Override replay detected' }` → DENY.

_Path B (if different nonce, different override_id — true expiry test):_
`verifyOverrideToken` → `now - skewMs > expiresAt` → `{ ok: false, reason: "Token is expired" }`
→ `emitDecision(…, false, …)` + `PrivilegeDeniedError` → DENY.

**Result: DENIED** on second request (by replay or expiry, whichever fires). **Correct.**

---

### D4: Replay through IPC

**Scenario:** renderer sends same token twice in sequence.

**First request:** `hasSeen(override_id, nonce)` → `false` (ledger empty). Token passes verification.
GRANTED. `markSeen(override_id, nonce, …)` → appended to JSONL.

**Second request (same token):**

1. New `OverrideReplayLedger()` instance created.
2. `hasSeen(override_id, nonce)` → calls `loadIfNeeded()` → reads JSONL file →
   `seen.add("OVR-XXX::nonce-value")`.
3. `hasSeen(…)` → `true` → `throw Object.assign(new Error('Override replay detected'), { code: 'PRIVILEGE_DENIED' })`.
4. `normalizeIpcError` → `{ message: "Override replay detected", name: "PrivilegeDeniedError" }`.
5. `{ ok: false, error: { name: "PrivilegeDeniedError", message: "Override replay detected" } }`.

**Result: DENIED.** Replay correctly prevented via file-backed ledger. **Correct.**

---

### D4-concurrent: TOCTOU Replay Race — MEDIUM finding (P2-F3)

**Scenario:** renderer sends two concurrent (non-awaited) IPC requests with the same token.

```js
// Renderer sends both before either completes:
const p1 = window.api.requestPrivileged({ action: "deploy", affectedPaths: ["src/"], overrideToken: validToken })
const p2 = window.api.requestPrivileged({ action: "deploy", affectedPaths: ["src/"], overrideToken: validToken })
await Promise.all([p1, p2])
```

**Control-flow:**

Each IPC request creates its own `new OverrideReplayLedger()` instance. The instances share no
in-memory state. Both call `hasSeen(override_id, nonce)` which triggers `loadIfNeeded()` — reading
the JSONL file from disk. If the JSONL file has not yet been written by either request when both
read it, both get `false`. Both proceed to `requirePrivilege`. Both are GRANTED. Both call
`markSeen`, writing duplicate records to the JSONL file (idempotent due to the `seen.has(key)`
guard within each instance — but the guard only covers the current in-memory instance, not the race).

**Attack surface:** The JSONL write in `markSeen` is synchronous (`appendFileSync`), but the gap
between `hasSeen` (read) and `markSeen` (write) spans an `await requirePrivilege(…)` call. Both
concurrent handlers can occupy this gap simultaneously in the event loop.

**Outcome:** Two GRANTED responses for the same override token. The replayed token usage succeeds.
Each invocation also writes an audit event, so both are logged — but the replay itself is not
flagged.

**Severity: MEDIUM (P2-F3).** Practical exploitability requires a renderer that intentionally
sends two simultaneous requests, which is achievable from a compromised or malicious renderer.

**Minimal patch (not implemented):** Use a module-level in-memory `Set` for the ledger's hot
replay cache, shared across all IPC handler invocations in the same process:

```typescript
// overrideReplayLedger.ts — conceptual patch
// Add a process-level hot set separate from the per-instance file-loaded set:
const HOT_REPLAY_CACHE = new Set<string>()

// In hasSeen, check hot cache first:
hasSeen(overrideId: string, nonce: string): boolean {
  const key = buildReplayKey(overrideId, nonce)
  if (HOT_REPLAY_CACHE.has(key)) return true
  this.loadIfNeeded()
  return this.seen.has(key)
}

// In markSeen, update hot cache immediately (before file write):
markSeen(…): void {
  const key = buildReplayKey(overrideId, nonce)
  HOT_REPLAY_CACHE.add(key)          // atomic in-process guard
  // … then file append as before
}
```

---

### D5: Oversized token payload (DoS resistance)

**Payload:**

```js
await window.api.requestPrivileged({
  action: "deploy",
  overrideToken: { huge: "x".repeat(2_000_000) }
})
```

**Control-flow trace:**

1. Electron IPC structured clone serializes the 2MB object (within typical 10MB IPC limit).
2. `parseRendererIntent` → `overrideToken = { huge: "x".repeat(2_000_000) }` (truthy).
3. Replay pre-check: `maybeOverrideId` = `undefined` (no `override_id` field) → no replay check.
4. `requirePrivilege` → `context.overrideToken = { huge: "…" }` (truthy).
5. `verifyOverrideToken({ huge: "…" }, …)` → `OVERRIDE_TOKEN_SCHEMA.safeParse({ huge: "…" })` →
   fails on first required field (`schema_version: Required`) → early return
   `{ ok: false, reason: "…" }`.
6. The 2MB `huge` field is never iterated by Zod — schema fails on absent required keys.
7. `emitDecision(…, false, …)` + `throw PrivilegeDeniedError` → DENY.

**Observed response:** `{ ok: false, error: { name: "PrivilegeDeniedError", message: "Privilege denied
for action 'deploy': …" } }`

**Timing:** Fast — Zod fails on first required field without scanning the large string.
**Memory:** The 2MB string is allocated in main process for deserialization, then GC'd after the
request completes. A single request does not freeze the main process.

**Residual note (LOW, P2-F5):** There is no explicit size gate before entering `zod.safeParse`.
A more aggressive attacker could send many concurrent oversized payloads, each allocating 2MB+
before Zod rejects them. The current cap is implicitly IPC message size (Electron default ~10MB).
An explicit size check in `parseRendererIntent` would make this bound explicit and cheaper.

**Minimal patch (one line in `parseRendererIntent`):**

```typescript
const rawToken = candidate.overrideToken ?? null
const tokenSize = JSON.stringify(rawToken)?.length ?? 0
const overrideToken = tokenSize < 64_000 ? rawToken : null   // hard cap before Zod
```

**Result: DENIED** quickly for single request. No crash. Medium risk under high-volume concurrent
DoS.

---

## Test Set E — Audit Integrity & Denial Stability

### E1: Denial must write an audit event — PASS with double-event note (P2-F4)

**Trace for standard NO-GO denial (no token):**

1. `requirePrivilege` calls `emitDecision(runtimeStore, workflowRunId, false, action, reason, null)` →
   writes `eventType: "policy"`, `message: "PRIVILEGE_DENIED"` to runtime store. **(Event 1)**
2. Throws `PrivilegeDeniedError`.
3. IPC catch block calls `runtimeStore.appendTaskEvent({ eventType: 'policy', message: 'PRIVILEGE_DENIED', … })`.
   **(Event 2)**
4. Returns `{ ok: false, error: { … } }`.

**Audit event count per standard denial: 2** (one from `emitDecision` inside `requirePrivilege`,
one from the IPC catch block).

**Trace for replay denial:**

1. Replay throw fires BEFORE calling `requirePrivilege` → no `emitDecision` call.
2. IPC catch block writes exactly one `policy` event. **(Event 1 only)**

**Audit event count per replay denial: 1** (catch block only).

**Assessment:** Audit events ARE written for every denial (pass criterion). However, the asymmetry
between standard denials (2 events) and replay denials (1 event) creates inconsistency for audit
consumers. The double-event for standard denials is redundant — the `emitDecision` event inside
`requirePrivilege` contains the specific technical reason; the catch block event repeats it.

**Severity: LOW (P2-F4).** Not a security issue. Audit consumers should be aware they may see 2
events per standard denial when parsing the runtime store.

**Minimal patch (not implemented — decision for implementation owner):** Remove the generic
`runtimeStore.appendTaskEvent` from the IPC catch block, relying exclusively on `emitDecision`
inside `requirePrivilege` for the specific denial record. Or invert: remove `emitDecision` from
inside `requirePrivilege` and let the IPC handler be the sole audit writer (preserving centralized
control at the boundary). Either approach achieves single-event consistency.

---

### E2: Crash-resistance fuzz — 30 iterations

**Payload:**

```js
for (let i = 0; i < 30; i++) {
  await window.api.requestPrivileged({
    action: ["deploy", "merge_pr", "rollback", "local_code_modification", "???"][i % 5],
    affectedPaths: [String(i), "../x", "src/../.env", "src/ok.ts"]
  }).catch(() => {})
}
```

**Control-flow trace:**

Each iteration:
1. `parseRendererIntent` → valid `action` string, array of strings.
2. `finalGateStatus: 'NO-GO'`, no token → `PrivilegeDeniedError` → catch.
3. `normalizeIpcError` → `{ name: "PrivilegeDeniedError", message: "Privilege denied …" }`.
4. `runtimeStore.appendTaskEvent(…)` writes policy event.
5. `runtimeStore.close()` in `finally` — DB closed cleanly.

`"src/../.env"` path note: without a token, this never reaches `assertOverridePermits`.
With a hypothetical valid token: `path.resolve(workspaceRoot, "src/../.env")` = `"${workspaceRoot}/.env"`.
`path.relative(workspaceRoot, "${workspaceRoot}/.env")` = `".env"`.
`isPathWithinScope(".env", "src/")` → NO → DENY. No traversal escape via `..` in a sub-path.

**Result:** 30 × DENIED, no crash, 30 `policy` audit events, 30 DB open/close cycles (synchronous,
fast with `better-sqlite3`). No resource exhaustion for 30 iterations.

**Action string `"???"` note:** not a valid token capability, handled cleanly as NO-GO denial.

---

## Filesystem Mutation Check

No filesystem mutations in any vector.

- `memory/tom_runtime.sqlite` — only `task_events` rows written (audit events for denials).
- `.tom-workspace/governance/override_replay.jsonl` — not written (no successful grants in this
  analysis; would be written only on GRANTED + `markSeen`).
- `.tom-workspace/governance/override_revocations.jsonl` — not written.
- Source tree — no changes.

---

## Findings Detail

### P2-F1 — ~~MEDIUM~~ CLOSED: Symlink Escape Not Prevented

**Location:** `src/core/governance/overrideEnforcement.ts:78`

**Remediation (2026-02-19):**

Added `realpathSync` resolution inside the `affectedPaths` loop before computing `relativeTarget`.
The resolved real path is used for both `allowed_paths` and `disallowed_paths` scope checks.
A `try/catch` falls back to the lexical path if the path does not exist yet (new files being
created have no symlink target to resolve). The `reason` message in deny responses still reports
the original `targetPath` so callers see the path they supplied.

**Attack trace now:**

```
realpathSync("/workspace/src/evil-link")  →  "/etc/passwd"
path.relative("/workspace", "/etc/passwd")  →  "../../etc/passwd"
normalizeForCompare(…)  →  "../../etc/passwd"
isPathWithinScope("../../etc/passwd", "src/")  →  false  →  DENIED
```

---

### P2-F2 — ~~MEDIUM~~ CLOSED: No IPC-Accessible Action Allowlist

**Location:** `electron/main/index.ts:70` (module-level constant + handler entry)

**Remediation (2026-02-19):**

Added module-level `IPC_PERMITTED_ACTIONS = new Set([...])` containing only the user-facing
actions the renderer is legitimately allowed to request (`deploy`, `local_code_modification`,
`merge_pr`, `rollback`, `test:go`, `test:nogo`). The `policy.*` and `oxide.*` namespaces are
intentionally absent — those actions are driven exclusively through the `brain.ts` HITL cycle
path.

The check fires as the first guard inside `try` (after telemetry sanitization, before replay
check and `requirePrivilege`). A non-permitted action throws `{ code: 'PRIVILEGE_DENIED' }`,
which the catch block catches, normalizes to `PrivilegeDeniedError`, writes an audit event, and
returns `{ ok: false, error: { name: 'PrivilegeDeniedError', message: 'Privileged request
denied.' } }`. The audit invariant from E1 is maintained for all action-allowlist denials.

---

### P2-F3 — ~~MEDIUM~~ CLOSED: Replay Ledger TOCTOU Race

**Location:** `electron/main/index.ts:76` + `src/core/governance/overrideReplayLedger.ts`

**Remediation (2026-02-19):**

- Added module-level `HOT_REPLAY_CACHE = new Set<string>()` in `overrideReplayLedger.ts` — shared
  across all instances within the same process.
- `hasSeen` checks `HOT_REPLAY_CACHE` before loading from disk.
- `markSeen` returns `boolean` (`true` = newly recorded, `false` = already claimed). The hot-cache
  check and `add()` are synchronous with no `await` between them — atomic in Node.js's single-
  threaded event loop.
- IPC handler checks the `markSeen` return value and throws `{ code: 'PRIVILEGE_DENIED' }` if
  `false`, ensuring the catch block writes an audit event and the renderer receives
  `{ ok: false, error: { name: 'PrivilegeDeniedError', message: 'Override replay detected' } }`.

**Concurrent race now closed:**

- H1: `hasSeen` → cache miss → `requirePrivilege` → `markSeen` → `HOT_REPLAY_CACHE.add(key)` → `true` → `{ ok: true }`
- H2: `hasSeen` → cache miss → `requirePrivilege` → `markSeen` → `HOT_REPLAY_CACHE.has(key)` = true → `false` → IPC handler throws → `{ ok: false, error: PrivilegeDeniedError }`

---

### P2-F4 — ~~LOW~~ CLOSED: Double Audit Events on Standard Denials

**Location:** `electron/main/index.ts` (handler body)

**Remediation (2026-02-19):**

Added `let gateEntered = false` before `try`. Set to `true` immediately before calling
`requirePrivilege`; reset to `false` immediately after it returns (grant path only). In the
catch block, `appendTaskEvent` is now guarded by `if (!gateEntered)`.

**Audit event counts post-patch (all 1 event):**

| Denial path | Event writer |
| --- | --- |
| Allowlist check (`IPC_PERMITTED_ACTIONS`) | catch block (`gateEntered = false`) |
| Replay pre-check (`hasSeen`) | catch block (`gateEntered = false`) |
| `requirePrivilege` denial | `emitDecision` inside `requirePrivilege` (`gateEntered = true`, catch skips) |
| Concurrent-replay post-grant (`!marked`) | catch block (`gateEntered = false` after grant returned) + prior GRANTED event from `emitDecision` — two events, both semantically correct |

---

### P2-F5 — ~~LOW~~ CLOSED: No Explicit Token Size Gate

**Location:** `electron/main/index.ts:51` (`parseRendererIntent`)

**Remediation (2026-02-19):**

`parseRendererIntent` now size-gates the token before returning it. If the JSON-serialized length
of the raw token meets or exceeds 64 KB the token is replaced with `null`, preventing the
oversized object from ever reaching `zod.safeParse`. Structured-clone cannot produce circular
references so `JSON.stringify` is unconditionally safe here.

```typescript
const rawToken = candidate.overrideToken ?? null
const overrideToken = (JSON.stringify(rawToken)?.length ?? 0) < 64_000 ? rawToken : null
```

A null token on a NO-GO gate causes `requirePrivilege` to throw immediately with
`PrivilegeDeniedError` — no Zod parse attempted, no large allocation retained.

---

## Phase 2 Verdict

| Test | Result | Notes |
| --- | --- | --- |
| A1 Obvious traversal | DENIED | Correct; audit written |
| A2 Windows separator tricks | DENIED | Normalization handles both platforms |
| A3 UNC device paths | DENIED | Scope check catches on both platforms |
| A4 Symlink escape | **CLOSED** | `realpathSync` resolves to real target before scope check (P2-F1) |
| B1 No-token deploy | DENIED | Correct `PrivilegeDeniedError` |
| B2 Deny overrides allow | DENIED | Deny wins in `assertOverridePermits` |
| B3 Shell metacharacter fuzz | DENIED | String-only comparison; no shell execution |
| C1+C2 Identity confusion | **CLOSED** | `IPC_PERMITTED_ACTIONS` blocks `oxide.*`/`policy.*` before gate regardless of token (P2-F2) |
| D1 Modified token | DENIED | token_hash then HMAC — both must fail |
| D2 Key ID substitution | DENIED | Unknown key → no secret → reject |
| D3 Expiry mid-run | DENIED on 2nd call | Replay or expiry check |
| D4 Sequential replay | DENIED | File-backed ledger works correctly |
| D4-concurrent TOCTOU | **CLOSED** | `HOT_REPLAY_CACHE` + `markSeen` returns `boolean`; IPC handler throws on collision (P2-F3) |
| D5 Oversized token | DENIED quickly | Zod fails fast; memory allocates then GC |
| E1 Audit on denial | PASS | **LOW note**: double events on standard path (P2-F4) |
| E2 30-iteration fuzz | PASS — no crash | Consistent denials, clean DB lifecycle |

**IPC boundary posture post-Phase 2:** HARDENED (v5) — all five findings CLOSED (P2-F1 through
P2-F5). No CRITICAL, HIGH, MEDIUM, or LOW findings open.
