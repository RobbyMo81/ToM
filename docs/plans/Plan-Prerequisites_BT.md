The IPC red-team test **requires the system to be running**, but in a controlled configuration.

Below are the exact prerequisites. Keep this tight; don’t over-prepare.

---

# Red-Team IPC Test — Prerequisites

## 1️⃣ Runtime State

### Required:

* Electron app running (main process active).
* IPC handlers registered (`ipcMain.handle('privileged:request', ...)` path loaded).
* ToM backend initialized (runtime store accessible).

### Not required:

* Active override token.
* GO gate state.
* External services (Brave, GitHub, etc.).

You are testing **privilege enforcement**, not functional correctness.

---

## 2️⃣ Build & Environment

Before starting:

```bash
npm run build
npm run lint
```

Then launch Electron in **development mode**:

```bash
npm run electron:dev
```

Or however your project starts the main process.

---

## 3️⃣ Environment Variables

Ensure these are set:

* `TOM_API_TOKEN`
* `TOM_OVERRIDE_HMAC_KEY_B64`
* Any required runtime DB path env vars

The override system must be active so that enforcement code paths are live.

---

## 4️⃣ Database / Runtime Store

The runtime DB must:

* Be writable
* Not be a production database
* Contain at least one workflow run or allow creation

You want a clean environment so that replay/revocation behavior is deterministic.

---

## 5️⃣ DevTools Access (Critical)

You must be able to open **Electron DevTools** in the renderer process.

This is your attack surface.

Confirm:

* `window.electron` or preload bridge exists.
* Renderer can attempt to call privileged IPC handler manually.

---

## 6️⃣ Logging Enabled

Enable verbose logging if possible:

* Console logs visible
* Governance decision logs visible
* Audit events visible

You want to observe denial paths in real time.

---

## 7️⃣ Test Configuration (Recommended)

To reduce noise:

* Disable background cron cycles if possible.
* Run in isolated workspace.
* Ensure no legitimate privileged workflows running.

---

# System Readiness Checklist

| Check                        | Required |
| ---------------------------- | -------- |
| Electron main running        | ✔        |
| IPC handler registered       | ✔        |
| DevTools accessible          | ✔        |
| Runtime store writable       | ✔        |
| Override enforcement enabled | ✔        |
| No production data           | ✔        |

---

Once all are confirmed, I will provide:

* Threat model
* Attack vectors
* Exact IPC payload examples
* Expected denial responses
* Escalation criteria

Confirm these prerequisites are satisfied in a markdown report, and we will proceed with the adversarial phase.
