# Electron IPC Handler Snapshot Report

- Date: 2026-02-19
- Source file: `electron/main/index.ts`
- Scope: current top section (~first 80 lines) around the IPC handler.

## Snapshot (Current)

```ts
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
const { sanitizeRequestForTelemetry } = require('./sanitize')

// 1. Conditional Spotlight Sidecar Initialization
if (process.env.NODE_ENV === 'development') {
  // Sidecar is a dev-only tool for telemetry and AI debugging
  import('@spotlightjs/sidecar')
    .then(({ setupSidecar }) => {
      setupSidecar().catch((err: any) => console.error('Failed to start Spotlight:', err))
    })
    .catch((err: any) => console.error('Spotlight import failed:', err))
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true, // Critical security: Isolate renderer from Node
      nodeIntegration: false,
    },
  })

  // In dev, we might load from a Vite dev server; in prod, from a local file
  // In development, load Vite dev server; otherwise load built renderer files.
  const startUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '..', 'renderer', 'dist', 'index.html')}`

  win.loadURL(startUrl)
}

app.whenReady().then(createWindow)

// 2. Instrumented IPC Handler
ipcMain.handle('privileged:request', async (event, request) => {
  const { requirePrivilege } = require('../../src/core/governance/privilegedGate')

  try {
    // Sanitize before any telemetry capture or sidecar exposure
    const telemetrySafe = sanitizeRequestForTelemetry(request)
    // Optionally: feed sanitized view to sidecar if needed (sidecar auto-capture will use process-level hooks)

    // Call into the existing privileged gate. Expecting the renderer to provide the full PrivilegedGateContext
    const result = await requirePrivilege(request.context ?? request)
    return { ok: true, result }
  } catch (err: any) {
    // Sanitize error before returning or allowing telemetry to capture it
    const safeError = { message: String(err?.message ?? err), name: err?.name ?? 'Error' }
    return { ok: false, error: safeError }
  }
})
```

## Observed IPC Behavior

- IPC channel: `privileged:request`
- Main-process guard: `requirePrivilege(...)` from `src/core/governance/privilegedGate`
- Input handling: forwards `request.context ?? request` into the privilege gate.
- Telemetry hygiene: calls `sanitizeRequestForTelemetry(request)` prior to potential telemetry capture.
- Error handling: returns sanitized error object `{ message, name }`.
- Window hardening flags present: `contextIsolation: true`, `nodeIntegration: false`.

## Notes

- `telemetrySafe` is created but not explicitly used in this file after assignment.
- Sidecar import remains development-only (`NODE_ENV === 'development'`).
