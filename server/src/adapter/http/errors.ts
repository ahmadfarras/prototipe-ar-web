import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'

const LOCK_TIMEOUT = '55P03'
const STATEMENT_TIMEOUT = '57014'
// node-postgres has no error code for a pool checkout timeout.
const POOL_TIMEOUT_MESSAGE = 'timeout exceeded when trying to connect'

export function sendError(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
): FastifyReply {
  return reply
    .code(status)
    .header('cache-control', 'no-store')
    .send({ error: { code, message } })
}

export function isDatabaseBusy(error: { code?: string; message: string }) {
  return (
    error.code === LOCK_TIMEOUT ||
    error.code === STATEMENT_TIMEOUT ||
    error.message === POOL_TIMEOUT_MESSAGE
  )
}

export function handleError(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  if (error.validation) {
    return sendError(
      reply,
      400,
      'invalid_slug',
      'The product identifier is not valid.',
    )
  }
  if (isDatabaseBusy(error)) {
    request.log.warn(error)
    return sendError(
      reply.header('retry-after', '1'),
      503,
      'try_again',
      'The service is busy. Try again.',
    )
  }

  const status = error.statusCode ?? 500
  if (status === 429) {
    return sendError(reply, 429, 'rate_limited', 'Too many requests.')
  }
  if (status >= 400 && status < 500) {
    return sendError(
      reply,
      status,
      'invalid_request',
      'The request is not valid.',
    )
  }

  request.log.error(error)
  return sendError(reply, 500, 'internal_error', 'Something went wrong.')
}

export function handleNotFound(
  _request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  return sendError(reply, 404, 'not_found', 'Not found.')
}
