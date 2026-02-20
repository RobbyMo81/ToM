const assert = require('assert')
const { sanitizeRequestForTelemetry } = require('../electron/main/sanitize')

function run() {
  // Sensitive override token should be redacted
  const req = {
    action: 'policy.create_proposal',
    context: {
      action: 'policy.create_proposal',
      affectedPaths: ['memory/'],
      finalGateStatus: 'NO-GO',
      overrideToken: { override_id: 'abc', secret: 'SECRET' },
      resolveKey: () => {},
      isRevoked: () => false,
    },
    overrideToken: { override_id: 'abc', secret: 'SECRET' },
    whoiam: 'secret',
    injected: 'should-not-pass',
  }
  const sanitized = sanitizeRequestForTelemetry(req)
  assert.strictEqual(Object.getPrototypeOf(sanitized), null)
  assert.strictEqual(typeof sanitized.context, 'object')
  assert.strictEqual(Object.getPrototypeOf(sanitized.context), null)
  assert.deepStrictEqual(sanitized.context.overrideToken, { override_id: 'abc' })
  assert.deepStrictEqual(sanitized.overrideToken, { override_id: 'abc' })
  assert.strictEqual(sanitized.context.resolveKey, undefined)
  assert.strictEqual(sanitized.context.isRevoked, undefined)
  assert.strictEqual(sanitized.whoiam, undefined)
  assert.strictEqual(sanitized.injected, undefined)

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
