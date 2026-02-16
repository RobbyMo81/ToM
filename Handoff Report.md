Agent Prompt — Run Hardening Verification Tests + Produce Report
You will run a focused verification of the two hardening changes:

Mounted secrets (fail-fast at gateway startup)
Sandbox exec allowlist (argv required; shells denied)
Constraints
Do not introduce new code changes unless a test reveals a defect. If a defect is found, propose the minimal fix, but do not implement unless instructed.
Do not print or log any secret values.
Capture exact commands run and key output lines (redact secrets if present).
Test Plan
A) Pre-flight
Confirm working tree status:
git status --porcelain
Confirm build passes:
pnpm build
B) Secrets: startup success case
Create a temporary secrets directory on the host and mount/point the gateway at it.

Create 3 files with non-empty placeholder values:
openai_api_key
anthropic_api_key
gemini_api_key
Values must be dummy strings (do not use real keys).
Start gateway with:

OPENCLAW_SECRETS_DIR=<temp_dir> set in the gateway environment
Start via the normal docker compose flow you’ve been using.
Verify:
Gateway container starts successfully
Logs show normal startup (no missing secret errors)
C) Secrets: fail-fast missing secret
Stop gateway.
Remove or rename exactly one required secret file (e.g., gemini_api_key).
Start gateway again with the same OPENCLAW_SECRETS_DIR.
Verify:
Gateway fails immediately at startup
Error message clearly indicates:
which secret is missing/unreadable
the expected full path
mentions OPENCLAW_SECRETS_DIR
Confirm no secret contents were printed.
D) Sandbox exec: allow/deny
Run sandboxed exec calls that cover:

Allowed:
argv=["python3","-V"]
argv=["git","--version"]
Denied:
argv=["bash","-lc","whoami"] (must fail allowlist)
A sandbox exec call without argv (must fail with “argv required” error)
Document the exact invocation method used to issue sandbox exec calls (CLI, config, or internal test harness) and the observed outcomes.

Final Deliverable (MANDATORY)
At the end, output a single Markdown report titled:

Hardening Verification Report (Mounted Secrets + Sandbox Exec Allowlist)

Include:

Environment (OS, docker compose version, node/pnpm versions)
Commands executed
Results for each test (Pass/Fail)
Key log excerpts (sanitized)
If any failures: suspected root cause + minimal recommended fix (no implementation unless requested)
