import type { FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RouteDeps } from '../adapter/http/routes.ts'
import type { ClaimOutcome } from '../domain/coupon.ts'
import type { ProductExperience } from '../domain/product.ts'
import { buildApp, type AppOptions } from './buildApp.ts'

const VISITOR = '11111111-1111-4111-8111-111111111111'
const EXPERIENCE_URL = '/api/v1/products/book/experience'
const CLAIM_URL = '/api/v1/products/book/coupon-claims'

const experience: ProductExperience = {
  slug: 'book',
  name: 'Book',
  summary: 'Short.',
  description: 'Long.',
  coupon: {
    title: '10% off',
    terms: 'Terms.',
    endsAt: new Date('2027-01-01T00:00:00Z'),
    status: 'available',
  },
}

const coupon = {
  code: 'AAAA-BBBB-CCCC',
  title: '10% off',
  terms: 'Terms.',
  endsAt: new Date('2027-01-01T00:00:00Z'),
}

let app: FastifyInstance

afterEach(() => app.close())

async function setup(
  overrides: Partial<RouteDeps> = {},
  options: Partial<AppOptions> = {},
) {
  const deps = {
    getProductExperience: vi.fn(async () => experience),
    claimCoupon: vi.fn(async (): Promise<ClaimOutcome> => ({
      kind: 'claimed',
      coupon,
    })),
    checkHealth: vi.fn(async () => {}),
    ...overrides,
  }
  app = await buildApp(deps, {
    cookieSecure: false,
    trustProxy: false,
    logger: false,
    ...options,
  })
  return deps
}

function errorCode(response: { json: () => { error?: { code: string } } }) {
  return response.json().error?.code
}

describe('GET /api/v1/health', () => {
  it('is ok when the database answers', async () => {
    await setup()

    const response = await app.inject(`/api/v1/health`)

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('is 503 when the database does not answer', async () => {
    await setup({ checkHealth: () => Promise.reject(new Error('down')) })

    const response = await app.inject(`/api/v1/health`)

    expect(response.statusCode).toBe(503)
    expect(errorCode(response)).toBe('unavailable')
  })
})

describe('GET /api/v1/products/:slug/experience', () => {
  it('returns the experience as cacheable JSON without a cookie', async () => {
    await setup()

    const response = await app.inject(EXPERIENCE_URL)

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      slug: 'book',
      name: 'Book',
      summary: 'Short.',
      description: 'Long.',
      coupon: {
        title: '10% off',
        terms: 'Terms.',
        endsAt: '2027-01-01T00:00:00.000Z',
        status: 'available',
      },
    })
    expect(response.headers['cache-control']).toBe('public, max-age=30')
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['set-cookie']).toBeUndefined()
  })

  it('returns a null coupon', async () => {
    await setup({
      getProductExperience: async () => ({ ...experience, coupon: null }),
    })

    expect((await app.inject(EXPERIENCE_URL)).json().coupon).toBeNull()
  })

  it('is 404 for an unknown product', async () => {
    await setup({ getProductExperience: async () => undefined })

    const response = await app.inject(EXPERIENCE_URL)

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({
      error: {
        code: 'product_not_found',
        message: 'This product is not registered.',
      },
    })
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it.each([
    'Book',
    'a--b',
    '..%2F..%2Fetc',
    "x'%20OR%20'1'='1",
    'a'.repeat(65),
  ])('is 400 for the invalid slug %j', async (slug) => {
    const deps = await setup()

    const response = await app.inject(`/api/v1/products/${slug}/experience`)

    expect(response.statusCode).toBe(400)
    expect(errorCode(response)).toBe('invalid_slug')
    expect(deps.getProductExperience).not.toHaveBeenCalled()
  })
})

describe('POST /api/v1/products/:slug/coupon-claims', () => {
  it('creates a claim and issues the visitor cookie', async () => {
    const deps = await setup()

    const response = await app.inject({ method: 'POST', url: CLAIM_URL })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toEqual({
      code: 'AAAA-BBBB-CCCC',
      title: '10% off',
      terms: 'Terms.',
      endsAt: '2027-01-01T00:00:00.000Z',
    })
    expect(response.headers['cache-control']).toBe('no-store')
    const cookie = response.cookies[0]!
    expect(cookie).toMatchObject({
      name: 'visitor',
      httpOnly: true,
      sameSite: 'Strict',
      path: '/api',
      maxAge: 31_536_000,
    })
    expect(cookie.secure).toBeUndefined()
    expect(deps.claimCoupon).toHaveBeenCalledExactlyOnceWith(
      'book',
      cookie.value,
    )
  })

  it('marks the cookie Secure when configured', async () => {
    await setup({}, { cookieSecure: true })

    const response = await app.inject({ method: 'POST', url: CLAIM_URL })

    expect(response.cookies[0]).toMatchObject({ secure: true })
  })

  it('reuses a valid visitor cookie', async () => {
    const deps = await setup()

    const response = await app.inject({
      method: 'POST',
      url: CLAIM_URL,
      cookies: { visitor: VISITOR },
    })

    expect(response.cookies).toEqual([])
    expect(deps.claimCoupon).toHaveBeenCalledWith('book', VISITOR)
  })

  it.each([
    'not-a-uuid',
    "1' OR '1'='1",
    'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA',
    '',
  ])('replaces the malformed visitor cookie %j', async (value) => {
    const deps = await setup()

    const response = await app.inject({
      method: 'POST',
      url: CLAIM_URL,
      cookies: { visitor: value },
    })

    const issued = response.cookies[0]!.value
    expect(issued).not.toBe(value)
    expect(deps.claimCoupon).toHaveBeenCalledWith('book', issued)
  })

  it('is 200 when the visitor already claimed', async () => {
    await setup({
      claimCoupon: async () => ({ kind: 'already_claimed', coupon }),
    })

    const response = await app.inject({ method: 'POST', url: CLAIM_URL })

    expect(response.statusCode).toBe(200)
    expect(response.json().code).toBe('AAAA-BBBB-CCCC')
  })

  it.each<[ClaimOutcome['kind'], number, string]>([
    ['product_not_found', 404, 'product_not_found'],
    ['coupon_not_found', 404, 'coupon_not_found'],
    ['sold_out', 409, 'coupon_sold_out'],
    ['not_active', 409, 'coupon_not_active'],
  ])('maps %s to %i %s', async (kind, status, code) => {
    await setup({ claimCoupon: async () => ({ kind }) as ClaimOutcome })

    const response = await app.inject({ method: 'POST', url: CLAIM_URL })

    expect(response.statusCode).toBe(status)
    expect(errorCode(response)).toBe(code)
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('is 400 for an invalid slug', async () => {
    const deps = await setup()

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/products/Bad%20Slug/coupon-claims',
    })

    expect(response.statusCode).toBe(400)
    expect(errorCode(response)).toBe('invalid_slug')
    expect(deps.claimCoupon).not.toHaveBeenCalled()
  })

  it('rejects a body over the limit', async () => {
    const deps = await setup()

    const response = await app.inject({
      method: 'POST',
      url: CLAIM_URL,
      payload: { padding: 'x'.repeat(2000) },
    })

    expect(response.statusCode).toBe(413)
    expect(errorCode(response)).toBe('invalid_request')
    expect(deps.claimCoupon).not.toHaveBeenCalled()
  })

  it('limits claims per minute', async () => {
    await setup({}, { claimsPerMinute: 2 })
    const claim = () => app.inject({ method: 'POST', url: CLAIM_URL })

    expect((await claim()).statusCode).toBe(201)
    expect((await claim()).statusCode).toBe(201)
    const limited = await claim()

    expect(limited.statusCode).toBe(429)
    expect(errorCode(limited)).toBe('rate_limited')
  })
})

describe('cross-site requests', () => {
  const claimFrom = (site: string | undefined) =>
    app.inject({
      method: 'POST',
      url: CLAIM_URL,
      headers: site === undefined ? {} : { 'sec-fetch-site': site },
    })

  it.each(['cross-site', 'same-site', 'none'])(
    'refuses a claim sent with Sec-Fetch-Site: %s',
    async (site) => {
      const deps = await setup()

      const response = await claimFrom(site)

      expect(response.statusCode).toBe(403)
      expect(response.json()).toEqual({
        error: {
          code: 'cross_site_request',
          message: 'This request must come from the app itself.',
        },
      })
      expect(response.cookies).toEqual([])
      expect(deps.claimCoupon).not.toHaveBeenCalled()
    },
  )

  it.each(['same-origin', undefined])(
    'accepts a claim sent with Sec-Fetch-Site: %s',
    async (site) => {
      await setup()

      expect((await claimFrom(site)).statusCode).toBe(201)
    },
  )

  it('still serves a read to another site', async () => {
    await setup()

    const response = await app.inject({
      url: EXPERIENCE_URL,
      headers: { 'sec-fetch-site': 'cross-site' },
    })

    expect(response.statusCode).toBe(200)
  })

  it('refuses before the rate limit counts the request', async () => {
    await setup({}, { claimsPerMinute: 1 })

    await claimFrom('cross-site')
    await claimFrom('cross-site')

    expect((await claimFrom('same-origin')).statusCode).toBe(201)
  })
})

describe('errors', () => {
  it('hides the cause of an unexpected error', async () => {
    await setup({
      claimCoupon: () =>
        Promise.reject(new Error('relation "coupon_claims" does not exist')),
    })

    const response = await app.inject({ method: 'POST', url: CLAIM_URL })

    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
      error: { code: 'internal_error', message: 'Something went wrong.' },
    })
    expect(response.body).not.toMatch(/relation|stack|at /)
  })

  it.each([
    ['a lock timeout', Object.assign(new Error('lock'), { code: '55P03' })],
    [
      'a statement timeout',
      Object.assign(new Error('slow'), { code: '57014' }),
    ],
    [
      'a pool checkout timeout',
      new Error('timeout exceeded when trying to connect'),
    ],
  ])('asks the client to retry after %s', async (_label, error) => {
    await setup({ claimCoupon: () => Promise.reject(error) })

    const response = await app.inject({ method: 'POST', url: CLAIM_URL })

    expect(response.statusCode).toBe(503)
    expect(errorCode(response)).toBe('try_again')
    expect(response.headers['retry-after']).toBe('1')
  })

  it('answers an unknown route with the error shape', async () => {
    await setup()

    const response = await app.inject('/api/v1/nope')

    expect(response.statusCode).toBe(404)
    expect(errorCode(response)).toBe('not_found')
  })

  it('limits requests per minute overall', async () => {
    await setup({}, { requestsPerMinute: 1 })

    await app.inject(EXPERIENCE_URL)
    const limited = await app.inject(EXPERIENCE_URL)

    expect(limited.statusCode).toBe(429)
    expect(errorCode(limited)).toBe('rate_limited')
  })
})
