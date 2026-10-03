import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import Fastify, { type FastifyInstance } from 'fastify'
import { rejectCrossSiteRequest } from '../adapter/http/crossSite.ts'
import { handleError, handleNotFound } from '../adapter/http/errors.ts'
import { registerRoutes, type RouteDeps } from '../adapter/http/routes.ts'

export type AppOptions = {
  cookieSecure: boolean
  trustProxy: boolean
  logger: boolean
  requestsPerMinute?: number
  claimsPerMinute?: number
}

const BODY_LIMIT_BYTES = 1024
const DEFAULT_REQUESTS_PER_MINUTE = 120
const DEFAULT_CLAIMS_PER_MINUTE = 10

export async function buildApp(
  deps: RouteDeps,
  options: AppOptions,
): Promise<FastifyInstance> {
  const app = Fastify({
    bodyLimit: BODY_LIMIT_BYTES,
    trustProxy: options.trustProxy,
    logger: options.logger && {
      redact: ['req.headers.cookie', 'res.headers["set-cookie"]'],
    },
  })

  app.setErrorHandler(handleError)
  app.setNotFoundHandler(handleNotFound)
  app.addHook('onRequest', rejectCrossSiteRequest)
  app.addHook('onSend', async (_request, reply) => {
    reply.header('x-content-type-options', 'nosniff')
  })

  await app.register(cookie)
  await app.register(rateLimit, {
    max: options.requestsPerMinute ?? DEFAULT_REQUESTS_PER_MINUTE,
    timeWindow: '1 minute',
  })

  registerRoutes(app, deps, {
    cookieSecure: options.cookieSecure,
    claimsPerMinute: options.claimsPerMinute ?? DEFAULT_CLAIMS_PER_MINUTE,
  })

  return app
}
