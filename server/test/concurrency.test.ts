import type { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  claimUrl,
  experienceUrl,
  readBody,
  startApi,
  visitorCookie,
  type TestApi,
} from './helpers/api.ts'
import {
  createTestPool,
  insertRegisteredProduct,
  resetDatabase,
} from './helpers/db.ts'

const UNLIMITED = 1_000_000

let db: Pool
let api: TestApi
let deadlocksBefore: number

async function deadlockCount(): Promise<number> {
  const { rows } = await db.query<{ deadlocks: string }>(
    'SELECT deadlocks FROM pg_stat_database WHERE datname = current_database()',
  )
  return Number(rows[0]!.deadlocks)
}

beforeAll(async () => {
  db = createTestPool()
  deadlocksBefore = await deadlockCount()
  api = await startApi({
    requestsPerMinute: UNLIMITED,
    claimsPerMinute: UNLIMITED,
  })
})
beforeEach(() => resetDatabase(db))
afterAll(async () => {
  await api.app.close()
  await db.end()
})

function claim(slug: string, cookie?: string) {
  return fetch(claimUrl(api, slug), {
    method: 'POST',
    headers: cookie ? { cookie } : {},
  })
}

function countByStatus(responses: Response[]): Record<number, number> {
  const counts: Record<number, number> = {}
  for (const { status } of responses) counts[status] = (counts[status] ?? 0) + 1
  return counts
}

async function storedState(campaignId: number) {
  const { rows } = await db.query<{
    claims: number
    codes: number
    visitors: number
    claimed_count: number
  }>(
    `SELECT count(cl.id)::int AS claims,
            count(DISTINCT cl.code)::int AS codes,
            count(DISTINCT cl.visitor_id)::int AS visitors,
            c.claimed_count
     FROM coupon_campaigns c
     LEFT JOIN coupon_claims cl ON cl.campaign_id = c.id
     WHERE c.id = $1
     GROUP BY c.id`,
    [campaignId],
  )
  return rows[0]
}

describe('concurrent claims', () => {
  it('hands out exactly the quantity to 200 simultaneous visitors', async () => {
    const { campaignId } = await insertRegisteredProduct(db, 'book', {
      totalQuantity: 50,
    })

    const responses = await Promise.all(
      Array.from({ length: 200 }, () => claim('book')),
    )

    expect(countByStatus(responses)).toEqual({ 201: 50, 409: 150 })
    expect(await storedState(campaignId)).toEqual({
      claims: 50,
      codes: 50,
      visitors: 50,
      claimed_count: 50,
    })
  })

  it('gives one visitor one code for 50 simultaneous requests', async () => {
    const { campaignId } = await insertRegisteredProduct(db, 'book')
    const other = await insertRegisteredProduct(db, 'box')
    const cookie = visitorCookie(await claim('box'))

    const responses = await Promise.all(
      Array.from({ length: 50 }, () => claim('book', cookie)),
    )
    const codes = new Set(
      await Promise.all(responses.map(async (r) => (await readBody(r)).code)),
    )

    expect(countByStatus(responses)).toEqual({ 201: 1, 200: 49 })
    expect(codes.size).toBe(1)
    expect(await storedState(campaignId)).toEqual({
      claims: 1,
      codes: 1,
      visitors: 1,
      claimed_count: 1,
    })
    expect(await storedState(other.campaignId)).toMatchObject({
      claims: 1,
      claimed_count: 1,
    })
  })

  it('keeps two campaigns and readers consistent under mixed load', async () => {
    const book = await insertRegisteredProduct(db, 'book', {
      totalQuantity: 30,
    })
    const box = await insertRegisteredProduct(db, 'box', { totalQuantity: 30 })

    const [bookClaims, boxClaims, reads] = await Promise.all([
      Promise.all(Array.from({ length: 40 }, () => claim('book'))),
      Promise.all(Array.from({ length: 40 }, () => claim('box'))),
      Promise.all(
        Array.from({ length: 20 }, (_, index) =>
          fetch(experienceUrl(api, index % 2 ? 'book' : 'box')),
        ),
      ),
    ])

    expect(countByStatus(bookClaims)).toEqual({ 201: 30, 409: 10 })
    expect(countByStatus(boxClaims)).toEqual({ 201: 30, 409: 10 })
    expect(countByStatus(reads)).toEqual({ 200: 20 })
    for (const { campaignId } of [book, box]) {
      expect(await storedState(campaignId)).toEqual({
        claims: 30,
        codes: 30,
        visitors: 30,
        claimed_count: 30,
      })
    }
  })

  it('leaves no deadlock and no checked-out connection', async () => {
    expect(api.pool.waitingCount).toBe(0)
    expect(api.pool.idleCount).toBe(api.pool.totalCount)

    // Backends report their statistics when they exit.
    await api.app.close()

    await expect.poll(deadlockCount).toBe(deadlocksBefore)
  })
})
