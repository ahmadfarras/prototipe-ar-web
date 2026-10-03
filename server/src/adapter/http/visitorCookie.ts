import { randomUUID } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'

const COOKIE_NAME = 'visitor'
const ONE_YEAR_SECONDS = 31_536_000
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export function readOrIssueVisitorId(
  request: FastifyRequest,
  reply: FastifyReply,
  secure: boolean,
): string {
  const existing = request.cookies[COOKIE_NAME]
  if (existing && UUID_PATTERN.test(existing)) return existing

  const visitorId = randomUUID()
  reply.setCookie(COOKIE_NAME, visitorId, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/api',
    maxAge: ONE_YEAR_SECONDS,
    secure,
  })
  return visitorId
}
