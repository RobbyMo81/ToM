import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  requestPrivileged: (req: any) => ipcRenderer.invoke('privileged:request', req),
  onEvent: (cb: (ev: any) => void) => ipcRenderer.on('privileged:event', (_ev, ev) => cb(ev)),
})
