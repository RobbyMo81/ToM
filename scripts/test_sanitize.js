const assert = require('assert')
const { sanitizeRequestForTelemetry } = require('../electron/main/sanitize')

function run() {
  // Sensitive override token should be redacted
  const req = { context: { overrideToken: { override_id: 'abc', secret: 'SECRET' }, resolveKey: () => {}, isRevoked: () => false }, whoiam: 'secret' }
  const sanitized = sanitizeRequestForTelemetry(req)
  assert.strictEqual(typeof sanitized.context, 'object')
  assert.deepStrictEqual(sanitized.context.overrideToken, { override_id: 'abc' })
  assert.strictEqual(sanitized.context.resolveKey, undefined)
  assert.strictEqual(sanitized.context.isRevoked, undefined)
  assert.strictEqual(sanitized.whoiam, undefined)

  // Non-object passes through
  assert.strictEqual(sanitizeRequestForTelemetry(null), null)

  console.log('sanitize tests passed')
}

try {
  run()
  process.exit(0)
} catch (err) {
  console.error('sanitize tests failed', err)
  process.exit(2)
}
