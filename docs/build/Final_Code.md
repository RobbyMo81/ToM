# Final Code Excerpts for Security Review

Here are the final code excerpts from the implemented changes for your review.

---

### 1. `src/security/mounted-secrets.ts` (Full File)

This is the complete new module for handling secrets mounted from the filesystem.

```typescript
import fs from "node:fs/promises";
import path from "node:path";

let secrets: Map<string, string> | null = null;

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
  const required = opts?.required ?? [];
  const loadedSecrets = new Map<string, string>();

  for (const name of required) {
    const secretPath = path.join(dir, name);
    try {
      const content = await fs.readFile(secretPath, "utf8");
      loadedSecrets.set(name, content.trim());
    } catch (err) {
      // Ignore errors for now; requireMountedSecretSync will handle missing required secrets.
      // This allows optional secrets to be checked without causing a startup crash.
    }
  }
  secrets = loadedSecrets;
}

/**
 * Synchronously retrieves a secret from the cache.
 * Returns the secret string or `undefined` if not found.
 * `initMountedSecrets` must be called before this function.
 *
 * @param name The name of the secret to retrieve.
 */
export function getMountedSecretSync(name: string): string | undefined {
  if (secrets === null) {
    throw new Error("Secret cache not initialized. Call initMountedSecrets() at startup.");
  }
  return secrets.get(name);
}

/**
 * Synchronously retrieves a secret from the cache and throws an error if it's missing.
 * `initMountedSecrets` must be called before this function.
 *
 * @param name The name of the secret to retrieve.
 * @returns The secret string.
 */
export function requireMountedSecretSync(name: string): string {
  const secret = getMountedSecretSync(name);
  if (secret === undefined) {
    const dir = process.env.OPENCLAW_SECRETS_DIR ?? "/run/secrets";
    throw new Error(
      `Required secret "${name}" not found.` +
        ` Expected at path: ${path.join(dir, name)}.` +
        ` Set the OPENCLAW_SECRETS_DIR environment variable to change the directory.`
    );
  }
  return secret;
}
```

---

### 2. `src/cli/gateway-cli/run.ts` (Gateway Startup)

This excerpt shows the `initMountedSecrets()` call at the top of the gateway's command handler.

```typescript
// From: src/cli/gateway-cli/run.ts

async function runGatewayCommand(opts: GatewayRunOpts) {
  await initMountedSecrets({
    required: ["openai_api_key", "anthropic_api_key", "gemini_api_key"],
  });

  const isDevProfile = process.env.OPENCLAW_PROFILE?.trim().toLowerCase() === "dev";
  const devMode = Boolean(opts.dev) || isDevProfile;
  if (opts.reset && !devMode) {
    defaultRuntime.error("Use --reset with --dev.");
    defaultRuntime.exit(1);
    return;
  }
  // ...
}
```

---

### 3. `src/agents/model-auth.ts` (Secret Fallback Logic)

This is the modified `resolveEnvApiKey` function, now including the fallback logic to check for mounted secrets.

```typescript
// From: src/agents/model-auth.ts

export function resolveEnvApiKey(provider: string): EnvApiKeyResult | null {
  const normalized = normalizeProviderId(provider);
  const applied = new Set(getShellEnvAppliedKeys());
  const pick = (envVar: string): EnvApiKeyResult | null => {
    const value = normalizeOptionalSecretInput(process.env[envVar]);
    if (!value) {
      return null;
    }
    const source = applied.has(envVar) ? `shell env: ${envVar}` : `env: ${envVar}`;
    return { apiKey: value, source };
  };

  if (normalized === "github-copilot") {
    return pick("COPILOT_GITHUB_TOKEN") ?? pick("GH_TOKEN") ?? pick("GITHUB_TOKEN");
  }

  if (normalized === "anthropic") {
    const fromEnv = pick("ANTHROPIC_OAUTH_TOKEN") ?? pick("ANTHROPIC_API_KEY");
    if (fromEnv) {
      return fromEnv;
    }
  }

  if (normalized === "chutes") {
    return pick("CHUTES_OAUTH_TOKEN") ?? pick("CHUTES_API_KEY");
  }

  // ... (other provider-specific logic) ...

  const envMap: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    google: "GEMINI_API_KEY",
    voyage: "VOYAGE_API_KEY",
    groq: "GROQ_API_KEY",
    // ...
  };
  const envVar = envMap[normalized];
  if (envVar) {
    const fromEnv = pick(envVar);
    if (fromEnv) {
      return fromEnv;
    }
  }

  const secretFileMap: Record<string, string> = {
    openai: "openai_api_key",
    anthropic: "anthropic_api_key",
    google: "gemini_api_key",
  };
  const secretFileName = secretFileMap[normalized];
  if (secretFileName) {
    const fromSecretFile = getMountedSecretSync(secretFileName);
    if (fromSecretFile) {
      return {
        apiKey: fromSecretFile,
        source: `secret-file:${secretFileName}`,
      };
    }
  }

  return null;
}
```

---

### 4. `src/agents/bash-tools.shared.ts` (Updated `buildDockerExecArgs`)

This is the updated helper function that constructs the `docker exec` command without a shell wrapper.

```typescript
// From: src/agents/bash-tools.shared.ts

export function buildDockerExecArgs(params: {
  containerName: string;
  commandArgv: string[];
  workdir?: string;
  env: Record<string, string>;
  tty: boolean;
}) {
  const args = ["exec", "-i"];
  if (params.tty) {
    args.push("-t");
  }
  if (params.workdir) {
    args.push("-w", params.workdir);
  }
  for (const [key, value] of Object.entries(params.env)) {
    args.push("-e", `${key}=${value}`);
  }
  args.push(params.containerName, ...params.commandArgv);
  return args;
}
```

---

### 5. `src/agents/bash-tools.exec.ts` (Sandbox Validation)

These are the new additions to `bash-tools.exec.ts` that define the command allowlist and the validation logic for sandbox runs.

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
  "sh",
  "bash",
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
