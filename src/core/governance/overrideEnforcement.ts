import path from "node:path";
import { type OverrideToken } from "./overrideToken";

interface OverridePermitOk {
  ok: true;
}

interface OverridePermitDenied {
  ok: false;
  reason: string;
}

export type OverridePermitResult = OverridePermitOk | OverridePermitDenied;

function normalizeForCompare(inputPath: string): string {
  return inputPath.replace(/\\/gu, "/").replace(/\/+$/gu, "").toLowerCase();
}

function ensureTrailingSlash(inputPath: string): string {
  const normalized = normalizeForCompare(inputPath);
  if (normalized.length === 0) {
    return "/";
  }
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function isPathWithinScope(targetPath: string, scopePath: string): boolean {
  const normalizedTarget = normalizeForCompare(targetPath);
  const normalizedScope = ensureTrailingSlash(scopePath);

  return normalizedTarget === normalizedScope.slice(0, -1) || normalizedTarget.startsWith(normalizedScope);
}

export function assertOverridePermits(
  token: OverrideToken,
  action: string,
  affectedPaths: string[],
  workspaceRoot: string
): OverridePermitResult {
  if (token.gate_context.final_gate_status !== "NO-GO") {
    return { ok: false, reason: "gate_context final gate must be NO-GO" };
  }

  if (token.capabilities.deny.includes(action)) {
    return { ok: false, reason: `action denied by token capability deny list: ${action}` };
  }

  if (!token.capabilities.allow.includes(action)) {
    return { ok: false, reason: `action not present in token capability allow list: ${action}` };
  }

  const resolvedWorkspaceRoot = normalizeForCompare(path.resolve(workspaceRoot));
  const resolvedTokenRepoRoot = normalizeForCompare(path.resolve(workspaceRoot, token.project.repo_root));

  if (resolvedWorkspaceRoot !== resolvedTokenRepoRoot) {
    return {
      ok: false,
      reason: "token project.repo_root does not match current workspace root",
    };
  }

  const repoCandidates = new Set<string>([
    normalizeForCompare(token.project.repo_root),
    normalizeForCompare(path.basename(workspaceRoot)),
    resolvedWorkspaceRoot,
  ]);
  const normalizedAllowedRepos = token.project.scope.allowed_repos.map((entry) => normalizeForCompare(entry));
  const repoAllowed = [...repoCandidates].some((candidate) => normalizedAllowedRepos.includes(candidate));

  if (!repoAllowed) {
    return {
      ok: false,
      reason: "current repository is not listed in token project.scope.allowed_repos",
    };
  }

  for (const targetPath of affectedPaths) {
    const absoluteTarget = path.resolve(workspaceRoot, targetPath);
    const relativeTarget = normalizeForCompare(path.relative(workspaceRoot, absoluteTarget));

    const allowed = token.project.scope.allowed_paths.some((scopePath) => isPathWithinScope(relativeTarget, scopePath));
    if (!allowed) {
      return {
        ok: false,
        reason: `path outside allowed_paths scope: ${targetPath}`,
      };
    }

    const disallowed = token.project.scope.disallowed_paths.some((scopePath) => isPathWithinScope(relativeTarget, scopePath));
    if (disallowed) {
      return {
        ok: false,
        reason: `path matches disallowed_paths scope: ${targetPath}`,
      };
    }
  }

  return { ok: true };
}
