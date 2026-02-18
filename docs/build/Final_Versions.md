# Final Code Versions for Security Review

This report contains the final versions of the code after implementing the requested security fixes.

---

### 1. `src/security/mounted-secrets.ts`

This is the final version of the mounted secrets module. It includes the fail-fast logic for required secrets, caching of the secrets directory for accurate error messages, and a non-throwing `getMountedSecretSync` for safe checking.

```typescript
import fs from "node:fs/promises";
import path from "node:path";

let secrets: Map<string, string> | null = null;
let secretsDir: string | null = null;

/**
 * Initializes a cache of secrets by reading them from a mounted directory.
 * This should be called once at application startup.
 *
 * The directory is resolved in the following order:
 * 1. `opts.dir`
 * 2. `process.env.OPENCLAW_SECRETS_DIR`
 * 3. `/run/secrets` (default)
 *
 * @param opts Options for initialization, including the directory and a list of required secret names.
 */
export async function initMountedSecrets(opts?: { dir?: string; required?: string[] }) {
  const dir = opts?.dir ?? process.env.OPENCLAW_SECRETS_DIR ?? "/run/secrets";
  secretsDir = dir; // Cache the resolved directory for error messages

  const required = new Set(opts?.required ?? []);
  const loadedSecrets = new Map<string, string>();

  // Attempt to read all required files first to fail fast.
  for (const name of required) {
    const secretPath = path.join(dir, name);
    let content: string;
    try {
      content = await fs.readFile(secretPath, "utf8");
    } catch (err) {
      throw new Error(
        `Required secret "${name}" could not be read.` +
          ` Expected at path: ${secretPath}.` +
          ` Set the OPENCLAW_SECRETS_DIR environment variable to change the directory.`,
        { cause: err }
      );
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new Error(
        `Required secret "${name}" at path ${secretPath} is empty.` +
          ` Set the OPENCLAW_SECRETS_DIR environment variable to change the directory.`
      );
    }
    loadedSecrets.set(name, trimmedContent);
  }

  secrets = loadedSecrets;
}

/**
 * Synchronously retrieves a secret from the cache.
 * Returns the secret string or `undefined` if not found or if cache is uninitialized.
 *
 * @param name The name of the secret to retrieve.
 */
export function getMountedSecretSync(name: string): string | undefined {
  return secrets?.get(name);
}

/**
 * Synchronously retrieves a secret from the cache and throws an error if it's missing.
 * `initMountedSecrets` must be called before this function.
 *
 * @param name The name of the secret to retrieve.
 * @returns The secret string.
 */
export function requireMountedSecretSync(name: string): string {
  if (secrets === null) {
    throw new Error("Secret cache not initialized. Call initMountedSecrets() at startup.");
  }
  const secret = getMountedSecretSync(name);
  if (secret === undefined) {
    const dir = secretsDir ?? process.env.OPENCLAW_SECRETS_DIR ?? "/run/secrets";
    throw new Error(
      `Required secret "${name}" not found in cache.` +
        ` Expected at path: ${path.join(dir, name)}.` +
        ` Set the OPENCLAW_SECRETS_DIR environment variable to change the directory.`
    );
  }
  return secret;
}
```

---

### 2. `src/agents/bash-tools.exec.ts` (Sandbox Allowlist & Validation)

This excerpt shows the updated `SANDBOX_COMMAND_ALLOWLIST` with shells removed and new tools added, along with the `validateSandboxExec` function that enforces the allowlist.

```typescript
// From: src/agents/bash-tools.exec.ts

const SANDBOX_COMMAND_ALLOWLIST = new Set([
  "ls",
  "cat",
  "echo",
  "pwd",
  "grep",
  "node",
  "npm",
  "pnpm",
  "python",
  "pip",
  "git",
  "python3",
  "pip3",
  "test",
  "find",
  "rm",
  "mkdir",
  "touch",
]);

function validateSandboxExec(argv: string[]) {
  if (!argv || argv.length === 0) {
    throw new Error("Sandbox exec requires 'argv' parameter with at least one argument.");
  }
  const command = argv[0];
  if (path.isAbsolute(command)) {
    throw new Error(`Sandbox exec does not allow absolute paths. Got "${command}".`);
  }
  if (!SANDBOX_COMMAND_ALLOWLIST.has(command)) {
    throw new Error(`Command "${command}" is not on the sandbox allowlist.`);
  }
}
```
