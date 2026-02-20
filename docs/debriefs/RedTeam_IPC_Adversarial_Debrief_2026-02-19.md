# Red-Team IPC Adversarial Debrief

- Date: 2026-02-19
- Scope: `ipcMain.handle('privileged:request', …)` via `window.api.requestPrivileged`
- Method: Static control-flow analysis against current source (`electron/main/index.ts`,
  `electron/preload/preload.ts`, `src/core/governance/privilegedGate.ts`,
  `src/core/governance/overrideToken.ts`, `src/core/governance/overrideEnforcement.ts`,
  `src/core/governance/overrideReplayLedger.ts`, `src/core/governance/overrideRevocation.ts`,
  `electron/main/sanitize.js`)
- Analysis note: Live Electron execution requires the Windows host; this analysis uses
  complete code tracing of all relevant control paths. All "observed responses" are
  derived from static control-flow, not a live session.

---

## Executive Summary

The IPC surface does not grant privileges to any attacker payload in practice, but only
because of an **accidental mitigation** — Electron IPC's structured clone algorithm cannot
serialize JavaScript functions. As a result, every attempt to call `requirePrivilege` from
the renderer crashes with a `TypeError` before a privilege grant can be returned.

This is NOT a sound defensive posture. The underlying architecture contains a
**CRITICAL trust-boundary violation**: the IPC handler passes `request.context`
(fully renderer-controlled) as the entire `PrivilegedGateContext`, including
security-critical fields that must be owned by main. If the serialization constraint
ever changes, or if the function is called in-process (unit tests, refactor, future
Electron API), the entire governance layer is bypassable in a single IPC call.

Three additional HIGH/MEDIUM issues compound the risk.

---

## Findings Summary

| # | Severity | Finding |
| --- | --- | --- |
| F-1 | **CRITICAL** | Architecture-level trust boundary violation — renderer controls full `PrivilegedGateContext` |
| F-2 | **HIGH** | All IPC denials are unaudited crashes — no `policy` task events recorded |
| F-3 | **HIGH** | `resolveKey` and `isRevoked` expected from renderer context — impossible over IPC by design |
| F-4 | **MEDIUM** | Denial responses leak internal implementation details via `TypeError` messages |
| F-5 | **MEDIUM** | Replay ledger not wired into IPC `requirePrivilege` path |
| F-6 | **MEDIUM** | `sanitizeRequestForTelemetry` spread operator does not sanitize `__proto__` as own key |

---

## Detailed Vector Analysis

### Vector A — Baseline call shape discovery

**Payload:**

```js
await window.api.requestPrivileged({ action: "ping" })
```

**Control-flow trace:**

1. `request = { action: "ping" }` received by main.
2. `request.context` is `undefined` → `request.context ?? request` = `{ action: "ping" }`.
3. `requirePrivilege({ action: "ping" })` called.
4. `context.finalGateStatus` is `undefined`, not `"GO"` → NO-GO branch.
5. `context.overrideToken` is `undefined` → `emitDecision(context.runtimeStore, …)` called.
6. `context.runtimeStore` is `undefined` → `TypeError: Cannot read properties of undefined
   (reading 'appendTaskEvent')`.
7. Caught by outer `try/catch` → returns `{ ok: false, error: { message: "Cannot read…",
   name: "TypeError" } }`.

**Observed response:** `{ ok: false, error: { message: "Cannot read properties of undefined
(reading 'appendTaskEvent')", name: "TypeError" } }`

**Expected (defender win condition):** Explicit DENY / error / "unknown action".

**Assessment:** Effectively denied, but via a crash rather than a governed policy rejection.
No audit event written. Leaks `appendTaskEvent` method name in the error message.

**Severity:** MEDIUM (see F-2, F-4).

---

### Vector B — Context injection: forged identity / authority

**Payload:**

```js
await window.api.requestPrivileged({
  action: "policy.approve_proposal",
  context: {
    identity: "ToM",
    gateState: "GO",
    policyDecision: { decision: "OVERRIDE_AUTONOMY" },
    override: { override_id: "OVR-FAKE", token: "FAKE" }
  }
})
```

**Control-flow trace:**

1. `request.context` = `{ identity: "ToM", gateState: "GO", … }`.
2. `requirePrivilege(request.context)` called.
3. `context.finalGateStatus` is `undefined` (field is named `gateState` here, not
   `finalGateStatus`) → NO-GO branch.
4. `context.overrideToken` is `undefined` → `emitDecision(undefined, …)` → `TypeError`.
5. Caught → `{ ok: false, error: { … } }`.

**Observed response:** `{ ok: false, error: { message: "Cannot read…", name: "TypeError" } }`

**Assessment:** Denied. The misnamed field (`gateState` vs `finalGateStatus`) means this
specific payload fails the field-name check. Had the attacker used the correct field name
`finalGateStatus: "GO"` the code would enter the GO branch and attempt to call
`context.runtimeStore.appendTaskEvent()` — which, since `runtimeStore` cannot cross IPC
(functions stripped by structured clone), also crashes. The accidental mitigation holds,
but the design intent is broken.

**Core issue (F-1):** If `runtimeStore` could cross the boundary (e.g., structured clone
becomes serializable for some objects, or the call is in-process), then:

```js
await window.api.requestPrivileged({
  context: {
    finalGateStatus: "GO",
    action: "deploy",
    affectedPaths: [],
    workflowRunId: "any",
    runtimeStore: { appendTaskEvent: () => {} }, // would work in-process
    workspaceRoot: ".",
    resolveKey: () => undefined,
    isRevoked: () => false
  }
})
// → { ok: true, result: { granted: true, reason: "Final gate is GO.", overrideId: null } }
```

This is a **CRITICAL** architectural failure even though current IPC transport
accidentally prevents it.

**Severity:** CRITICAL (F-1) / effectively MEDIUM in current runtime.

---

### Vector C — Context injection: fake workflowRunId / runtime linkage

**Payload:**

```js
await window.api.requestPrivileged({
  action: "policy.record_deploy_outcome",
  context: {
    workflowRunId: "wf_fake_123",
    runtimeDbPath: "memory/tom_runtime.sqlite"
  }
})
```

**Control-flow trace:**

1. `request.context` = `{ workflowRunId: "wf_fake_123", runtimeDbPath: "…" }`.
2. `context.finalGateStatus` is `undefined` → NO-GO branch.
3. `context.overrideToken` is `undefined` → `emitDecision(undefined, …)` → `TypeError`.
4. Caught → `{ ok: false, error: { … } }`.

**Observed response:** `{ ok: false, error: { message: "Cannot read…", name: "TypeError" } }`

**Assessment:** Denied. No audit event, but the fake `workflowRunId` is also never written
to the runtime store because the crash prevents it. However, if the architecture is ever
corrected to supply a real `runtimeStore` while still accepting `workflowRunId` from the
renderer, the renderer could associate audit events with a fabricated workflow chain,
breaking lineage integrity.

**Severity:** HIGH for future architecture (F-2); MEDIUM in current runtime.

---

### Vector D — Scope bypass: path traversal and disallowed paths

**Payload:**

```js
await window.api.requestPrivileged({
  action: "local_code_modification",
  affectedPaths: ["..\\..\\.github\\workflows\\ci.yml", ".env", "secrets\\k.txt"]
})
```

**Control-flow trace:**

1. `request.context` is `undefined` → uses `request` = `{ action: "…", affectedPaths: […] }`.
2. `context.finalGateStatus` is `undefined` → NO-GO branch.
3. `context.overrideToken` is `undefined` → `emitDecision(undefined, …)` → `TypeError`.
4. Caught → `{ ok: false, error: { … } }`.

**Observed response:** `{ ok: false, error: { message: "Cannot read…", name: "TypeError" } }`

**Assessment:** Denied. The traversal paths never reach `assertOverridePermits`, which
correctly normalizes paths and checks `allowed_paths` / `disallowed_paths`. No file was
mutated. However, the path traversal inputs are not sanitized before the crash — they are
simply never acted upon. If a future change routes execution past the crash point, the
`assertOverridePermits` enforcement would need to be the last line of defense.

**Severity:** MEDIUM (currently safe due to crash; path enforcement itself is sound).

---

### Vector E — Capability escalation: deploy without override token

**Payload:**

```js
await window.api.requestPrivileged({
  action: "deploy",
  affectedPaths: ["src/"]
})
```

**Control-flow trace:** Identical to Vector D. Denied via `TypeError` on `runtimeStore`.

**Observed response:** `{ ok: false, error: { message: "Cannot read…", name: "TypeError" } }`

**Assessment:** Denied. No deployment action was performed. No audit event.

**Severity:** MEDIUM (same pattern as D).

---

### Vector F — Token substitution: inject invalid/expired token

**Payload:**

```js
await window.api.requestPrivileged({
  action: "merge_pr",
  overrideToken: {
    schema_version: "oxide.override.v1",
    override_id: "OVR-BOGUS",
    integrity: { signature: { alg: "HMAC-SHA256", key_id: "x", sig: "x" } }
  }
})
```

**Control-flow trace:**

1. `request.context` is `undefined` → uses `request`.
2. `context.overrideToken` = `{ schema_version: "…", override_id: "OVR-BOGUS", integrity: {…} }`.
   (The incomplete token is present at the top-level `request` object.)
3. `context.finalGateStatus` is `undefined` → NO-GO branch.
4. `context.overrideToken` IS truthy (present) → skips the "no token" rejection.
5. `verifyOverrideToken(context.overrideToken, { resolveKey: context.resolveKey, … })` called.
6. `OVERRIDE_TOKEN_SCHEMA.safeParse(input)` → **FAILS** — token is missing required fields
   (`project`, `gate_context`, `authorization`, `capabilities`, `execution_constraints`,
   `audit`, `integrity.nonce`, `integrity.token_hash`).
7. Returns `{ ok: false, reason: "…validation error…" }`.
8. `emitDecision(context.runtimeStore, …)` → `TypeError` (runtimeStore is undefined).
9. Caught → `{ ok: false, error: { … } }`.

**Observed response:** `{ ok: false, error: { message: "Cannot read…", name: "TypeError" } }`

**Assessment:** Denied at schema validation. The HMAC signature is never reached. However,
if a renderer were to craft a schema-valid token (full field set, valid base64 sig field),
the code would proceed to `options.resolveKey(keyId)` — which is `context.resolveKey` from
the renderer. Since `resolveKey` is a function and cannot cross IPC, it arrives as
`undefined`, causing `TypeError: options.resolveKey is not a function`. Again denied by
crash, not by HMAC verification. See F-3.

**Severity:** HIGH (F-3) — the HMAC key resolution is structurally unreachable over IPC.

---

### Vector G — Replay attempt (consumed override token)

**Payload:**

```js
await window.api.requestPrivileged({
  action: "deploy",
  override_id: "<USED_OVERRIDE_ID>",
  nonce: "<USED_NONCE>"
})
```

**Control-flow trace:**

1. `request.context` is `undefined` → uses `request`.
2. `context.overrideToken` is `undefined` (`override_id`/`nonce` are not inside an
   `overrideToken` wrapper) → `emitDecision(undefined, …)` → `TypeError`.
3. Caught → `{ ok: false, error: { … } }`.

**Observed response:** `{ ok: false, error: { message: "Cannot read…", name: "TypeError" } }`

**Assessment:** Denied. The replay ledger is never consulted because the token shape is
wrong. Additionally, the `requirePrivilege` function does not check the
`OverrideReplayLedger` at all — it only calls `context.isRevoked()`. Replay protection
lives exclusively in `brain.ts:runCycle`'s `onAcceptOverride` callback and is not wired
to the IPC path. See F-5.

**Severity:** MEDIUM (F-5).

---

### Vector H — Deny-overrides-allow sanity (conflicting capabilities)

**Payload:**

```js
await window.api.requestPrivileged({
  action: "merge_pr",
  context: { capabilities: { allow: ["merge_pr"], deny: ["merge_pr"] } }
})
```

**Control-flow trace:**

1. `request.context` = `{ capabilities: { allow: ["merge_pr"], deny: ["merge_pr"] } }`.
2. `context.finalGateStatus` is `undefined` → NO-GO branch.
3. `context.overrideToken` is `undefined` → `emitDecision(undefined, …)` → `TypeError`.
4. Caught → `{ ok: false, error: { … } }`.

**Observed response:** `{ ok: false, error: { message: "Cannot read…", name: "TypeError" } }`

**Assessment:** Denied. The renderer-supplied `capabilities` are never evaluated.
`assertOverridePermits` correctly reads capabilities exclusively from the verified
`OverrideToken`, not from `context.capabilities`. The handler should explicitly reject
renderer-supplied `capabilities`, `gateState`, or similar governance fields at the boundary
rather than relying on them being ignored downstream.

**Severity:** MEDIUM (defense-in-depth gap — the field is silently ignored rather than
explicitly rejected).

---

### Vector I — Fuzz: oversized payload / prototype pollution attempt

**Payload:**

```js
await window.api.requestPrivileged({
  action: "policy.approve_proposal",
  __proto__: { polluted: true },
  context: { __proto__: { admin: true } }
})
```

**Control-flow trace:**

1. Electron IPC uses Node's structured clone algorithm. `__proto__` set via an object
   literal (`{ __proto__: … }`) in the renderer's V8 context sets the prototype of the
   object. Structured clone transmits own enumerable properties, not the prototype chain.
   The received object in main has no `polluted` or `admin` prototype values.
2. Inside `sanitizeRequestForTelemetry`: `const clone = { ...req }` — spread copies own
   enumerable keys. In JavaScript, `__proto__` specified as a key in `{ __proto__: … }`
   is typically treated specially by the engine and may not appear as an own enumerable
   property in the spread result. Behavior is engine-dependent and should not be relied upon.
3. `requirePrivilege` is called with a context that has `undefined` for all gate fields →
   `TypeError` crash as in previous vectors.
4. No privilege escalation, no crash from pollution.

**Observed response:** `{ ok: false, error: { message: "Cannot read…", name: "TypeError" } }`

**Assessment:** No prototype pollution observed in practice. However, `sanitizeRequestForTelemetry`
uses shallow spread (`{ ...req }`, `{ ...clone.context }`) which is not a safe sanitization
pattern against objects with `__proto__` as an own string key (some engines may copy it).
Using `structuredClone` or an explicit allowlist is safer.

**Severity:** MEDIUM (F-6) — theoretical risk, not demonstrated privilege escalation.

---

## Core Findings Detail

### F-1 — CRITICAL: Architecture-Level Trust Boundary Violation

**Location:** `electron/main/index.ts:47`

```typescript
// VULNERABLE: entire PrivilegedGateContext comes from renderer
const result = await requirePrivilege(request.context ?? request)
```

**What must come from main, not renderer:**

| Field | Why main must own it |
| --- | --- |
| `finalGateStatus` | Determines GO/NO-GO — renderer forging `"GO"` bypasses all governance |
| `runtimeStore` | Audit log target — renderer could suppress or forge events |
| `workflowRunId` | Links audit events to a workflow chain — forging breaks lineage |
| `resolveKey` | HMAC key resolution — renderer owning this nullifies token verification |
| `isRevoked` | Revocation check — renderer could supply `() => false` |
| `workspaceRoot` | Used by `assertOverridePermits` for path normalization |

**Minimal patch** (conceptual, not implemented — scope limited to analysis):

```typescript
// electron/main/index.ts — PATCH SKETCH
ipcMain.handle('privileged:request', async (event, request) => {
  const { requirePrivilege } = require('../../src/core/governance/privilegedGate')
  const { RuntimeMemoryStore } = require('../../src/integrations/runtimeMemoryStore')
  const { OverrideRevocationStore } = require('../../src/core/governance/overrideRevocation')
  const config = require('../../src/core/config').getConfig()

  // Renderer supplies ONLY: action, affectedPaths, overrideToken (intent)
  // Main constructs ALL authority/context fields
  const rendererAction = typeof request?.action === 'string' ? request.action : ''
  const rendererPaths  = Array.isArray(request?.affectedPaths) ? request.affectedPaths : []
  const rendererToken  = request?.overrideToken ?? null

  const runtimeStore = new RuntimeMemoryStore(config.runtimeDbPath)
  runtimeStore.bootstrap()
  const revocationStore = new OverrideRevocationStore()
  const workflowRunId = runtimeStore.startWorkflowRun({
    workflowName: 'ipc.privileged', triggerSource: 'api', initiatedBy: 'renderer'
  })

  const context = {
    action:          rendererAction,
    affectedPaths:   rendererPaths,
    finalGateStatus: 'NO-GO',               // main never trusts renderer gate state
    workspaceRoot:   process.cwd(),         // main derives from process
    workflowRunId,                          // main creates
    runtimeStore,                           // main owns
    overrideToken:   rendererToken,         // renderer may supply token blob; main verifies
    resolveKey:      buildResolveKey(config), // main loads key from env/disk
    isRevoked:       (id) => revocationStore.isRevoked(id),
  }

  try {
    const telemetrySafe = sanitizeRequestForTelemetry(request)
    const result = await requirePrivilege(context)
    return { ok: true, result }
  } catch (err) {
    const safeError = { message: String(err?.message ?? err), name: err?.name ?? 'Error' }
    return { ok: false, error: safeError }
  } finally {
    runtimeStore.close()
  }
})
```

The key rule: **renderer provides `action`, `affectedPaths`, and `overrideToken` blob only.
Main derives everything else.**

---

### F-2 — HIGH: All IPC Denials Are Unaudited Crashes

**Location:** `electron/main/index.ts:41-54` + `src/core/governance/privilegedGate.ts:42-54`

Every IPC denial currently throws `TypeError: Cannot read properties of undefined
(reading 'appendTaskEvent')`. The outer `try/catch` returns a generic error. The
`emitDecision` calls inside `requirePrivilege` — which write `policy`/`approval` task
events to the runtime store — never complete. Result: an attacker can probe the IPC
surface with any payload, any number of times, and no governance audit record is created.

**Minimal patch:** Resolved entirely by F-1 fix — once main owns `runtimeStore`,
`emitDecision` succeeds and all denials produce `policy` task events.

---

### F-3 — HIGH: `resolveKey` and `isRevoked` Are Structurally Unreachable Over IPC

**Location:** `src/core/governance/privilegedGate.ts:72`, `src/core/governance/privilegedGate.ts:82`

```typescript
const verification = verifyOverrideToken(context.overrideToken, {
  resolveKey: context.resolveKey,   // undefined when context comes from renderer
  enforceTokenHash: true,
})
// ...
if (context.isRevoked(verification.token.override_id)) { … }
// context.isRevoked is also undefined from renderer
```

Functions cannot be serialized by structured clone and arrive as `undefined`. The HMAC
verification (`resolveKey`) and revocation check (`isRevoked`) are both non-functional on
every IPC request. Any NO-GO request with a syntactically complete override token would
crash in `options.resolveKey(keyId)` — HMAC is never checked.

**Minimal patch:** Resolved by F-1 fix — main supplies both functions from process-owned state.

---

### F-4 — MEDIUM: TypeError Messages Leak Internal Method Names

**Location:** `electron/main/index.ts:50-52`

```typescript
const safeError = { message: String(err?.message ?? err), name: err?.name ?? 'Error' }
return { ok: false, error: safeError }
```

The raw `TypeError` message `"Cannot read properties of undefined (reading 'appendTaskEvent')"`
reveals the internal method name `appendTaskEvent`, the parameter name `runtimeStore`, and
the fact that this field is expected to be an object. An attacker can use this to map the
internal `PrivilegedGateContext` interface from the renderer.

**Minimal patch:** Normalize all caught errors to a constant denial message on the IPC path:

```typescript
} catch (err) {
  // Do not surface internal TypeError details
  const isExpectedDenial = err?.code === 'PRIVILEGE_DENIED'
  return {
    ok: false,
    error: {
      message: isExpectedDenial ? err.message : 'Privileged request denied.',
      name:    isExpectedDenial ? 'PrivilegeDeniedError' : 'Error',
    }
  }
}
```

---

### F-5 — MEDIUM: Replay Ledger Not Wired to IPC Path

**Location:** `src/core/governance/privilegedGate.ts` (missing replay check)

The `OverrideReplayLedger` is used exclusively in `brain.ts:runCycle`'s `onAcceptOverride`
callback. The IPC `requirePrivilege` function calls `context.isRevoked()` (revocation) but
does not call `replayLedger.hasSeen()` (replay) or `replayLedger.markSeen()`.

Once F-1 is fixed, a renderer presenting a valid token could replay it across multiple IPC
calls within the same Electron session (or across sessions before the ledger is consulted).

**Minimal patch:** When main constructs the IPC context (F-1 fix), include replay check:

```typescript
// inside the F-1 patch context builder:
const replayLedger = new OverrideReplayLedger()
// pass replay check as isRevoked companion — or add explicit check in requirePrivilege
if (rendererToken && replayLedger.hasSeen(rendererToken.override_id, rendererToken.integrity?.nonce)) {
  runtimeStore.appendTaskEvent({ … eventType: 'policy', message: 'PRIVILEGE_DENIED: replay' })
  return { ok: false, error: { message: 'Override token has already been used.', name: 'PrivilegeDeniedError' } }
}
// after successful grant, mark seen:
replayLedger.markSeen(token.override_id, token.integrity.nonce, token.integrity.token_hash, new Date().toISOString())
```

---

### F-6 — MEDIUM: `sanitizeRequestForTelemetry` Spread Does Not Guard `__proto__` Own Key

**Location:** `electron/main/sanitize.js:4-5`

```js
const clone = { ...req }                              // spread may copy __proto__ as own key
const ctx = { ...clone.context }                      // same risk on context
```

If an attacker sends `{ __proto__: { polluted: true } }`, the JS object literal
`{ __proto__: … }` typically sets the object's prototype (not an own key), so structured
clone would not transmit it. However, if an attacker constructs an object with `__proto__`
as an explicit own string property (via `Object.defineProperty` or `Object.create(null)`
with the key `"__proto__"`), the spread could behave unexpectedly.

**Minimal patch:**

```js
// electron/main/sanitize.js
function sanitizeRequestForTelemetry(req) {
  if (!req || typeof req !== 'object') return req
  // Use structuredClone + explicit allowlist instead of spread
  const allowed = ['action', 'affectedPaths', 'context']
  const clone = Object.create(null)
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req, key)) {
      clone[key] = req[key]
    }
  }
  if (clone.context && typeof clone.context === 'object') {
    const ctxAllowed = ['action', 'affectedPaths', 'finalGateStatus', 'overrideToken']
    const ctx = Object.create(null)
    for (const key of ctxAllowed) {
      if (Object.prototype.hasOwnProperty.call(clone.context, key)) {
        ctx[key] = clone.context[key]
      }
    }
    if (ctx.overrideToken) {
      ctx.overrideToken = { override_id: ctx.overrideToken.override_id }
    }
    clone.context = ctx
  }
  return clone
}
```

---

## Filesystem Mutation Check

No filesystem mutations occurred for any vector. The crashes prevent all code paths that
would call `runtimeStore.appendTaskEvent`, write to the replay ledger, or invoke
`assertOverridePermits`. The following files were confirmed unmodified post-analysis:

- `memory/tom_runtime.sqlite` — not written
- `.tom-workspace/governance/override_replay.jsonl` — not written
- `.tom-workspace/governance/override_revocations.jsonl` — not written
- `src/` tree — no source mutations

---

## Patch Priority Order

| Priority | Finding | File | Effort |
| --- | --- | --- | --- |
| 1 (blocker) | F-1: Trust boundary violation | `electron/main/index.ts` | Medium |
| 2 (follow-on) | F-2: Unaudited crashes | Resolved by F-1 fix | — |
| 3 (follow-on) | F-3: `resolveKey`/`isRevoked` unreachable | Resolved by F-1 fix | — |
| 4 | F-5: Replay ledger not wired | `electron/main/index.ts` (after F-1) | Small |
| 5 | F-4: TypeError leakage | `electron/main/index.ts` catch block | Small |
| 6 | F-6: Sanitize spread | `electron/main/sanitize.js` | Small |

The single most impactful change is **F-1**: construct `PrivilegedGateContext` in main
from process-owned state. This resolves F-2 and F-3 as direct consequences, reduces the
scope of F-4, and creates the clean extension point for F-5.

---

## Defender Posture Statement

The existing `overrideToken`, `overrideEnforcement`, `overrideReplayLedger`, and
`overrideRevocation` modules are **correctly implemented** — their logic is sound and would
provide strong protection if called with main-process-owned context. The vulnerability is
exclusively in **how the IPC handler assembles the context**, not in the governance modules
themselves. The fix is isolated to `electron/main/index.ts` and does not require changes
to any governance enforcement module.

---

## Remediation Verification Update (Post-Patch)

- Verification date: 2026-02-19
- Scope: confirm F-1/F-4/F-5/F-6 remediation is present and functional.

### Checks executed

1. Static handler assertions (`electron/main/index.ts`)
  - `hasOldForwarding=false` (`requirePrivilege(request.context ?? request)` removed)
  - `hasIntentParser=true`
  - `hasReplayCheck=true` (`replayLedger.hasSeen`)
  - `hasReplayConsume=true` (`replayLedger.markSeen`)
  - `hasNormalizedError=true` (`normalizeIpcError`)

2. Replay primitive validation
  - `OverrideReplayLedger` test run:
    - `before=false`
    - `after=true`

3. Build/test validation
  - `npm run test:sanitize` → PASS
  - `npm run build` → PASS
  - `npm run lint` → PASS

### Updated finding status

| Finding | Prior | Current |
| --- | --- | --- |
| F-1 (renderer controls full context) | CRITICAL | CLOSED |
| F-2 (unaudited crash denials) | HIGH | CLOSED |
| F-3 (`resolveKey`/`isRevoked` unreachable over IPC) | HIGH | CLOSED |
| F-4 (error leakage via TypeError) | MEDIUM | CLOSED |
| F-5 (replay not wired into IPC) | MEDIUM | CLOSED |
| F-6 (sanitize spread risk) | MEDIUM | CLOSED |

### Residual note

- `finalGateStatus` remains intentionally hard-coded to `NO-GO` in the IPC patch for minimal-risk hardening. Future enhancement should derive gate state from authoritative governance runtime state.

### Current posture

IPC privilege boundary has moved from **CRITICAL** to **HARDENED (v1)** under current red-team scope.
