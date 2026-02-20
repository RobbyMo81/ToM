// Minimal renderer script to exercise privileged:request via preload `api`.
const output = document.getElementById('output')
const btnGo = document.getElementById('btn-go')
const btnNoGo = document.getElementById('btn-nogo')

function write(v) {
  if (output) output.textContent = JSON.stringify(v, null, 2)
}

btnGo?.addEventListener('click', async () => {
  write({ status: 'calling', type: 'GO' })
  try {
    const req = {
      context: { finalGateStatus: 'GO', action: 'test:go', affectedPaths: [] },
    }
    // @ts-ignore - `api` is injected by preload
    const res = await window.api.requestPrivileged(req)
    write(res)
  } catch (err) {
    write({ error: String(err) })
  }
})

btnNoGo?.addEventListener('click', async () => {
  write({ status: 'calling', type: 'NO-GO' })
  try {
    const req = {
      context: {
        finalGateStatus: 'NO-GO',
        action: 'test:nogo',
        affectedPaths: ['src/important.ts'],
        overrideToken: null,
      },
    }
    // @ts-ignore
    const res = await window.api.requestPrivileged(req)
    write(res)
  } catch (err) {
    write({ error: String(err) })
  }
})
