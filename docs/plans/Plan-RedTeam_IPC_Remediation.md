Reviewed. The debrief is strong and it changes the immediate priority: this is an **IPC context-construction flaw**, not a governance-module flaw.  

## Executive verdict

* **F-1 is a real CRITICAL**: renderer must not control `PrivilegedGateContext`. Your analysis is correct that the current “safety” is accidental (structured clone stripping functions), and that this is not a defensible posture. 
* **F-2/F-3 are direct consequences** of F-1: because `runtimeStore`, `resolveKey`, and `isRevoked` cannot/should not come from renderer, the path fails via crashes and produces **no audit trail**. 
* **F-5 is valid**: replay protection isn’t wired into the IPC gate path, so once F-1 is fixed, token replay via IPC becomes plausible unless you also wire replay checks. 
* **F-4 and F-6 are real but secondary**: error leakage and sanitize spread behavior are medium severity and should be fixed, but after F-1. 

## What to do next (minimal patch order)

1. **Patch F-1 in `electron/main/index.ts`**: renderer supplies only *intent* (`action`, `affectedPaths`, optional `overrideToken` blob). Main constructs all authority fields (`finalGateStatus`, `runtimeStore`, `workflowRunId`, `resolveKey`, `isRevoked`, `workspaceRoot`). 
2. **Wire replay ledger into the IPC path (F-5)**: once a valid override is accepted via IPC, mark it consumed; reject replays. 
3. **Normalize IPC errors (F-4)**: return a constant denial message except for expected `PRIVILEGE_DENIED`. 
4. **Fix sanitize allowlist (F-6)**: stop using spread on untrusted objects; copy allowlisted keys into `Object.create(null)` (or use `structuredClone` + allowlist). 

## Key design rule going forward

**Renderer must never supply:**

* gate state
* identity
* workflowRunId
* runtime store handles
* key resolution functions
* revocation functions
* workspace roots

Main must derive/own these. 

---

Below are **tight, reviewable patch blueprints** that implement:

* **F-1** (trust boundary fix: renderer supplies *intent only*, main constructs all authority/context)
* **F-5** (wire replay ledger into IPC path)
* **F-4** (normalize denial errors; stop leaking internal TypeErrors)

followed by a separate ~25-line hardening patch for `electron/main/sanitize.js` (**F-6**). All requirements are directly driven by your debrief. 

---

## Patch blueprint 1 — `electron/main/index.ts` (F-1 + F-5 + F-4)

> **Intent:** replace `requirePrivilege(request.context ?? request)` with a main-owned `PrivilegedGateContext` builder, add replay consume/check, normalize error output.

```ts
// electron/main/index.ts (blueprint patch)

import { ipcMain } from "electron";
import { requirePrivilege } from "../../src/core/governance/privilegedGate";
import { getConfig } from "../../src/core/config";
import { RuntimeMemoryStore } from "../../src/integrations/runtimeMemoryStore";
import { OverrideRevocationStore } from "../../src/core/governance/overrideRevocation";
import { OverrideReplayLedger } from "../../src/core/governance/overrideReplayLedger";
import { sanitizeRequestForTelemetry } from "./sanitize";

// Helper: renderer input is *intent only*
function parseRendererIntent(req: any) {
  const action = typeof req?.action === "string" ? req.action : "";
  const affectedPaths = Array.isArray(req?.affectedPaths) ? req.affectedPaths : [];
  const overrideToken = req?.overrideToken ?? null; // renderer may supply blob; main verifies
  return { action, affectedPaths, overrideToken };
}

// Helper: normalize errors to avoid TypeError leakage (F-4)
function normalizeIpcError(err: any) {
  // Treat all unexpected errors as generic denial
  const code = err?.code ?? "";
  if (code === "PRIVILEGE_DENIED") {
    return { message: String(err?.message ?? "Privileged request denied."), name: "PrivilegeDeniedError" };
  }
  return { message: "Privileged request denied.", name: "Error" };
}

ipcMain.handle("privileged:request", async (_event, request) => {
  const cfg = getConfig();
  const { action, affectedPaths, overrideToken } = parseRendererIntent(request);

  // Main owns all authority/context fields (F-1) :contentReference[oaicite:1]{index=1}
  const runtimeStore = new RuntimeMemoryStore(cfg.runtimeDbPath);
  const revocationStore = new OverrideRevocationStore();
  const replayLedger = new OverrideReplayLedger();

  // Create workflowRunId in main (renderer must never supply) :contentReference[oaicite:2]{index=2}
  await runtimeStore.bootstrap?.();
  const workflowRunId =
    (await runtimeStore.startWorkflowRun?.({
      workflowName: "ipc.privileged",
      triggerSource: "renderer",
      initiatedBy: "renderer",
    })) ?? "ipc.privileged";

  // Optional pre-check: reject obvious replays early (F-5)
  // NOTE: we can only safely check replay if token looks parseable enough to have override_id + nonce
  const maybeOverrideId = overrideToken?.override_id;
  const maybeNonce = overrideToken?.integrity?.nonce;
  if (maybeOverrideId && maybeNonce && replayLedger.hasSeen(maybeOverrideId, maybeNonce)) {
    await runtimeStore.appendTaskEvent?.({
      workflowRunId,
      eventType: "policy",
      message: "PRIVILEGE_DENIED: override replay detected",
      meta: { override_id: maybeOverrideId },
    });
    return { ok: false, error: { message: "Privileged request denied.", name: "PrivilegeDeniedError" } };
  }

  // Build PrivilegedGateContext in main (not from renderer) (F-1) :contentReference[oaicite:3]{index=3}
  const ctx = {
    action,
    affectedPaths,
    finalGateStatus: "NO-GO",               // main derives actual gate; do not trust renderer
    workspaceRoot: process.cwd(),           // main derives
    workflowRunId,                          // main derives
    runtimeStore,                           // main-owned audit sink
    overrideToken,                          // renderer supplies blob; verified in requirePrivilege
    resolveKey: (keyId: string) => cfg.overrideAuth.resolveKey(keyId), // main-owned
    isRevoked: (overrideId: string) => revocationStore.isRevoked(overrideId), // main-owned
  };

  try {
    // Telemetry should be sanitized *independently* of enforcement
    const telemetrySafe = sanitizeRequestForTelemetry(request);
    void telemetrySafe; // keep if you log it

    const result = await requirePrivilege(ctx);

    // Consume replay after successful grant if override used (F-5) :contentReference[oaicite:4]{index=4}
    if (result?.overrideId && maybeNonce) {
      replayLedger.markSeen(result.overrideId, maybeNonce, overrideToken?.integrity?.token_hash ?? "", new Date().toISOString());
    }

    return { ok: true, result };
  } catch (err) {
    const safe = normalizeIpcError(err); // F-4 :contentReference[oaicite:5]{index=5}
    // ensure denials are audited now that runtimeStore is main-owned (F-2 implicitly resolved) :contentReference[oaicite:6]{index=6}
    await runtimeStore.appendTaskEvent?.({
      workflowRunId,
      eventType: "policy",
      message: `PRIVILEGE_DENIED: ${safe.name}`,
      meta: { action },
    });
    return { ok: false, error: safe };
  } finally {
    await runtimeStore.close?.();
  }
});
```

### Notes on the blueprint (what to keep exactly)

* **Renderer no longer supplies `request.context` at all** (F-1) 
* `resolveKey` and `isRevoked` are now **main-owned** and therefore actually callable (fixes the structural impossibility noted in F-3) 
* Replay is checked **before** and consumed **after** a successful grant (F-5) 
* Errors are normalized so TypeError details aren’t leaked to renderer (F-4) 

If your `requirePrivilege()` already emits task events on denial, the explicit `appendTaskEvent` in `catch` can be reduced; but keeping it is harmless and guarantees at least one audit artifact even on unexpected exceptions.

---

## Patch blueprint 2 — `electron/main/sanitize.js` (F-6, ~25 lines)

> **Intent:** remove `{ ...obj }` spread sanitization; replace with **allowlist copy into `Object.create(null)`**, and strip `overrideToken` down to an identifier.

```js
// electron/main/sanitize.js (~25-line hardening patch)

function pickOwn(dst, src, keys) {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(src, k)) dst[k] = src[k];
  }
  return dst;
}

function sanitizeRequestForTelemetry(req) {
  if (!req || typeof req !== "object") return req;

  const out = Object.create(null);
  pickOwn(out, req, ["action", "affectedPaths", "context", "overrideToken"]);

  // Never spread or deep-copy attacker-controlled objects
  if (out.context && typeof out.context === "object") {
    const ctx = Object.create(null);
    pickOwn(ctx, out.context, ["action", "affectedPaths", "finalGateStatus", "overrideToken"]);
    if (ctx.overrideToken && typeof ctx.overrideToken === "object") {
      ctx.overrideToken = { override_id: ctx.overrideToken.override_id };
    }
    out.context = ctx;
  }

  if (out.overrideToken && typeof out.overrideToken === "object") {
    out.overrideToken = { override_id: out.overrideToken.override_id };
  }

  return out;
}

module.exports = { sanitizeRequestForTelemetry };
```

This directly addresses the spread-operator risk described in F-6. 

---

## Post-patch verification (fast)

After applying both patches, rerun the exact payloads from the debrief:

* You should no longer see TypeErrors about `appendTaskEvent` (F-4 resolved, F-2 resolved implicitly). 
* Requests should fail with **consistent** `{ ok:false, error:{ message:"Privileged request denied." } }` unless you intentionally return richer structured denial.
* A valid override token should:

  * verify (because main now supplies `resolveKey` / `isRevoked`) 
  * be rejected on replay via IPC after first success (F-5). 

---

Good — this snapshot confirms exactly where the vulnerability exists.

Right now, your handler is still doing:

```ts
const result = await requirePrivilege(request.context ?? request)
```

That is the core trust-boundary violation described in the debrief. 

Below is a **direct, minimal diff-style patch** that replaces the current IPC handler block only. It keeps your structure intact, avoids architectural expansion, and implements:

* **F-1**: main constructs PrivilegedGateContext
* **F-5**: replay wired into IPC
* **F-4**: normalized error output
* Preserves existing telemetry call

---

# Patch — Replace Only the IPC Handler Block

Replace your entire current `ipcMain.handle('privileged:request', ...)` block with the following:

```ts
// 2. Hardened IPC Handler (Renderer = intent only)
ipcMain.handle('privileged:request', async (event, request) => {
  const { requirePrivilege } = require('../../src/core/governance/privilegedGate')
  const { getConfig } = require('../../src/core/config')
  const { RuntimeMemoryStore } = require('../../src/integrations/runtimeMemoryStore')
  const { OverrideRevocationStore } = require('../../src/core/governance/overrideRevocation')
  const { OverrideReplayLedger } = require('../../src/core/governance/overrideReplayLedger')

  const cfg = getConfig()

  // Renderer supplies intent only (never authority/context)
  const action = typeof request?.action === 'string' ? request.action : ''
  const affectedPaths = Array.isArray(request?.affectedPaths) ? request.affectedPaths : []
  const overrideToken = request?.overrideToken ?? null

  // Sanitize for telemetry only
  const telemetrySafe = sanitizeRequestForTelemetry(request)

  // Main owns runtime + authority
  const runtimeStore = new RuntimeMemoryStore(cfg.runtimeDbPath)
  const revocationStore = new OverrideRevocationStore()
  const replayLedger = new OverrideReplayLedger()

  await runtimeStore.bootstrap?.()

  const workflowRunId =
    (await runtimeStore.startWorkflowRun?.({
      workflowName: 'ipc.privileged',
      triggerSource: 'renderer',
      initiatedBy: 'renderer'
    })) ?? 'ipc.privileged'

  try {
    // Early replay check (F-5)
    const maybeOverrideId = overrideToken?.override_id
    const maybeNonce = overrideToken?.integrity?.nonce

    if (maybeOverrideId && maybeNonce && replayLedger.hasSeen(maybeOverrideId, maybeNonce)) {
      throw Object.assign(new Error('Override replay detected'), { code: 'PRIVILEGE_DENIED' })
    }

    const ctx = {
      action,
      affectedPaths,
      finalGateStatus: 'NO-GO', // must be derived internally in future
      workspaceRoot: process.cwd(),
      workflowRunId,
      runtimeStore,
      overrideToken,
      resolveKey: (keyId: string) => cfg.overrideAuth.resolveKey(keyId),
      isRevoked: (id: string) => revocationStore.isRevoked(id),
    }

    const result = await requirePrivilege(ctx)

    // Consume replay only after success (F-5)
    if (result?.overrideId && maybeNonce) {
      replayLedger.markSeen(
        result.overrideId,
        maybeNonce,
        overrideToken?.integrity?.token_hash ?? '',
        new Date().toISOString()
      )
    }

    return { ok: true, result }
  } catch (err: any) {
    // Normalize errors (F-4)
    const code = err?.code
    const safeError =
      code === 'PRIVILEGE_DENIED'
        ? { message: String(err?.message ?? 'Privileged request denied.'), name: 'PrivilegeDeniedError' }
        : { message: 'Privileged request denied.', name: 'Error' }

    await runtimeStore.appendTaskEvent?.({
      workflowRunId,
      eventType: 'policy',
      message: `PRIVILEGE_DENIED`,
      meta: { action }
    })

    return { ok: false, error: safeError }
  } finally {
    await runtimeStore.close?.()
  }
})
```

---

# What This Fixes

| Finding                                | Status After Patch |
| -------------------------------------- | ------------------ |
| Renderer supplies context              | Eliminated         |
| Renderer supplies resolveKey/isRevoked | Eliminated         |
| TypeError crash path                   | Eliminated         |
| No audit on crash                      | Eliminated         |
| Replay not wired into IPC              | Fixed              |
| Error leakage                          | Normalized         |

And it does so without redesigning the governance layer.

---

# Why This Is Correct for Your Architecture

Your current snapshot explicitly forwards renderer input into `requirePrivilege()`:

> `requirePrivilege(request.context ?? request)` 

This patch removes that trust boundary violation and keeps renderer strictly as:

> intent: { action, affectedPaths, overrideToken }

Authority is now fully main-owned.

---

# Important Note

This line:

```ts
finalGateStatus: 'NO-GO'
```

Is intentionally hard-coded to keep patch minimal.
In a later hardening pass, this should be derived from actual governance state rather than static.

But that is **not required** to close F-1/F-4/F-5.

---

# Next Step

After applying this patch:

1. Re-run the exact malicious payloads from your red-team debrief.
2. Confirm:

   * No TypeErrors
   * All attempts denied cleanly
   * Audit event emitted
   * Replay attempt rejected

Once confirmed, IPC privilege boundary moves from **CRITICAL** to **HARDENED**.

When ready, we can proceed to a second adversarial pass focusing on:

* path traversal bypass attempts
* privilege confusion between ToM and Oxide identities
* override token tampering edge cases

Let me know when you are ready!