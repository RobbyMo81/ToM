import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { type AppConfig } from "./config";

export type IdentityAgent = "tom" | "oxide";
export type IdentityRole = "ToM" | "O.X.I.D.E";
export type PromptClass = "executive" | "technical-subsystem";

export interface IdentityContext extends Record<string, unknown> {
  identityAgent: IdentityAgent;
  identityRole: IdentityRole;
  identityVersion: string;
  identitySourcePath: string;
  identitySourceHash: string;
  promptClass: PromptClass;
  traits: string[];
  systemPrompt: string;
  loadedAt: string;
}

export interface IdentityBinder {
  bind(agent: IdentityAgent): Promise<IdentityContext>;
}

export class IdentityBindingUnavailableError extends Error {
  readonly code = "OXIDE_IDENTITY_BINDING_REQUIRED";

  constructor(
    public readonly agent: IdentityAgent,
    public readonly operation: string,
    cause?: unknown
  ) {
    super(
      `Identity binding unavailable for operation '${operation}' (agent='${agent}'). Strict mode requires identity binding before execution.`
    );
    this.name = "IdentityBindingUnavailableError";
    if (cause !== undefined) {
      const message = cause instanceof Error ? cause.message : String(cause);
      this.cause = cause;
      this.message = `${this.message} Cause: ${message}`;
    }
  }
}

const ROLE_CONFIG: Record<
  IdentityAgent,
  {
    role: IdentityRole;
    promptClass: PromptClass;
    roleDirective: string;
  }
> = {
  tom: {
    role: "ToM",
    promptClass: "executive",
    roleDirective:
      "Operate as the primary executive orchestrator. Discover and synthesize, but do not self-approve or self-promote changes.",
  },
  oxide: {
    role: "O.X.I.D.E",
    promptClass: "technical-subsystem",
    roleDirective:
      "Operate as a bounded technical subsystem. Produce deterministic proposals only; never execute executive override or autonomous deployment.",
  },
};

export class WhoiamIdentityBinder implements IdentityBinder {
  constructor(private readonly whoiamDocPath: string) {}

  async bind(agent: IdentityAgent): Promise<IdentityContext> {
    const source = await readFile(this.whoiamDocPath, "utf8");
    const normalized = source.replace(/\r\n/g, "\n");
    const sourceHash = createHash("sha256").update(normalized).digest("hex");
    const identityVersion = extractIdentityVersion(normalized, sourceHash);
    const traits = extractTraits(normalized);
    const role = ROLE_CONFIG[agent];

    return {
      identityAgent: agent,
      identityRole: role.role,
      identityVersion,
      identitySourcePath: this.whoiamDocPath,
      identitySourceHash: sourceHash,
      promptClass: role.promptClass,
      traits,
      systemPrompt: buildSystemPrompt(role.roleDirective, traits),
      loadedAt: new Date().toISOString(),
    };
  }
}

export function createIdentityBinder(config: AppConfig): IdentityBinder {
  return new WhoiamIdentityBinder(path.resolve(config.whoiamSync.docPath));
}

function extractIdentityVersion(content: string, sourceHash: string): string {
  const match = content.match(/^(?:-|\*)?\s*(?:Identity\s+Version|Version)\s*:\s*(.+)$/im);
  const raw = match?.[1]?.trim();
  if (raw) {
    return raw;
  }

  return `hash:${sourceHash.slice(0, 12)}`;
}

function extractTraits(content: string): string[] {
  const bullets = [...content.matchAll(/^\s*[-*]\s+(.+)$/gm)]
    .map((match) => match[1].trim())
    .filter((line) => line.length > 0)
    .slice(0, 12);

  if (bullets.length > 0) {
    return bullets;
  }

  const fallback = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 8);

  return fallback;
}

function buildSystemPrompt(roleDirective: string, traits: string[]): string {
  const traitBlock = traits.length > 0 ? traits.map((trait) => `- ${trait}`).join("\n") : "- No identity traits found.";

  return [
    "Identity-bound execution context:",
    roleDirective,
    "Identity traits loaded from .tom-workspace/whoiam.md:",
    traitBlock,
    "Enforce governance boundaries at all times.",
  ].join("\n");
}
