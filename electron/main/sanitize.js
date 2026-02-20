// Sanitize requests before any telemetry or sidecar exposure.
function sanitizeRequestForTelemetry(req) {
  if (!req || typeof req !== 'object') return req
  const clone = { ...req }
  if (clone.context && typeof clone.context === 'object') {
    const ctx = { ...clone.context }
    if (ctx.overrideToken) {
      ctx.overrideToken = { override_id: ctx.overrideToken.override_id }
    }
    delete ctx.resolveKey
    delete ctx.isRevoked
    clone.context = ctx
  }
  if (clone.whoiam) delete clone.whoiam
  return clone
}

module.exports = { sanitizeRequestForTelemetry }
