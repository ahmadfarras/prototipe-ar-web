import type { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  createPgCouponRepository,
  FIND_CAMPAIGN_SQL,
  FIND_CLAIM_SQL,
  INSERT_CLAIM_SQL,
  TAKE_UNIT_SQL,
} from '../src/adapter/pgCouponRepository.ts'
import { FIND_REGISTERED_PRODUCT_SQL } from '../src/adapter/pgExperienceRepository.ts'
import type { CouponRepository } from '../src/usecase/claimCoupon.ts'
import {
  createTestPool,
  insertProduct,
  insertRegisteredProduct,
  insertTarget,
  resetDatabase,
} from './helpers/db.ts'

const ALICE = '11111111-1111-4111-8111-111111111111'
const BOB = '22222222-2222-4222-8222-222222222222'
const PAST = '2020-01-01T00:00:00Z'
const FUTURE = '2099-01-01T00:00:00Z'

let pool: Pool
let repository: CouponRepository

beforeAll(() => {
  pool = createTestPool()
  repository = createPgCouponRepository(pool)
})
beforeEach(() => resetDatabase(pool))
afterAll(() => pool.end())

async function claimsAndCount(campaignId: number) {
  const claims = await pool.query<{ visitor_id: string; code: string }>(
    'SELECT visitor_id, code FROM coupon_claims WHERE campaign_id = $1 ORDER BY id',
    [campaignId],
  )
  const campaign = await pool.query<{ claimed_count: number }>(
    'SELECT claimed_count FROM coupon_campaigns WHERE id = $1',
    [campaignId],
  )
  return { claims: claims.rows, claimedCount: campaign.rows[0]!.claimed_count }
}

describe('pgCouponRepository.claim', () => {
  it('stores a claim and counts it', async () => {
    const { campaignId } = await insertRegisteredProduct(pool, 'book', {
      title: '10% off',
      terms: 'Terms.',
      endsAt: FUTURE,
    })

    expect(await repository.claim('book', ALICE, 'CODE-A')).toEqual({
      kind: 'claimed',
      coupon: {
        code: 'CODE-A',
        title: '10% off',
        terms: 'Terms.',
        endsAt: new Date(FUTURE),
      },
    })
    expect(await claimsAndCount(campaignId)).toEqual({
      claims: [{ visitor_id: ALICE, code: 'CODE-A' }],
      claimedCount: 1,
    })
  })

  it('returns the first code when the same visitor claims again', async () => {
    const { campaignId } = await insertRegisteredProduct(pool, 'book')
    await repository.claim('book', ALICE, 'CODE-A')

    expect(await repository.claim('book', ALICE, 'CODE-B')).toMatchObject({
      kind: 'already_claimed',
      coupon: { code: 'CODE-A' },
    })
    expect(await claimsAndCount(campaignId)).toEqual({
      claims: [{ visitor_id: ALICE, code: 'CODE-A' }],
      claimedCount: 1,
    })
  })

  it('is sold out after the last unit and stores nothing more', async () => {
    const { campaignId } = await insertRegisteredProduct(pool, 'book', {
      totalQuantity: 1,
    })
    await repository.claim('book', ALICE, 'CODE-A')

    expect(await repository.claim('book', BOB, 'CODE-B')).toEqual({
      kind: 'sold_out',
    })
    expect(await claimsAndCount(campaignId)).toEqual({
      claims: [{ visitor_id: ALICE, code: 'CODE-A' }],
      claimedCount: 1,
    })
  })

  it.each([
    ['has not started', { startsAt: '2098-01-01T00:00:00Z', endsAt: FUTURE }],
    ['has ended', { startsAt: PAST, endsAt: '2021-01-01T00:00:00Z' }],
  ])('is not active when the campaign %s', async (_label, dates) => {
    const { campaignId } = await insertRegisteredProduct(pool, 'book', dates)

    expect(await repository.claim('book', ALICE, 'CODE-A')).toEqual({
      kind: 'not_active',
    })
    expect(await claimsAndCount(campaignId)).toEqual({
      claims: [],
      claimedCount: 0,
    })
  })

  it('still returns an earlier claim after the campaign ended', async () => {
    const { campaignId } = await insertRegisteredProduct(pool, 'book')
    await repository.claim('book', ALICE, 'CODE-A')
    await pool.query(
      "UPDATE coupon_campaigns SET ends_at = now() - interval '1 minute' WHERE id = $1",
      [campaignId],
    )

    expect(await repository.claim('book', ALICE, 'CODE-B')).toMatchObject({
      kind: 'already_claimed',
      coupon: { code: 'CODE-A' },
    })
  })

  it('keeps campaigns separate', async () => {
    const book = await insertRegisteredProduct(pool, 'book')
    const box = await insertRegisteredProduct(pool, 'box')

    await repository.claim('book', ALICE, 'CODE-A')
    await repository.claim('box', ALICE, 'CODE-B')

    expect(await claimsAndCount(book.campaignId)).toMatchObject({
      claimedCount: 1,
    })
    expect(await claimsAndCount(box.campaignId)).toEqual({
      claims: [{ visitor_id: ALICE, code: 'CODE-B' }],
      claimedCount: 1,
    })
  })

  it('does not find an unknown product', async () => {
    expect(await repository.claim('missing', ALICE, 'CODE-A')).toEqual({
      kind: 'product_not_found',
    })
  })

  it('does not find a product that has no target', async () => {
    await insertProduct(pool, { slug: 'book' })

    expect(await repository.claim('book', ALICE, 'CODE-A')).toEqual({
      kind: 'product_not_found',
    })
  })

  it('reports a product without a campaign', async () => {
    const productId = await insertProduct(pool, { slug: 'book' })
    await insertTarget(pool, productId)

    expect(await repository.claim('book', ALICE, 'CODE-A')).toEqual({
      kind: 'coupon_not_found',
    })
  })

  it('fails and stores nothing when the code already exists', async () => {
    const { campaignId } = await insertRegisteredProduct(pool, 'book')
    await repository.claim('book', ALICE, 'CODE-A')

    await expect(repository.claim('book', BOB, 'CODE-A')).rejects.toMatchObject(
      { code: '23505' },
    )
    expect(await claimsAndCount(campaignId)).toEqual({
      claims: [{ visitor_id: ALICE, code: 'CODE-A' }],
      claimedCount: 1,
    })
  })

  it('returns every client to the pool', async () => {
    await insertRegisteredProduct(pool, 'book', { totalQuantity: 1 })
    await repository.claim('book', ALICE, 'CODE-A')
    await repository.claim('book', BOB, 'CODE-B')
    await repository.claim('missing', BOB, 'CODE-C')

    expect(pool.idleCount).toBe(pool.totalCount)
  })
})

describe('query plans', () => {
  it.each([
    ['find registered product', FIND_REGISTERED_PRODUCT_SQL, ['book']],
    ['find campaign', FIND_CAMPAIGN_SQL, ['book']],
    ['insert claim', INSERT_CLAIM_SQL, [1, ALICE, 'CODE-A']],
    ['find claim', FIND_CLAIM_SQL, [1, ALICE]],
    ['take unit', TAKE_UNIT_SQL, [1]],
  ])('%s can run on indexes only', async (_label, sql, params) => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN; SET LOCAL enable_seqscan = off')
      const { rows } = await client.query<{ 'QUERY PLAN': string }>(
        `EXPLAIN ${sql}`,
        params,
      )
      const plan = rows.map((row) => row['QUERY PLAN']).join('\n')

      expect(plan).not.toContain('Seq Scan')
    } finally {
      await client.query('ROLLBACK')
      client.release()
    }
  })
})
