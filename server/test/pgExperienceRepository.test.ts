import type { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createPgExperienceRepository } from '../src/adapter/pgExperienceRepository.ts'
import {
  createTestPool,
  insertCampaign,
  insertProduct,
  insertTarget,
  resetDatabase,
} from './helpers/db.ts'

let pool: Pool

beforeAll(() => {
  pool = createTestPool()
})
beforeEach(() => resetDatabase(pool))
afterAll(() => pool.end())

describe('pgExperienceRepository.findBySlug', () => {
  it('returns a registered product with its campaign', async () => {
    const productId = await insertProduct(pool, {
      slug: 'book',
      name: 'Book',
      summary: 'Short.',
      description: 'Long.',
    })
    await insertTarget(pool, productId)
    await insertCampaign(pool, productId, {
      title: '10% off',
      terms: 'Terms.',
      totalQuantity: 5,
      claimedCount: 2,
      startsAt: '2026-01-01T00:00:00Z',
      endsAt: '2027-01-01T00:00:00Z',
    })

    expect(await createPgExperienceRepository(pool).findBySlug('book')).toEqual(
      {
        slug: 'book',
        name: 'Book',
        summary: 'Short.',
        description: 'Long.',
        campaign: {
          title: '10% off',
          terms: 'Terms.',
          totalQuantity: 5,
          claimedCount: 2,
          startsAt: new Date('2026-01-01T00:00:00Z'),
          endsAt: new Date('2027-01-01T00:00:00Z'),
        },
      },
    )
  })

  it('returns a null campaign when the product has none', async () => {
    const productId = await insertProduct(pool, { slug: 'book' })
    await insertTarget(pool, productId)

    expect(
      await createPgExperienceRepository(pool).findBySlug('book'),
    ).toMatchObject({ slug: 'book', campaign: null })
  })

  it('returns one row for a product with two targets', async () => {
    const productId = await insertProduct(pool, { slug: 'book' })
    await insertTarget(pool, productId, 0)
    await insertTarget(pool, productId, 1)

    expect(
      await createPgExperienceRepository(pool).findBySlug('book'),
    ).toMatchObject({ slug: 'book' })
  })

  it('does not find a product that has no target', async () => {
    await insertProduct(pool, { slug: 'book' })

    expect(
      await createPgExperienceRepository(pool).findBySlug('book'),
    ).toBeUndefined()
  })

  it('does not find an unknown slug', async () => {
    expect(
      await createPgExperienceRepository(pool).findBySlug('missing'),
    ).toBeUndefined()
  })
})
