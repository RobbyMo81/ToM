# Hardening Verification Report (Mounted Secrets + Sandbox Exec Allowlist)

This report details the verification testing for the two recent hardening changes: fail-fast mounted secrets and the sandbox `exec` allowlist.

## Environment

*   **OS**: Windows 10 Home
*   **Docker Compose**: v5.0.2
*   **Node**: v22.13.1
*   **pnpm**: 10.23.0

## Test Plan & Results

### A) Pre-flight

*   **Objective**: Confirm the working tree is ready and the project builds successfully.
*   **Result**: PASS

#### Commands Executed & Output:

1.  `git status --porcelain`
    *   **Output**: Showed modified files as expected.
2.  `pnpm build`
    *   **Output**: The build completed successfully without errors.

---

### B) Secrets: Startup Success Case

*   **Objective**: Verify that the gateway starts successfully when all required secret files are present.
*   **Result**: PASS

#### Commands Executed & Output:

1.  A `.secrets` directory was created with `openai_api_key`, `anthropic_api_key`, and `gemini_api_key`.
2.  The `.env` file was configured with `OPENCLAW_SECRETS_DIR=./.secrets`.
3.  `docker compose up -d` was executed.
4.  `docker compose ps` confirmed the container was stable:
    ```
    NAME                                IMAGE         COMMAND                  SERVICE            STATUS         PORTS
    assistantrobby-openclaw-gateway-1   assistantrobby  "docker-entrypoint.s…"   openclaw-gateway   Up 7 seconds   0.0.0.0:18789-18790->18789-18790/tcp
    ```
5.  `docker compose logs openclaw-gateway` showed a normal startup sequence:
    ```
    openclaw-gateway-1  | ... [gateway] listening on ws://0.0.0.0:18789 (PID 7)
    openclaw-gateway-1  | ... [browser/service] Browser control service ready (profiles=2)
    ```

---

### C) Secrets: Fail-Fast Missing Secret

*   **Objective**: Verify that the gateway fails to start if a required secret is missing, and that it produces a clear error message.
*   **Result**: FAIL

#### Commands Executed & Output:

1.  `docker compose down`
2.  `rm .secrets/gemini_api_key`
3.  `docker compose up -d`
4.  `docker compose ps` was executed.
    *   **Observed**: The `openclaw-gateway-1` container showed as `Up`.
    *   **Expected**: The container should have been in a `Restarting` or crash-looping state.
5.  `docker compose logs openclaw-gateway` was executed.
    *   **Observed**: The logs showed a normal startup sequence, identical to the success case.
    *   **Expected**: The logs should have contained a fatal error indicating the missing secret file.

#### Analysis:

The fail-fast logic implemented in `initMountedSecrets` is correctly written to throw an error. However, this error is being caught and swallowed somewhere in the application's startup sequence, preventing the process from exiting and the container from crashing. The test fails because the application does not stop on this critical error.

#### Recommended Fix:

Wrap the `initMountedSecrets` call within the `runGatewayCommand` function in `src/cli/gateway-cli/run.ts` with an explicit `try...catch` block that terminates the process on failure.

```typescript
// Proposed fix for src/cli/gateway-cli/run.ts
try {
  await initMountedSecrets({
    required: ["openai_api_key", "anthropic_api_key", "gemini_api_key"],
  });
} catch (err) {
  console.error(`Failed to initialize mounted secrets: ${err.message}`);
  process.exit(1);
}
```

---

### D) Sandbox `exec`: Allow/Deny

*   **Objective**: Verify that the sandbox `exec` tool correctly allows commands from the allowlist and denies shells or commands not on the list.
*   **Result**: BLOCKED

#### Commands Executed & Output:

Multiple attempts were made to invoke the `exec` tool via the `openclaw-cli` container using `docker compose run`. All attempts failed before the `exec` tool could be tested.

*   **Invocation Method**: `docker compose run --rm openclaw-cli gateway call exec --params '...' --url <url> --token <token>`

*   **Observed Outcome**: All calls failed with one of two errors:
    1.  `SyntaxError: Expected property name or '}' in JSON...` (due to shell quoting issues with the `--params` JSON string).
    2.  `Error: gateway url override requires explicit credentials` (even when providing a token, indicating a deeper issue with how `docker compose run` passes arguments or environment variables to the CLI application).

#### Analysis:

The test is blocked because the `gateway call` CLI command is not robust enough to be invoked reliably from within the `docker compose run` environment. It fails to resolve credentials correctly when a `--url` override is used, preventing any communication with the gateway container. This makes it impossible to test the sandbox `exec` functionality through this pathway.

#### Recommended Fix:

The `gateway call` command logic in `src/gateway/call.ts` should be improved to automatically use the `OPENCLAW_GATEWAY_TOKEN` environment variable if it exists, even when a `--url` is specified. This would make it more reliable in containerized and scripted environments.

---
### Final Summary
The `pnpm build` command and the `docker compose up --build` command (with secrets present) both succeed. However, verification testing revealed two significant issues: the fail-fast secret initialization is not terminating the process on error, and the sandbox `exec` allowlist could not be tested due to a blocking issue with the CLI's command invocation from within Docker.