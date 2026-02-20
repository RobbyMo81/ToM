function pickOwn(dst, src, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(src, key)) {
      dst[key] = src[key]
    }
  }
  return dst
}

// Sanitize requests before any telemetry or sidecar exposure.
function sanitizeRequestForTelemetry(req) {
  if (!req || typeof req !== 'object') return req

  const out = Object.create(null)
  pickOwn(out, req, ['action', 'affectedPaths', 'context', 'overrideToken'])

  if (out.context && typeof out.context === 'object') {
    const ctx = Object.create(null)
    pickOwn(ctx, out.context, ['action', 'affectedPaths', 'finalGateStatus', 'overrideToken'])

    if (ctx.overrideToken && typeof ctx.overrideToken === 'object') {
      ctx.overrideToken = { override_id: ctx.overrideToken.override_id }
    }

    out.context = ctx
  }

  if (out.overrideToken && typeof out.overrideToken === 'object') {
    out.overrideToken = { override_id: out.overrideToken.override_id }
  }

  return out
}

module.exports = { sanitizeRequestForTelemetry }
