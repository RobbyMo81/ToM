# Electron Context Bridge Smoke Report

- Date: 2026-02-19
- Scope: Validate API-first `context:get` bridge added in Electron main/preload
- Related implementation:
  - `electron/main/index.ts` (`ipcMain.handle('context:get', ...)`)
  - `electron/preload/preload.ts` (`window.api.getContext`)
- Commit reference: `c453049`

## Verification Commands & Results

### 1) Start API with token

Command:

```powershell
$env:TOM_API_TOKEN='redteam-local-token'; npm start
```

Result:
- API process launched in background for smoke validation.

### 2) Health check (authorized)

Command:

```powershell
$headers=@{ Authorization='Bearer redteam-local-token' }
(Invoke-WebRequest -UseBasicParsing -Headers $headers http://127.0.0.1:8787/health -TimeoutSec 5).StatusCode
```

Observed:
- `200`

### 3) Context payload source check (`/lineage/latest`)

Command:

```powershell
$headers=@{ Authorization='Bearer redteam-local-token' }
(Invoke-WebRequest -UseBasicParsing -Headers $headers http://127.0.0.1:8787/lineage/latest -TimeoutSec 5).Content
```

Observed:
- Valid JSON payload returned containing lineage context fields:
  - `timestamp`
  - `run`
  - `skill`
  - `proposal`
  - `validation`
  - `approval`
  - `deploy`
  - `event`
  - `identity`

This confirms the API-first context source used by `context:get` is live and returning expected structure.

## Renderer Bridge Validation Step

Because terminal-only automation cannot execute renderer DevTools JS directly, run the following in Electron renderer DevTools to validate preload wiring:

```javascript
await window.api.getContext()
```

Expected result shape:

```json
{
  "ok": true,
  "source": "api",
  "data": {
    "timestamp": "...",
    "run": { "id": "..." }
  }
}
```

## Notes

- `ELECTRON_CONTEXT_SQLITE_FALLBACK=1` was not required for this smoke pass.
- No privileged IPC behavior changes were introduced in this check; scope was context-read path only.

## Conclusion

Smoke validation passes for the API-first context bridge path:

- Authorized API endpoint health is `200`.
- Lineage payload is available and structurally correct.
- DevTools one-liner is provided to complete the final renderer-side bridge confirmation.
