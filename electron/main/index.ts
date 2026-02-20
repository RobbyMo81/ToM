import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'

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
function sanitizeRequestForTelemetry(req: any) {
  if (!req || typeof req !== 'object') return req
  const clone = { ...req }
  // Redact known sensitive fields
  if (clone.context && typeof clone.context === 'object') {
    const ctx = { ...clone.context }
    if (ctx.overrideToken) {
      ctx.overrideToken = { override_id: ctx.overrideToken.override_id }
    }
    // remove function values that shouldn't be serialized
    delete ctx.resolveKey
    delete ctx.isRevoked
    clone.context = ctx
  }
  // remove any obvious workspace secrets
  if (clone.whoiam) delete clone.whoiam
  return clone
}

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
