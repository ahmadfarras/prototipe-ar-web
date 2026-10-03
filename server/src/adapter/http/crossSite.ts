import type { FastifyReply, FastifyRequest } from 'fastify'
import { sendError } from './errors.ts'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// Browsers set Sec-Fetch-Site themselves and pages cannot change it. Clients
// that do not send it (older browsers, scripts) are let through: a script can
// send any header anyway, and rate limiting covers it.
export async function rejectCrossSiteRequest(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply | void> {
  const site = request.headers['sec-fetch-site']
  if (SAFE_METHODS.has(request.method)) return
  if (site === undefined || site === 'same-origin') return

  return sendError(
    reply,
    403,
    'cross_site_request',
    'This request must come from the app itself.',
  )
}
