import React from 'react'
import { createRoot } from 'react-dom/client'

function App() {
  const [out, setOut] = React.useState('(no result)')

  async function call(type) {
    setOut('calling...')
    try {
      const req = type === 'GO'
        ? { context: { finalGateStatus: 'GO', action: 'test:go', affectedPaths: [] } }
        : { context: { finalGateStatus: 'NO-GO', action: 'test:nogo', affectedPaths: ['src/important.ts'], overrideToken: null } }
      // @ts-ignore
      const res = await window.api.requestPrivileged(req)
      setOut(JSON.stringify(res, null, 2))
    } catch (err) {
      setOut(String(err))
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>ToM Electron (Vite+React)</h1>
      <div>
        <button onClick={() => call('GO')}>Test GO</button>
        <button onClick={() => call('NO-GO')} style={{ marginLeft: 8 }}>Test NO-GO</button>
      </div>
      <h2>Result</h2>
      <pre style={{ background: '#111', color: '#eee', padding: 12 }}>{out}</pre>
    </div>
  )
}

const root = createRoot(document.getElementById('root'))
root.render(<App />)
