# Red Team IPC Live Runbook (Execution Guide)

- Date: 2026-02-19
- Scope: live renderer→main adversarial validation after IPC remediation
- Target channel: `privileged:request`

## Runtime Preconditions (Verified)

- ToM backend started with test env vars.
- API port reachable (`401` on `/health` is expected with auth enabled).
- Electron process running in development mode.

Observed setup evidence:
- `GET http://127.0.0.1:8787/health` -> `401`
- Electron processes detected via `Get-Process electron`

## Baseline Audit Metric

Run this before payloads:

```powershell
node -e 'const Database=require("better-sqlite3"); const db=new Database("memory/tom_runtime.sqlite"); const row=db.prepare("SELECT COUNT(1) AS c FROM task_events WHERE message=''PRIVILEGE_DENIED''").get(); console.log("privilegeDeniedCount=" + row.c); db.close();'
```

Current baseline observed:
- `privilegeDeniedCount=0`

## DevTools Payload Harness

In Electron renderer DevTools console:

```javascript
const send = (payload) => window.api.requestPrivileged(payload).then(r => console.log(JSON.stringify(r, null, 2))).catch(console.error)
```

## Payload Set (Second-Pass Live)

### 1) Path traversal probe

```javascript
send({
  action: "local_code_modification",
  affectedPaths: ["..\\..\\.github\\workflows\\ci.yml", ".env", "secrets\\k.txt"]
})
```

Expected:
- `ok: false`
- Error message is denial (no TypeError internals)

### 2) Identity confusion probe (forged context fields)

```javascript
send({
  action: "policy.approve_proposal",
  context: {
    finalGateStatus: "GO",
    workflowRunId: "wf_fake",
    workspaceRoot: "C:/",
    resolveKey: "fake",
    isRevoked: "fake"
  }
})
```

Expected:
- `ok: false`
- Forged `context` ignored for authority construction

### 3) Token tampering probe (schema/signature invalid)

```javascript
send({
  action: "merge_pr",
  overrideToken: {
    schema_version: "oxide.override.v1",
    override_id: "OVR-BOGUS",
    integrity: { signature: { alg: "HMAC-SHA256", key_id: "x", sig: "x" } }
  }
})
```

Expected:
- `ok: false`
- `PrivilegeDeniedError` or generic denial (no stack leakage)

### 4) Replay probe (same override_id + nonce reused)

Prereq: one successful request with a valid override token.
Then resend the same token.

```javascript
send({
  action: "deploy",
  affectedPaths: ["src/"],
  overrideToken: window.__validOverrideToken // same exact token reused
})
```

Expected:
- second call denied for replay
- no privilege grant on replay

### 5) Error oracle probe (unexpected object shape)

```javascript
send({ action: null, affectedPaths: "not-array", overrideToken: 12345 })
```

Expected:
- `ok: false`
- message normalized to denial, not internal exception detail

## Audit Verification Query

After running payloads, check audit events increased and reasons recorded:

```powershell
node -e 'const Database=require("better-sqlite3"); const db=new Database("memory/tom_runtime.sqlite"); const rows=db.prepare("SELECT message, payload_json, created_at FROM task_events WHERE message=''PRIVILEGE_DENIED'' ORDER BY created_at DESC LIMIT 20").all(); console.log(JSON.stringify(rows, null, 2)); db.close();'
```

Pass condition:
- one or more `PRIVILEGE_DENIED` events corresponding to payload attempts.

## Escalation Criteria

Escalate immediately if any occurs:
1. any payload returns `ok: true` without valid override and permitted scope/capability.
2. replay payload succeeds on reused `override_id + nonce`.
3. renderer response leaks TypeError/internal stack details.
4. denials occur without `PRIVILEGE_DENIED` task events.

## Recording Template (fill during live run)

| Payload | Response (`ok/error`) | Audit Event Present | Verdict |
| --- | --- | --- | --- |
| Path traversal |  |  |  |
| Identity confusion |  |  |  |
| Token tampering |  |  |  |
| Replay |  |  |  |
| Error oracle |  |  |  |

## Next Artifact

After execution, append real outputs to:
- `docs/debriefs/RedTeam_IPC_Adversarial_Debrief_2026-02-19.md`
and create a transcript report under:
- `docs/reports/RedTeam_IPC_Live_Execution_Transcript_2026-02-19.md`
