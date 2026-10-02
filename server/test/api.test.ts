import type { Pool } from 'pg'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
import {
  claimUrl,
  experienceUrl,
  readBody,
  startApi,
  visitorCookie,
  type TestApi,
} from './helpers/api.ts'
import {
  countRows,
  createTestPool,
  insertProduct,
  insertRegisteredProduct,
  insertTarget,
  resetDatabase,
} from './helpers/db.ts'

let db: Pool
let api: TestApi

beforeAll(() => {
  db = createTestPool()
})
beforeEach(async () => {
  await resetDatabase(db)
  api = await startApi()
})
afterEach(() => api.app.close())
afterAll(() => db.end())

function claim(slug: string, cookie?: string) {
  return fetch(claimUrl(api, slug), {
    method: 'POST',
    headers: cookie ? { cookie } : {},
  })
}

async function claimedCount(campaignId: number) {
  const { rows } = await db.query<{ claimed_count: number }>(
    'SELECT claimed_count FROM coupon_campaigns WHERE id = $1',
    [campaignId],
  )
  return rows[0]!.claimed_count
}

describe('GET /api/v1/health', () => {
  it('answers ok over real HTTP', async () => {
    const response = await fetch(`${api.url}/api/v1/health`)

    expect(response.status).toBe(200)
    expect(await readBody(response)).toEqual({ status: 'ok' })
  })
})

describe('GET /api/v1/products/:slug/experience', () => {
  it('returns what the database holds', async () => {
    await insertRegisteredProduct(db, 'book', {
      title: '10% off',
      terms: 'Terms.',
      totalQuantity: 1,
      endsAt: '2099-01-01T00:00:00Z',
    })

    const response = await fetch(experienceUrl(api, 'book'))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('public, max-age=30')
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(await readBody(response)).toEqual({
      slug: 'book',
      name: 'Sample Book',
      summary: 'A sample summary.',
      description: 'A sample description.',
      coupon: {
        title: '10% off',
        terms: 'Terms.',
        endsAt: '2099-01-01T00:00:00.000Z',
        status: 'available',
      },
    })
  })

  it('reports sold out once the stock is gone', async () => {
    await insertRegisteredProduct(db, 'book', { totalQuantity: 1 })
    await claim('book')

    const body = await readBody(await fetch(experienceUrl(api, 'book')))

    expect(body.coupon.status).toBe('sold_out')
  })

  it('is 404 for an unknown product and for one without a target', async () => {
    await insertProduct(db, { slug: 'unregistered' })

    for (const slug of ['missing', 'unregistered']) {
      const response = await fetch(experienceUrl(api, slug))

      expect(response.status).toBe(404)
      expect((await readBody(response)).error.code).toBe('product_not_found')
    }
  })

  it('is 400 for an invalid slug', async () => {
    const response = await fetch(experienceUrl(api, 'Not%20Valid'))

    expect(response.status).toBe(400)
    expect((await readBody(response)).error.code).toBe('invalid_slug')
  })
})

describe('POST /api/v1/products/:slug/coupon-claims', () => {
  it('stores one claim and returns the same code on a repeat', async () => {
    const { campaignId } = await insertRegisteredProduct(db, 'book')

    const first = await claim('book')
    const cookie = visitorCookie(first)
    const firstBody = await readBody(first)
    const second = await claim('book', cookie)
    const secondBody = await readBody(second)

    expect(first.status).toBe(201)
    expect(first.headers.get('set-cookie')).toMatch(
      /^visitor=[0-9a-f-]{36}; Max-Age=31536000; Path=\/api; HttpOnly; SameSite=Strict$/,
    )
    expect(firstBody.code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/)
    expect(second.status).toBe(200)
    expect(second.headers.get('set-cookie')).toBeNull()
    expect(secondBody).toEqual(firstBody)

    const { rows } = await db.query(
      'SELECT campaign_id::int, visitor_id, code FROM coupon_claims',
    )
    expect(rows).toEqual([
      {
        campaign_id: campaignId,
        visitor_id: cookie.replace('visitor=', ''),
        code: firstBody.code,
      },
    ])
    expect(await claimedCount(campaignId)).toBe(1)
  })

  it('gives different visitors different codes', async () => {
    const { campaignId } = await insertRegisteredProduct(db, 'book')

    const first = await readBody(await claim('book'))
    const second = await readBody(await claim('book'))

    expect(second.code).not.toBe(first.code)
    expect(await countRows(db, 'coupon_claims')).toBe(2)
    expect(await claimedCount(campaignId)).toBe(2)
  })

  it('is 409 when sold out and stores nothing', async () => {
    const { campaignId } = await insertRegisteredProduct(db, 'book', {
      totalQuantity: 1,
    })
    await claim('book')

    const response = await claim('book')

    expect(response.status).toBe(409)
    expect((await readBody(response)).error.code).toBe('coupon_sold_out')
    expect(await countRows(db, 'coupon_claims')).toBe(1)
    expect(await claimedCount(campaignId)).toBe(1)
  })

  it('is 409 when the campaign is over and stores nothing', async () => {
    const { campaignId } = await insertRegisteredProduct(db, 'book', {
      startsAt: '2020-01-01T00:00:00Z',
      endsAt: '2021-01-01T00:00:00Z',
    })

    const response = await claim('book')

    expect(response.status).toBe(409)
    expect((await readBody(response)).error.code).toBe('coupon_not_active')
    expect(await countRows(db, 'coupon_claims')).toBe(0)
    expect(await claimedCount(campaignId)).toBe(0)
  })

  it('is 404 for an unknown product', async () => {
    const response = await claim('missing')

    expect(response.status).toBe(404)
    expect((await readBody(response)).error.code).toBe('product_not_found')
  })

  it('is 404 for a product without a campaign', async () => {
    await insertTarget(db, await insertProduct(db, { slug: 'book' }))

    const response = await claim('book')

    expect(response.status).toBe(404)
    expect((await readBody(response)).error.code).toBe('coupon_not_found')
  })

  it.each([
    '..%2F..%2Fetc',
    "book'%3B%20DROP%20TABLE%20coupon_claims%3B--",
    'a%00b',
  ])('is 400 for the hostile slug %j and writes nothing', async (slug) => {
    await insertRegisteredProduct(db, 'book')

    const response = await claim(slug)

    expect(response.status).toBe(400)
    expect((await readBody(response)).error.code).toBe('invalid_slug')
    expect(await countRows(db, 'coupon_claims')).toBe(0)
  })

  it('ignores a forged visitor cookie and issues a real one', async () => {
    await insertRegisteredProduct(db, 'book')

    const response = await claim('book', "visitor=1' OR '1'='1")

    expect(response.status).toBe(201)
    const { rows } = await db.query<{ visitor_id: string }>(
      'SELECT visitor_id FROM coupon_claims',
    )
    expect(`visitor=${rows[0]!.visitor_id}`).toBe(visitorCookie(response))
  })

  it('refuses a claim sent by a page on another site and writes nothing', async () => {
    const { campaignId } = await insertRegisteredProduct(db, 'book')

    const response = await fetch(claimUrl(api, 'book'), {
      method: 'POST',
      headers: {
        origin: 'https://evil.example',
        'sec-fetch-site': 'cross-site',
        'content-type': 'text/plain',
      },
      body: 'x',
    })

    expect(response.status).toBe(403)
    expect((await readBody(response)).error.code).toBe('cross_site_request')
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(await countRows(db, 'coupon_claims')).toBe(0)
    expect(await claimedCount(campaignId)).toBe(0)
  })

  it('rejects a body over 1 KB and writes nothing', async () => {
    await insertRegisteredProduct(db, 'book')

    const response = await fetch(claimUrl(api, 'book'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ padding: 'x'.repeat(2000) }),
    })

    expect(response.status).toBe(413)
    expect((await readBody(response)).error.code).toBe('invalid_request')
    expect(await countRows(db, 'coupon_claims')).toBe(0)
  })

  it('answers the 11th claim request in a minute with 429', async () => {
    await insertRegisteredProduct(db, 'book', { totalQuantity: 100 })

    const statuses: number[] = []
    for (let attempt = 0; attempt < 11; attempt += 1) {
      statuses.push((await claim('book')).status)
    }

    expect(statuses).toEqual([...Array(10).fill(201), 429])
    expect(await countRows(db, 'coupon_claims')).toBe(10)
  })
})
