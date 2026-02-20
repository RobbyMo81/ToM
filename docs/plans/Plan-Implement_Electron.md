<!--
Plan: Implement Electron renderer integration for ToM
Location: ./docs/plans/Plan-Implement_Electron.md
Created: 2026-02-19
-->
# Plan — Implement Electron Integration

## Purpose

- Provide a pragmatic, low-risk path to embed a Chromium-based renderer in the ToM workspace using Electron.
- Validate UI/IPC patterns and privileged-operation workflows without the heavy native cost of direct CEF embedding.

## Scope

- Prototype and production-grade guidance for Windows (primary), with notes for cross-platform.
- Integrate Electron as an optional renderer that can be launched by the existing CLI or as a separate process.
- Ensure secure IPC that reuses `privilegedGate()` and existing governance flows (`override*`).

## Recommendation

- Start with an Electron prototype to validate UX and IPC. If later strict CEF is required, use learnings from the Electron prototype to inform CEF native work.

## High-Level Architecture

- `main` (Electron main process): Node runtime that launches BrowserWindow, sets up IPC channels, and exposes a constrained API for privileged requests.
- `preload` script: Exposes a small, secure, context-isolated API to renderer via `contextBridge`.
- `renderer` (web UI): React / Svelte / plain HTML UI that interacts only via the `window.api` surface.
- IPC channel patterns:
  - `ipcRenderer.invoke('privileged:request', payload)` for request/response.
  - `ipcRenderer.on('privileged:event', handler)` for events.
- For privilege-sensitive operations, the main process forwards requests to existing Node code paths that call `privilegedGate()` and the governance modules.

## Prerequisites & Tooling

- Node.js >= 18 (match existing repo toolchain), npm/yarn.
- Windows dev: Visual Studio Build Tools only if you later add native modules — not required for Electron itself.
- Dev deps (example):
  - `electron` (dev dependency for prototyping)
  - `electron-builder` or `electron-forge` for packaging
  - UI stack of choice (`react`, `vite`, etc.)

## Project Layout (suggested)

- `electron/` (new top-level folder)
  - `main/` — Electron main process code (TypeScript or JS)
    - `index.ts` (launcher + IPC handlers)
    - `privileged.ts` (wrapper that delegates to `privilegedGate()` in `src/`)
  - `preload/` — `preload.ts` exposing safe APIs
  - `renderer/` — small web app (React/Vite) for UI
- `package.json` scripts updated to include `electron:dev`, `electron:build`.

## Security Guidelines (must follow)

- Use `contextIsolation: true` in BrowserWindow and avoid `nodeIntegration` in renderer.
- Use a `preload` script with `contextBridge.exposeInMainWorld()` to expose only a minimal API surface.
- Validate every privileged request server-side (in Electron `main`) with `privilegedGate()` before performing state-changing actions.
- Never call governance hooks from the renderer. Renderer only sends intent; the main process performs verification.
- Use origin/URL allowlists if loading remote content; prefer local files served from the app bundle.

### Sidecar / Telemetry (Dev-only)

- Do not bundle `@spotlightjs/sidecar` into production builds. Initialize it only when `NODE_ENV==="development"`.
- Sanitize any data sent to telemetry: redact override tokens (only keep `override_id`), strip function handles like `resolveKey`/`isRevoked`, and remove workspace artifacts such as `.tom-workspace/whoiam.md` contents.
- Ensure `privilegedGate()` and runtime audit events never include raw authentication secrets.

## IPC / Privilege Flow (detailed)

1. Renderer calls: `const result = await window.api.requestPrivileged({ action: 'deploy', payload })`.
2. `preload` forwards to `ipcRenderer.invoke('privileged:request', request)`.
3. `main` receives IPC and maps request to internal handlers.
4. Handler calls existing Node code path (e.g., import `{ requirePrivilege } from '../src/core/governance/privilegedGate'`) and passes the override token or identity context.
5. `requirePrivilege()` executes verification, calls `assertOverridePermits()` and checks replay/revocation stores as implemented.
6. If allowed, perform the action and return audit/result; otherwise return a structured error and log `PRIVILEGE_DENIED` event in runtime DB.

Notes:
- For long-running operations, return an operation id and stream progress via `ipcRenderer.on('privileged:progress', handler)` events.
- All responses should be small, sanitized JSON. Avoid streaming raw log blobs over IPC.

## Scaffolding Steps (quick start)

1. Add a new folder: `electron/`.
2. Install dev deps:

```bash
npm install --save-dev electron@latest electron-builder
```

3. Create `electron/main/index.ts` (example entry):

```ts
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.loadFile(path.join(__dirname, '..', 'renderer', 'dist', 'index.html'))
}

app.whenReady().then(createWindow)

ipcMain.handle('privileged:request', async (event, request) => {
  // import runtime privileged gate helper
  const { requirePrivilege } = require('../../src/core/governance/privilegedGate')
  try {
    const result = await requirePrivilege(request.context, request.action, request.payload)
    return { ok: true, result }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})
```

4. Create `electron/preload/preload.ts`:

```ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  requestPrivileged: (req: any) => ipcRenderer.invoke('privileged:request', req),
  onEvent: (cb: (ev: any) => void) => ipcRenderer.on('privileged:event', (_, ev) => cb(ev))
})
```

5. Create a minimal renderer (use Vite + React or static HTML).

6. Add `package.json` scripts (root or `electron/package.json`):

```json
"scripts": {
  "electron:dev": "vite --config electron/renderer/vite.config.ts & electron . --inspect=5858",
  "electron:build": "electron-builder"
}
```

7. Integrate with CLI: add a `cli` command such as `pnpm run electron:dev` or a `src/cli.ts` subcommand `ui:open` that shells out to `npm run electron:dev`.

## Packaging & CI

- Use `electron-builder` for Windows installer (NSIS) or portable builds. Configure `build` section in root `package.json` or `electron/package.json`.
- CI notes (Windows): use GitHub Actions `runs-on: windows-latest` to run `npm ci` and `npm run electron:build`. For artifact sizes, enable caching for `node_modules` and build output.

## Integration with Governance & Audit

- Reuse `privilegedGate()` internally (see `src/core/governance/privilegedGate.ts`) — do not reimplement policy checks in Electron.
- Ensure all overridden/tokens are verified in main process using `verifyOverrideToken()` and replay/revocation stores.
- Emit audit events to runtime store via existing runtime append APIs so actions launched from UI appear in the same lineage.

## Example Security Checklist (pre-deploy)

- `contextIsolation` enabled and `nodeIntegration` disabled.
- Preload script exposes only minimal API.
- All privileged calls validated via `privilegedGate()`.
- Renderer cannot access filesystem or exec except through guarded API.
- Packaging includes required locale and resource files.
- CI builds are reproducible and signed (if required by your org).

## Testing Recommendations

- Unit test main-process handlers using `spectron` or headless Electron test harnesses.
- Integration tests: spin up Electron in CI (headless) and exercise privileged flows, verifying runtime DB entries.

## Migration Notes (if later switching to direct CEF)

- Preserve the IPC contract (`privileged:request`, `privileged:event`) so a CEF-based main process can implement the same handlers.
- Keep UI code framework-agnostic where possible to ease renderer reuse.

## Time & Effort Estimates

- Prototype (working window + simple IPC + privileged call): 1–2 days.
- Production integration (packaging, CI, tests, security hardening): 1–2 weeks.

## Next Steps (actions)

1. Confirm UI scope (features required in the renderer).
2. I can scaffold the `electron/` folder with minimal `main` + `preload` + sample renderer and `package.json` scripts — approve to proceed.
3. Add CI steps and example `electron-builder` config once prototype is validated.

---
Generated by repo maintainer guidance on 2026-02-19.
