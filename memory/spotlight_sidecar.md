---
component_name: Spotlight Sidecar (dev-only)
last_updated_by: automation
version_impact: minor
---

# Spotlight Sidecar — As-Built Entry

Purpose:

- Dev-only telemetry and AI inspection sidecar used during local development to observe runtime events, privileged request failures, and to provide an MCP server for research assistants.

Key points:

- The sidecar is a development-only dependency (`@spotlightjs/sidecar`) and must NOT be bundled into production Electron builds.
- Initialization is conditional on `NODE_ENV === 'development'`.
- The Electron main process calls:

```
if (process.env.NODE_ENV === 'development') {
  import('@spotlightjs/sidecar').then(({ setupSidecar }) => setupSidecar())
}
```

- Sanitization: runtime telemetry must never include raw authentication tokens, secrets, or `.tom-workspace/whoiam.md` contents. Override tokens should be redacted to only include `override_id` when exposed to telemetry.

Startup / dev commands:

```bash
# run electron in dev mode with sidecar enabled
npm run electron:dev

# (or) ensure NODE_ENV=development and start the app
cross-env NODE_ENV=development electron .
```

Operational notes:

- Use the sidecar to inspect failed `privileged:request` calls in real time; ensure logs sent to the sidecar are sanitized as described above.
- Do not commit sidecar configuration or API keys into the repository.
- This file is indexed into the as-built vector DB so builders can query how the sidecar is used and configured in development workflows.
