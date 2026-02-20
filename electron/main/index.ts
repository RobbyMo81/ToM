import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
const { sanitizeRequestForTelemetry } = require('./sanitize')
const { getConfig } = require('../../src/core/config')
const { RuntimeMemoryStore } = require('../../src/integrations/runtimeMemoryStore')
const { OverrideRevocationStore } = require('../../src/core/governance/overrideRevocation')
const { OverrideReplayLedger } = require('../../src/core/governance/overrideReplayLedger')

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

function parseRendererIntent(request: unknown): { action: string; affectedPaths: string[]; overrideToken: unknown } {
  if (!request || typeof request !== 'object') {
    return { action: '', affectedPaths: [], overrideToken: null }
  }

  const candidate = request as { action?: unknown; affectedPaths?: unknown; overrideToken?: unknown }
  const action = typeof candidate.action === 'string' ? candidate.action : ''
  const affectedPaths = Array.isArray(candidate.affectedPaths)
    ? candidate.affectedPaths.filter((value): value is string => typeof value === 'string')
    : []
  const rawToken = candidate.overrideToken ?? null
  // Hard size cap before the token reaches zod.safeParse. Structured clone
  // cannot produce circular references, so JSON.stringify is safe here.
  const overrideToken = (JSON.stringify(rawToken)?.length ?? 0) < 64_000 ? rawToken : null

  return { action, affectedPaths, overrideToken }
}

function normalizeIpcError(error: unknown): { message: string; name: string } {
  const candidate = error as { code?: string; message?: string }
  if (candidate?.code === 'PRIVILEGE_DENIED') {
    return {
      message: typeof candidate.message === 'string' && candidate.message.length > 0
        ? candidate.message
        : 'Privileged request denied.',
      name: 'PrivilegeDeniedError',
    }
  }

  return { message: 'Privileged request denied.', name: 'Error' }
}

type ContextFetchResult =
  | { ok: true; source: 'api' | 'sqlite-fallback'; data: unknown }
  | { ok: false; reason: string; statusCode?: number }

function shouldUseSqliteFallback(): boolean {
  return process.env.ELECTRON_CONTEXT_SQLITE_FALLBACK === '1'
}

async function fetchLatestContextFromApi(): Promise<ContextFetchResult> {
  const config = getConfig()
  if (!config.api.enabled) {
    return { ok: false, reason: 'api_disabled' }
  }

  const endpoint = `http://${config.api.host}:${config.api.port}/lineage/latest`
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (config.api.token) {
    headers.Authorization = `Bearer ${config.api.token}`
  }

  try {
    const response = await fetch(endpoint, { headers })
    if (!response.ok) {
      return {
        ok: false,
        reason: response.status === 401 ? 'api_unauthorized' : 'api_error',
        statusCode: response.status,
      }
    }

    const data = (await response.json()) as unknown
    return { ok: true, source: 'api', data }
  } catch {
    return { ok: false, reason: 'api_unavailable' }
  }
}

function fetchLatestContextFromSqlite(): ContextFetchResult {
  const config = getConfig()
  const runtimeStore = new RuntimeMemoryStore(config.runtimeDbPath)
  try {
    runtimeStore.bootstrap()
    const summary = runtimeStore.getLatestLineageSummary()
    return { ok: true, source: 'sqlite-fallback', data: summary }
  } catch {
    return { ok: false, reason: 'sqlite_fallback_failed' }
  } finally {
    runtimeStore.close()
  }
}

ipcMain.handle('context:get', async () => {
  const apiResult = await fetchLatestContextFromApi()
  if (apiResult.ok) {
    return apiResult
  }

  if (shouldUseSqliteFallback()) {
    return fetchLatestContextFromSqlite()
  }

  return apiResult
})

// Actions the renderer is permitted to request via IPC.
// Internal-only actions (policy.*, oxide.*) are intentionally excluded; those
// are driven exclusively through the brain.ts HITL cycle path and must never
// be callable from the renderer surface.
const IPC_PERMITTED_ACTIONS = new Set([
  'deploy',
  'local_code_modification',
  'merge_pr',
  'rollback',
  'test:go',   // dev renderer test actions
  'test:nogo',
])

// 2. Hardened IPC Handler
ipcMain.handle('privileged:request', async (_event, request) => {
  const { requirePrivilege } = require('../../src/core/governance/privilegedGate')
  const config = getConfig()
  const runtimeStore = new RuntimeMemoryStore(config.runtimeDbPath)
  const revocationStore = new OverrideRevocationStore()
  const replayLedger = new OverrideReplayLedger()

  const { action, affectedPaths, overrideToken } = parseRendererIntent(request)

  runtimeStore.bootstrap()
  const workflowRunId = runtimeStore.startWorkflowRun({
    workflowName: 'electron.ipc.privileged',
    triggerSource: 'manual',
    initiatedBy: 'renderer',
    context: {
      action,
      affectedPaths,
      hasOverrideToken: Boolean(overrideToken),
    },
  })

  // True while execution is inside (or has passed through) requirePrivilege.
  // requirePrivilege always calls emitDecision before throwing, so when this
  // flag is set the catch block must not write a second audit event.
  let gateEntered = false

  try {
    // Sanitize before any telemetry capture or sidecar exposure
    const telemetrySafe = sanitizeRequestForTelemetry(request)
    void telemetrySafe
    // Optionally: feed sanitized view to sidecar if needed (sidecar auto-capture will use process-level hooks)

    if (!IPC_PERMITTED_ACTIONS.has(action)) {
      throw Object.assign(new Error('Privileged request denied.'), { code: 'PRIVILEGE_DENIED' })
    }

    const maybeOverrideId = (overrideToken as { override_id?: unknown } | null)?.override_id
    const maybeNonce = (overrideToken as { integrity?: { nonce?: unknown } } | null)?.integrity?.nonce

    if (typeof maybeOverrideId === 'string' && typeof maybeNonce === 'string' && replayLedger.hasSeen(maybeOverrideId, maybeNonce)) {
      throw Object.assign(new Error('Override replay detected'), { code: 'PRIVILEGE_DENIED' })
    }

    gateEntered = true
    const result = await requirePrivilege({
      action,
      affectedPaths,
      finalGateStatus: 'NO-GO',
      workspaceRoot: process.cwd(),
      workflowRunId,
      runtimeStore,
      overrideToken: overrideToken ?? undefined,
      resolveKey: (keyId: string) => {
        if (config.overrideAuth.keyId !== keyId) {
          return undefined
        }
        return config.overrideAuth.hmacKey
      },
      isRevoked: (overrideId: string) => revocationStore.isRevoked(overrideId),
    })
    gateEntered = false  // returned normally (grant) — catch must write if markSeen throws

    if (result.overrideId && typeof maybeNonce === 'string') {
      const tokenHash = (overrideToken as { integrity?: { token_hash?: unknown } } | null)?.integrity?.token_hash
      const marked = replayLedger.markSeen(
        result.overrideId,
        maybeNonce,
        typeof tokenHash === 'string' ? tokenHash : '',
        new Date().toISOString(),
      )
      if (!marked) {
        throw Object.assign(new Error('Override replay detected'), { code: 'PRIVILEGE_DENIED' })
      }
    }

    return { ok: true, result }
  } catch (err: unknown) {
    const safeError = normalizeIpcError(err)
    // Skip the audit write when requirePrivilege threw: emitDecision inside it
    // already wrote the denial event. Write for all other throw sites (allowlist,
    // replay pre-check, concurrent-replay post-grant).
    if (!gateEntered) {
      runtimeStore.appendTaskEvent({
        workflowRunId,
        eventType: 'policy',
        eventLevel: 'high',
        message: 'PRIVILEGE_DENIED',
        payload: {
          action,
          reason: safeError.message,
        },
      })
    }
    return { ok: false, error: safeError }
  } finally {
    runtimeStore.close()
  }
})
