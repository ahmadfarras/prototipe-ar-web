import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'
import type { AppOptions } from '../../src/app/buildApp.ts'
import { createServer } from '../../src/app/server.ts'
import { TEST_DATABASE_URL } from './db.ts'

export type TestApi = { app: FastifyInstance; pool: Pool; url: string }

export async function startApi(
  options: Partial<AppOptions> = {},
): Promise<TestApi> {
  const { app, pool } = await createServer(TEST_DATABASE_URL, {
    cookieSecure: false,
    trustProxy: false,
    logger: false,
    ...options,
  })
  const url = await app.listen({ port: 0, host: '127.0.0.1' })
  return { app, pool, url }
}

export function claimUrl(api: TestApi, slug: string): string {
  return `${api.url}/api/v1/products/${slug}/coupon-claims`
}

export function experienceUrl(api: TestApi, slug: string): string {
  return `${api.url}/api/v1/products/${slug}/experience`
}

export function visitorCookie(response: Response): string {
  const header = response.headers.get('set-cookie') ?? ''
  return header.split(';')[0]!
}

type ApiBody = {
  code: string
  coupon: { status: string }
  error: { code: string; message: string }
}

export function readBody(response: Response): Promise<ApiBody> {
  return response.json() as Promise<ApiBody>
}
