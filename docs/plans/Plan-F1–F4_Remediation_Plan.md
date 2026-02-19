# CTO Directive Close The Blockers

**Research and Validate instructions below before implementation**

Below is a **compact F1–F4 Remediation Plan** (code-change guidance, not a redesign). It is written to directly close the blockers called out in your findings report. 

---

## F1–F4 Remediation Plan (≤150 lines of guidance)

### 0) Goal

Make override tokens **single-use**, **revocable**, **scope/capability enforced**, and **re-validated per privileged action**. 

---

### 1) F1 — Replay Protection (single-use nonce ledger)

**Add**: `src/core/governance/overrideReplayLedger.ts` (or embed in `oxideGovernance.ts` if you prefer minimal files)

* Persist to: `.tom-workspace/governance/override_replay.jsonl` (append-only)
* Key: `override_id + integrity.nonce` (and optionally `token_hash`)

**API**

* `hasSeen(overrideId, nonce): boolean`
* `markSeen(overrideId, nonce, tokenHash, ts): void`

**Integration point**

* In `oxideGovernance.ts`, at the moment you accept override autonomy:

  * `if hasSeen(...) => reject`
  * else `markSeen(...)`

**Behavior**

* First acceptance consumes token.
* Any reuse returns `OverrideRejected: replay_detected`.

---

### 2) F2 — Revocation Enforcement (persistent revocation source)

**Add**: `src/core/governance/overrideRevocation.ts`

* Storage: `.tom-workspace/governance/override_revocations.jsonl`
* Record: `{ override_id, revoked_at, revoked_by, reason }`

**API**

* `isRevoked(overrideId): boolean` (reads cached set; refresh on interval or per check)
* `revoke(overrideId, revokedBy, reason): void`

**Integration**

* In `verifyOverrideToken()` (optional light check):

  * accept `opts.isRevoked?: (id)=>boolean` and fail early if revoked
* In `oxideGovernance.ts` and any privileged action gate:

  * call `isRevoked()` before allowing action

**CLI**

* Add `tom revoke --override <override_id>` to write revocation record.

---

### 3) F3 — Enforce Scope + Capabilities (deny overrides allow)

**Add**: `src/core/governance/overrideEnforcement.ts`

**Core function**

* `assertOverridePermits(token, action, affectedPaths[]): { ok: true } | { ok:false, reason }`

**Rules**

* `deny` always wins:

  * if `action in token.capabilities.deny` => reject
* allow list required:

  * if `action not in token.capabilities.allow` => reject
* path scope:

  * each path must match at least one `allowed_paths` prefix
  * and must not match any `disallowed_paths` prefix
* repo scope:

  * ensure `repo_root` matches current workspace repo root
* gate context:

  * require `token.gate_context.final_gate_status === "NO-GO"`

**Where to enforce**

* Before any privileged step:

  * patch write
  * `create_pr`
  * `merge_pr`
  * `deploy`
  * `rollback`
  * web_search (if you want to scope it)

**Do NOT rely on “decision-time only” enforcement.** 

---

### 4) F4 — Per-Action Re-Validation (not just cycle start)

**Add**: one single “privileged action gate” helper and use it everywhere.

**File**: `src/core/governance/privilegedGate.ts`

**Function**

* `requirePrivilege(ctx, action, affectedPaths, gateState): VerifiedContext`

**It must:**

1. load current override token (if present)
2. call `verifyOverrideToken()` (expiry, signature)
3. call `isRevoked(override_id)`
4. call replay ledger check *only at acceptance time* (F1)
5. call `assertOverridePermits()` (F3)
6. emit audit event `PRIVILEGE_GRANTED/PRIVILEGE_DENIED`

**Call sites**

* Wherever ToM currently performs privileged operations:

  * PR creation/merge path
  * deploy/rollback path
  * any filesystem write of generated patches
  * any invocation of `oxide` executor that can change repo state

**Pattern**

* Replace: “check override once in cycle”
* With: “check override before each privileged action” 

---

### 5) Minimal wiring changes (where to touch)

**`src/core/oxideGovernance.ts`**

* On transition to `OVERRIDE_AUTONOMY`:

  * verify token
  * check revoked
  * check replay (consume token)
  * log acceptance

**`src/core/brain.ts`**

* Remove any “single verify at cycle start” reliance for privileged actions
* Route privileged steps through `requirePrivilege(...)`

**`src/core/governance/overrideToken.ts`**

* Keep crypto validation as-is (PASS per report) 
* Add optional hook(s):

  * `opts.isRevoked?`
  * return `override_id`, `nonce`, `token_hash` cleanly for ledger usage

---

### 6) Acceptance criteria (GO conditions for F1–F4)

* Reusing same override token → **always rejected** (F1)
* Revoking override mid-run → **next privileged action is denied** (F2/F4)
* Token that allows `deploy` but denies `merge_pr` → **merge denied** (F3)
* Token with allowed_paths `src/` cannot modify `.github/` → **denied** (F3)
* Token expires mid-run → **next privileged action denied** (F4)

---

If you want the fastest implementation path: I recommend starting with **(4) privilegedGate.ts** and **(3) overrideEnforcement.ts** first (they collapse most risk quickly), then add **(1) replay ledger** and **(2) revocation** as small persistent stores.
