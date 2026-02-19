import * as z from "zod";
import { canonicalize } from "json-canonicalize";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const ISO_DATE_TIME = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid ISO datetime");
const BASE64_STRING = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9+/]+={0,2}$/, "Must be valid base64");

const RISK_LEVEL = z.enum(["low", "medium", "high", "critical"]);

const OVERRIDE_SIGNATURE_SCHEMA = z.object({
  alg: z.literal("HMAC-SHA256"),
  key_id: z.string().min(1),
  sig: BASE64_STRING,
});

export const OVERRIDE_TOKEN_SCHEMA = z.object({
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
    issued_at: ISO_DATE_TIME,
    expires_at: ISO_DATE_TIME,
    revocation: z.object({
      revocable: z.boolean(),
      revocation_key_id: z.string().min(1).optional(),
    }),
    statement: z.string().min(1),
    risk_acceptance: z.object({
      risk_ceiling: RISK_LEVEL,
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
    evidence_dir: z.string().min(1),
  }),
  integrity: z.object({
    nonce: z.string().min(1),
    previous_audit_hash: z.string().min(1).optional(),
    token_hash: z.string().min(1),
    signature: OVERRIDE_SIGNATURE_SCHEMA,
  }),
});

export type OverrideToken = z.infer<typeof OVERRIDE_TOKEN_SCHEMA>;

export type VerifyOverrideTokenResult =
  | { ok: true; token: OverrideToken; canonicalSigningPayload: string; nonce: string; tokenHash: string }
  | { ok: false; reason: string };

function toSigningView(token: OverrideToken): unknown {
  const clone = structuredClone(token) as OverrideToken;
  const { signature: _signature, token_hash: _tokenHash, ...integrityWithoutSignature } = clone.integrity;
  return {
    ...clone,
    integrity: integrityWithoutSignature,
  };
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmacSha256Base64(secret: Buffer, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("base64");
}

function decodeBase64(value: string): Buffer | null {
  try {
    const decoded = Buffer.from(value, "base64");
    if (decoded.length === 0) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function verifyOverrideToken(
  input: unknown,
  options: {
    resolveKey: (keyId: string) => Buffer | undefined;
    clockSkewSec?: number;
    enforceTokenHash?: boolean;
    isRevoked?: (overrideId: string) => boolean;
  }
): VerifyOverrideTokenResult {
  const parsed = OVERRIDE_TOKEN_SCHEMA.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.message };
  }

  const token = parsed.data;

  if (options.isRevoked && options.isRevoked(token.override_id)) {
    return { ok: false, reason: "Override token has been revoked" };
  }

  const now = Date.now();
  const skewMs = (options.clockSkewSec ?? 30) * 1000;

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

  const keyId = token.integrity.signature.key_id;
  const secret = options.resolveKey(keyId);
  if (!secret || secret.length < 16) {
    return { ok: false, reason: "Signing key not available or too short" };
  }

  const canonicalSigningPayload = canonicalize(toSigningView(token));

  if (options.enforceTokenHash ?? true) {
    const expectedHash = sha256Hex(canonicalSigningPayload);
    if (token.integrity.token_hash !== expectedHash) {
      return { ok: false, reason: "token_hash mismatch" };
    }
  }

  const expectedSig = hmacSha256Base64(secret, canonicalSigningPayload);
  const expectedBytes = decodeBase64(expectedSig);
  const providedBytes = decodeBase64(token.integrity.signature.sig);

  if (!expectedBytes || !providedBytes || expectedBytes.length !== providedBytes.length) {
    return { ok: false, reason: "Signature mismatch" };
  }
  if (!timingSafeEqual(expectedBytes, providedBytes)) {
    return { ok: false, reason: "Signature mismatch" };
  }

  return {
    ok: true,
    token,
    canonicalSigningPayload,
    nonce: token.integrity.nonce,
    tokenHash: token.integrity.token_hash,
  };
}
