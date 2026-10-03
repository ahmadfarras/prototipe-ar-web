import type { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migrate } from '../src/app/migrate.ts'
import {
  assertDisposableDatabase,
  countRows,
  createTestPool,
  insertCampaign,
  insertProduct,
  insertTarget,
  resetDatabase,
  TEST_DATABASE_URL,
} from './helpers/db.ts'

const UNIQUE_VIOLATION = '23505'
const CHECK_VIOLATION = '23514'
const VISITOR = '11111111-1111-4111-8111-111111111111'

let pool: Pool

beforeAll(() => {
  pool = createTestPool()
})
beforeEach(() => resetDatabase(pool))
afterAll(() => pool.end())

function insertClaim(campaignId: number, visitorId: string, code: string) {
  return pool.query(
    'INSERT INTO coupon_claims (campaign_id, visitor_id, code) VALUES ($1, $2, $3)',
    [campaignId, visitorId, code],
  )
}

describe('assertDisposableDatabase', () => {
  it.each(['ar_test', 'ar_e2e'])('allows %s', (name) => {
    expect(() => assertDisposableDatabase(name)).not.toThrow()
  })

  it.each(['ar_dev', 'postgres', 'test_ar', ''])('refuses %j', (name) => {
    expect(() => assertDisposableDatabase(name)).toThrow('Refusing to reset')
  })
})

describe('products', () => {
  it.each(['Upper', 'has space', '-lead', 'trail-', 'a--b', '../etc', ''])(
    'rejects the slug %j',
    async (slug) => {
      await expect(insertProduct(pool, { slug })).rejects.toMatchObject({
        code: CHECK_VIOLATION,
      })
    },
  )

  it('rejects a slug longer than 64 characters', async () => {
    await expect(
      insertProduct(pool, { slug: 'a'.repeat(65) }),
    ).rejects.toMatchObject({ code: CHECK_VIOLATION })
    await expect(
      insertProduct(pool, { slug: 'a'.repeat(64) }),
    ).resolves.toBeTypeOf('number')
  })

  it('rejects a duplicate slug', async () => {
    await insertProduct(pool, { slug: 'book' })

    await expect(insertProduct(pool, { slug: 'book' })).rejects.toMatchObject({
      code: UNIQUE_VIOLATION,
    })
  })

  it('removes the targets of a deleted product', async () => {
    const productId = await insertProduct(pool)
    await insertTarget(pool, productId, 0)
    await insertTarget(pool, productId, 1)

    await pool.query('DELETE FROM products WHERE id = $1', [productId])

    expect(await countRows(pool, 'ar_targets')).toBe(0)
  })
})

describe('ar_targets', () => {
  it('rejects a duplicate target index', async () => {
    const productId = await insertProduct(pool)
    await insertTarget(pool, productId, 0, 'front.jpg')

    await expect(
      insertTarget(pool, productId, 0, 'back.jpg'),
    ).rejects.toMatchObject({ code: UNIQUE_VIOLATION })
  })

  it('rejects a negative target index', async () => {
    const productId = await insertProduct(pool)

    await expect(insertTarget(pool, productId, -1)).rejects.toMatchObject({
      code: CHECK_VIOLATION,
    })
  })
})

describe('coupon_campaigns', () => {
  it('rejects a second campaign for the same product', async () => {
    const productId = await insertProduct(pool)
    await insertCampaign(pool, productId)

    await expect(insertCampaign(pool, productId)).rejects.toMatchObject({
      code: UNIQUE_VIOLATION,
    })
  })

  it('rejects more claims than the quantity', async () => {
    const productId = await insertProduct(pool)
    const campaignId = await insertCampaign(pool, productId, {
      totalQuantity: 2,
      claimedCount: 2,
    })

    await expect(
      pool.query(
        'UPDATE coupon_campaigns SET claimed_count = claimed_count + 1 WHERE id = $1',
        [campaignId],
      ),
    ).rejects.toMatchObject({ code: CHECK_VIOLATION })
  })

  it('rejects an end that is not after the start', async () => {
    const productId = await insertProduct(pool)

    await expect(
      insertCampaign(pool, productId, {
        startsAt: '2026-01-01T00:00:00Z',
        endsAt: '2026-01-01T00:00:00Z',
      }),
    ).rejects.toMatchObject({ code: CHECK_VIOLATION })
  })

  it('rejects a quantity of zero', async () => {
    const productId = await insertProduct(pool)

    await expect(
      insertCampaign(pool, productId, { totalQuantity: 0 }),
    ).rejects.toMatchObject({ code: CHECK_VIOLATION })
  })
})

describe('coupon_claims', () => {
  it('rejects a second claim by the same visitor', async () => {
    const campaignId = await insertCampaign(pool, await insertProduct(pool))
    await insertClaim(campaignId, VISITOR, 'CODE-1')

    await expect(
      insertClaim(campaignId, VISITOR, 'CODE-2'),
    ).rejects.toMatchObject({ code: UNIQUE_VIOLATION })
  })

  it('rejects a duplicate code', async () => {
    const campaignId = await insertCampaign(pool, await insertProduct(pool))
    await insertClaim(campaignId, VISITOR, 'CODE-1')

    await expect(
      insertClaim(campaignId, '22222222-2222-4222-8222-222222222222', 'CODE-1'),
    ).rejects.toMatchObject({ code: UNIQUE_VIOLATION })
  })
})

describe('migrations', () => {
  it('roll back and reapply cleanly', async () => {
    const quiet = () => {}

    await migrate(TEST_DATABASE_URL, 'down', quiet)
    const { rows } = await pool.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> 'schema_migrations'",
    )
    await migrate(TEST_DATABASE_URL, 'up', quiet)

    expect(rows).toEqual([])
    expect(await countRows(pool, 'products')).toBe(0)
  })
})
