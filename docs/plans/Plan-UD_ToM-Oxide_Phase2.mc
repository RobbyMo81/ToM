## Sanity check: where do secrets live today?

### Current reality (good for v1)

* Secrets are **env vars** loaded via `dotenv` in `config.ts`. 
* `.env` is **gitignored**, so local secrets are not intended to be committed. 
* There is **no** `.secrets` folder or secret-manager abstraction yet (so we shouldn’t design one into the override system prematurely).

### Implication

✅ The override token system should be **env-keyed** (HMAC key in env), and the token JSON should be **artifact-stored** in `.tom-workspace`.

---

## CTO-precise recommendation: how the override signing key is sourced/stored

### 1) Store the HMAC signing key in environment variables

Add one or both of the following patterns (pick one):

**Pattern A — single key (simplest v1)**

* `TOM_OVERRIDE_HMAC_KEY_B64` (base64-encoded random 32 bytes)

**Pattern B — keyed rotation (recommended)**

* `TOM_OVERRIDE_HMAC_KEYSET_JSON` = JSON map of `key_id -> base64 secret`
* Token contains `integrity.signature.key_id`, and verification selects the matching key

Either pattern fits your current `config.ts` model where env vars are the configuration interface. 

### 2) Never store the signing key in `.tom-workspace`

`.tom-workspace` should store:

* override tokens (signed JSON)
* proposals/evidence/audit logs
  …but **not** the secret used to validate them. 

---

## The exact integration changes I would make (minimal)

### A) Extend `.env.example`

Add:

* `TOM_OVERRIDE_HMAC_KEY_B64=`
* `TOM_OVERRIDE_HMAC_KEY_ID=oxide-local-override-key` *(or whatever you standardize)*

This matches how you already document keys like `BRAVE_API_KEY` and `GITHUB_TOKEN`. 

### B) Extend `src/core/config.ts`

Add config fields:

* `overrideHmacKeyId: string`
* `overrideHmacKey: Buffer` (decoded from base64)
* optionally `overrideKeyRing: Map<string, Buffer>` if you want rotation

This keeps the override verification function pure: it receives a `resolveKey()` that pulls from config.

### C) Verification call sites

Enforce override validity in both:

* CLI commands (where you grant/verify override tokens)
* the run loop (where you decide to enter `OVERRIDE_AUTONOMY`)

Your repo already has both CLI and cycle/job structure ready for this. 

---

## Security posture notes (realistic given you’re env-only today)

### What this gives you now

* Tamper-evident tokens
* Deterministic verification
* Audit-friendly artifacts
* No new infra dependencies

### What it does *not* give you (until you implement secret management)

* Protection against local machine compromise (if an attacker steals `.env`, they can sign tokens)
* Multi-admin signing with hardware keys / PKI

That’s acceptable for v1 if you treat override as “break-glass on the operator machine” and keep the default stance conservative.

---

## One refinement to the earlier code proposal (important)

In my earlier snippet, I compared signatures as UTF-8 strings. For correctness and hygiene, you should:

* store `sig` as **base64**
* compare decoded bytes using `timingSafeEqual`
* validate base64 format in Zod

This prevents subtle encoding mistakes and makes the signature comparison strictly cryptographic.

---

## Final CTO answer

Given your current architecture:

* **Yes**, it’s logical and feasible to implement Zod schema + `verifyOverrideToken()` now.
* It should source keys from **dotenv/env** exactly like your existing tokens. 
* Override tokens themselves are stored in `.tom-workspace` as artifacts (signed, auditable), but **signing keys are not stored there**. 


---

Below is a **copy/paste-ready override token schema** for the **NO-GO break-glass** path. It is designed to be:

* **project-scoped**
* **capability-scoped**
* **time-bounded**
* **tamper-evident**
* **auditable**
* compatible with your existing `.tom-workspace/` artifact approach (as referenced in your repo snapshot). 
  And it addresses the escalation context where final gate is NO-GO. 

---

# O.X.I.D.E. HITL Override Token Schema (v1)

## File placement (recommended)

```
.tom-workspace/authorizations/override/<project_id>/<override_id>.json
```

## Canonical JSON (token)

```json
{
  "schema_version": "oxide.override.v1",
  "override_id": "OVR-20260219-0007",
  "project": {
    "project_id": "tom-sqlite-enhancement",
    "repo_root": "d:\\Documents\\ToM",
    "scope": {
      "allowed_paths": [
        "src/",
        "docs/",
        "sql/"
      ],
      "disallowed_paths": [
        ".github/workflows/",
        ".env",
        "secrets/",
        "infra/"
      ],
      "allowed_repos": [
        "ToM"
      ]
    }
  },
  "gate_context": {
    "final_gate_status": "NO-GO",
    "gate_reason": "OXIDE-P4-003 unresolved closeout items",
    "blocking_items": [
      "R-009 runtime SQL memory schema not started",
      "EA-001 branch protection confirmation pending"
    ],
    "reference_artifacts": [
      "docs/build/Build_Instance_OXIDE_Skill_to_Logic.md",
      "docs/plans/Plan-OXIDE_Implementation_Backlog.md",
      "docs/handoffs/OXIDE_Skill_to_Logic_Handoff.md"
    ]
  },
  "authorization": {
    "issued_by": {
      "name": "Rob Mosher",
      "role": "CTO",
      "method": "manual_approval"
    },
    "issued_at": "2026-02-19T11:05:00-08:00",
    "expires_at": "2026-02-20T11:05:00-08:00",
    "revocation": {
      "revocable": true,
      "revocation_key_id": "HITL-REV-CTO"
    },
    "statement": "I acknowledge the system is in NO-GO. I accept the associated risks. You are granted full control within the approved project scope until completion or expiration.",
    "risk_acceptance": {
      "risk_ceiling": "high",
      "accepted_risks": [
        "Proceeding before R-009 completion",
        "Proceeding before EA confirmations"
      ],
      "mitigations_required": [
        "CI must pass all checks",
        "No changes to governance/security modules",
        "Rollback plan required and tested in smoke"
      ]
    }
  },
  "capabilities": {
    "allow": [
      "web_search",
      "local_code_modification",
      "run_ci",
      "generate_patch",
      "create_pr",
      "merge_pr",
      "deploy",
      "monitor",
      "rollback"
    ],
    "deny": [
      "modify_governance_policy",
      "modify_authn_authz",
      "access_secrets",
      "change_branch_protections",
      "add_external_dependencies",
      "network_calls_except_web_search"
    ]
  },
  "execution_constraints": {
    "max_iterations": 25,
    "max_diff_lines": 800,
    "requires_ci_evidence": true,
    "requires_post_deploy_monitoring_minutes": 60,
    "cooldown_minutes_after_completion": 120,
    "ollama": {
      "enabled": true,
      "mode": "local_only",
      "allowed_models": [
        "llama3.2:latest",
        "deepseek-r1:latest"
      ],
      "temperature_max": 0.3,
      "max_tokens": 4096
    }
  },
  "audit": {
    "audit_log_path": ".tom-workspace/audit/oxide_audit_log.jsonl",
    "emit_events": true,
    "event_tags": [
      "HITL_OVERRIDE",
      "NO_GO_BREAK_GLASS"
    ],
    "evidence_dir": ".tom-workspace/proposals"
  },
  "integrity": {
    "nonce": "a1f3f7d0-7f14-4f0e-9a0a-2c2fd2a6dd11",
    "previous_audit_hash": "SHA256:REPLACE_WITH_LAST_EVENT_HASH",
    "token_hash": "SHA256:CANONICAL_JSON_HASH",
    "signature": {
      "alg": "HMAC-SHA256",
      "key_id": "oxide-local-override-key",
      "sig": "BASE64_SIGNATURE_OVER_CANONICAL_JSON"
    }
  }
}
```

---

# Validation Rules (Must Enforce)

## Required fields

* `schema_version`, `override_id`
* `project.project_id`, `project.repo_root`
* `gate_context.final_gate_status == "NO-GO"`
* `authorization.issued_by`, `authorization.issued_at`, `authorization.expires_at`
* `authorization.statement` (must match or be semantically equivalent)
* `capabilities.allow` and `capabilities.deny`
* `integrity.nonce`, `integrity.token_hash`, `integrity.signature`

## Hard constraints

* **expires_at must be in the future** and **short-lived** (policy default: ≤ 24h)
* `deny` list is enforced even if `allow` includes conflicting items
* `disallowed_paths` always overrides `allowed_paths`
* if any integrity check fails → token rejected

---

# Canonicalization + Signature (Practical v1)

For v1, keep this simple and robust:

1. **Canonical JSON**

   * UTF-8
   * sorted keys
   * no whitespace
2. Compute `token_hash = SHA256(canonical_json_without_signature_fields)`
3. Compute `sig = HMAC-SHA256(token_hash, local_secret_key)`
4. Store:

   * `token_hash`
   * `sig`
   * `key_id`

This avoids PKI complexity while still being tamper-evident locally.

Later you can move to Ed25519 signatures.

---

# Minimal Companion Types (Conceptual)

* **Override Token**: allows autonomy during NO-GO.
* **Scoped Autonomy Token**: allows autonomy during GO (normal path).

Override token must always set:

* `final_gate_status = NO-GO`
* `event_tags` include `NO_GO_BREAK_GLASS`

So auditors can find these instantly.

---

# Implementation Notes for ToM

In `tom authorize` and `tom run`:

* If final gate is `NO-GO`:

  * reject scoped autonomy tokens
  * accept override tokens only if:

    * signature valid
    * unexpired
    * matches repo/project/scope
    * requested action ∈ allowed capabilities
    * action paths ⊆ allowed_paths and ∉ disallowed_paths

And log:

* `OVERRIDE_REQUESTED`
* `OVERRIDE_ACCEPTED` or `OVERRIDE_REJECTED`
* all subsequent actions with `override_id`

---

** Proposed Specifications **

## Research and Review before implementation

Yes—this is logical and very doable in your current TypeScript/Node architecture (ToM). The key technical points are:

* **Use RFC 8785 JSON Canonicalization (JCS)** so the same token always hashes identically regardless of key order/whitespace. ([RFC Editor][1])
* **Sign the canonical JSON (minus signature fields)** using **HMAC-SHA256**, and verify with **constant-time comparison** (`timingSafeEqual`). ([Node.js][2])
* Validate structure using **Zod**, then verify crypto, then return a **strongly typed object** (`z.infer`). ([Zod][3])
* For canonicalization, either implement RFC 8785 directly or use a library that follows JCS rules (e.g., `json-canonicalize`). ([npm][4])
  (A stable stringify library like `fast-json-stable-stringify` can work as a pragmatic v1 if you accept it’s “stable order” but not strictly RFC 8785-complete.) ([GitHub][5])

Given your “governance artifacts in `.tom-workspace` and excluded from vector memory” policy, this token verification should live in your future `src/core/governance/` layer described in `whoiam.md`. 

---

## Recommended package choices (v1)

* **Canonicalization:** `json-canonicalize` (RFC 8785 aligned) ([npm][4])
* **Validation:** `zod` ([Zod][3])
* **Crypto:** bui`createHmac`, `timingSafeEqual`) ([Node.js][2])

Install:

```bash
npm i zod json-canonicalize
```

---

## TypeScript implementation (schema + verifyOverrideToken)

Create: `src/core/governance/overrideToken.ts`

```ts
import * as z from "zod";
import { createHmac, timingSafeEqual } from "node:crypto";
import canonicalize from "json-canonicalize";

/**
 * Notes:
 * - We verify structure with Zod first.
 * - We then canonicalize a "signing view" of the object (signature fields removed).
 * - We compute HMAC-SHA256 over canonical JSON bytes.
 * - We compare signatures using timingSafeEqual (constant-time).
 *
 * Canonicalization uses RFC 8785-aligned JCS via json-canonicalize. :contentReference[oaicite:10]{index=10}
 */

const IsoDateTime = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid ISO datetime");

const RiskLevel = z.enum(["low", "medium", "high", "critical"]);

const OverrideSignatureSchema = z.object({
  alg: z.literal("HMAC-SHA256"),
  key_id: z.string().min(1),
  sig: z.string().min(1), // base64 (recommended) or hex; pick one policy and enforce it
});

export const OverrideTokenSchema = z.object({
  schema_version: z.literal("oxide.override.v1"),
  override_id: z.string().min(1),

  project: z.object({
    project_id: z.string().min(1),
    repo_root: z.string().min(1),
    scope: z.object({
      allowed_paths: z.array(z.string().min(1)).min(1),
      disallowed_paths: z.array(z.string().min(1)).default([]),
      allowed_repos: z.array(z.string().min(1)).min(1),
    }),
  }),

  gate_context: z.object({
    final_gate_status: z.literal("NO-GO"),
    gate_reason: z.string().min(1),
    blocking_items: z.array(z.string().min(1)).default([]),
    reference_artifacts: z.array(z.string().min(1)).default([]),
  }),

  authorization: z.object({
    issued_by: z.object({
      name: z.string().min(1),
      role: z.string().min(1),
      method: z.string().min(1),
    }),
    issued_at: IsoDateTime,
    expires_at: IsoDateTime,
    revocation: z.object({
      revocable: z.boolean(),
      revocation_key_id: z.string().min(1).optional(),
    }),
    statement: z.string().min(1),
    risk_acceptance: z.object({
      risk_ceiling: RiskLevel,
      accepted_risks: z.array(z.string().min(1)).default([]),
      mitigations_required: z.array(z.string().min(1)).default([]),
    }),
  }),

  capabilities: z.object({
    allow: z.array(z.string().min(1)).min(1),
    deny: z.array(z.string().min(1)).default([]),
  }),

  execution_constraints: z.object({
    max_iterations: z.number().int().positive().default(25),
    max_diff_lines: z.number().int().positive().default(800),
    requires_ci_evidence: z.boolean().default(true),
    requires_post_deploy_monitoring_minutes: z.number().int().nonnegative().default(60),
    cooldown_minutes_after_completion: z.number().int().nonnegative().default(120),
    ollama: z.object({
      enabled: z.boolean().default(true),
      mode: z.literal("local_only").default("local_only"),
      allowed_models: z.array(z.string().min(1)).min(1),
      temperature_max: z.number().min(0).max(2).default(0.3),
      max_tokens: z.number().int().positive().default(4096),
    }),
  }),

  audit: z.object({
    audit_log_path: z.string().min(1),
    emit_events: z.boolean().default(true),
    event_tags: z.array(z.string().min(1)).default([]),
    evidence_dir: z.string().min(1).optional(),
  }),

  integrity: z.object({
    nonce: z.string().min(1),
    previous_audit_hash: z.string().min(1).optional(),

    // hash of canonical signing payload (recommended)
    token_hash: z.string().min(1),

    signature: OverrideSignatureSchema,
  }),
});

export type OverrideToken = z.infer<typeof OverrideTokenSchema>;

export type VerifyOverrideTokenResult =
  | { ok: true; token: OverrideToken; canonicalSigningPayload: string }
  | { ok: false; reason: string };

/**
 * Remove fields that must NOT be included in the signature computation.
 * We sign the token content excluding integrity.signature and integrity.token_hash.
 */
function toSigningView(token: OverrideToken): unknown {
  const clone: any = structuredClone(token);

  // Remove fields that are derived / not part of the signed payload
  if (clone?.integrity) {
    delete clone.integrity.signature;
    delete clone.integrity.token_hash;
  }

  return clone;
}

/**
 * Compute SHA256 HMAC over canonical JSON signing payload.
 * Returns base64.
 */
function hmacSha256Base64(secret: Buffer, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("base64");
}

/**
 * Verify token:
 * 1) Zod parse
 * 2) expiry check
 * 3) canonicalize signing view (RFC8785 JCS)
 * 4) recompute HMAC, compare with timingSafeEqual
 * 5) verify token_hash matches SHA256(canonicalSigningPayload) if you want a second integrity check
 */
export function verifyOverrideToken(
  input: unknown,
  opts: {
    // Key resolver lets you map key_id -> secret bytes (env, file, keystore)
    resolveKey: (keyId: string) => Buffer | undefined;

    // Optional leeway for clock skew (seconds)
    clockSkewSec?: number;

    // If true, enforce that token.integrity.token_hash === SHA256(canonicalSigningPayload)
    // (requires you to implement sha256Hex/base64 – omitted here for brevity)
    enforceTokenHash?: boolean;
  }
): VerifyOverrideTokenResult {
  const parsed = OverrideTokenSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.message };
  }

  const token = parsed.data;

  // Expiry checks
  const now = Date.now();
  const skewMs = (opts.clockSkewSec ?? 30) * 1000;

  const issuedAt = Date.parse(token.authorization.issued_at);
  const expiresAt = Date.parse(token.authorization.expires_at);

  if (Number.isNaN(issuedAt) || Number.isNaN(expiresAt)) {
    return { ok: false, reason: "Invalid issued_at/expires_at timestamps" };
  }
  if (issuedAt - skewMs > now) {
    return { ok: false, reason: "Token issued_at is in the future (beyond skew)" };
  }
  if (now - skewMs > expiresAt) {
    return { ok: false, reason: "Token is expired" };
  }

  // Resolve secret by key_id
  const keyId = token.integrity.signature.key_id;
  const secret = opts.resolveKey(keyId);
  if (!secret || secret.length < 16) {
    return { ok: false, reason: "Signing key not available or too short" };
  }

  // Build canonical signing payload (RFC 8785 JCS)
  const signingView = toSigningView(token);
  const canonicalSigningPayload = canonicalize(signingView);

  // Recompute signature
  const expectedSig = hmacSha256Base64(secret, canonicalSigningPayload);
  const providedSig = token.integrity.signature.sig;

  // Constant-time compare: timingSafeEqual requires equal length buffers
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  const providedBuf = Buffer.from(providedSig, "utf8");
  if (expectedBuf.length !== providedBuf.length) {
    return { ok: false, reason: "Signature mismatch" };
  }
  if (!timingSafeEqual(expectedBuf, providedBuf)) {
    return { ok: false, reason: "Signature mismatch" };
  }

  // Optional: enforce token_hash (you would compute SHA256(canonicalSigningPayload))
  // Skipping here to keep the snippet focused, but recommended.

  return { ok: true, token, canonicalSigningPayload };
}
```

### Key takeaways in this implementation

* **Zod** handles untrusted JSON shape. ([Zod][3])
* **RFC 8785 canonicalization** prevents “same data, different string” signature bugs. ([RFC Editor][1])
* **HMAC verification uses constant-time compare** to avoid timing leaks. ([Node.js][2])

---

## How this fits your ToM architecture

In your `whoiam.md`, governance artifacts live in `.tom-workspace/**` and are excluded from vector memory. 
This means `verifyOverrideToken()` should be invoked:

* in CLI command handling (`src/cli.ts`) before allowing `tom override …`
* in `runCycle` / orchestration (`src/jobs/cycleJob.ts` or the governance middleware you’re planning) to decide whether `OVERRIDE_AUTONOMY` can be entered

---

## Minimal “key resolver” pattern

Example resolver:

```ts
const resolveKey = (keyId: string) => {
  // Example: map to env var TOM_OVERRIDE_KEY_<keyId>
  const envKey = process.env[`TOM_OVERRIDE_KEY:contentReference[oaicite:15]{index=15} envKey ? Buffer.from(envKey, "base64") : undefined;
};
```

Recommendation: store secrets in env/secure store; never in repo; never in token.

---

## Small edit I’d make to your token spec (important)

Pick **one signature encoding** and enforce it:

* base64 is fine; then validate it in Zod via regex and length checks.

Right now `sig` is `string().min(1)`; tightening that avoids sloppy signatures.

---