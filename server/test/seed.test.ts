import type { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import seed from '../seed/seed.json' with { type: 'json' }
import { seedDatabase } from '../seed/seed.ts'
import { countRows, createTestPool, resetDatabase } from './helpers/db.ts'

let pool: Pool

beforeAll(() => {
  pool = createTestPool()
})
beforeEach(() => resetDatabase(pool))
afterAll(() => pool.end())

async function rowCounts() {
  return {
    products: await countRows(pool, 'products'),
    targets: await countRows(pool, 'ar_targets'),
    campaigns: await countRows(pool, 'coupon_campaigns'),
  }
}

it('creates every product, target and campaign of the seed file', async () => {
  await seedDatabase(pool, seed)

  expect(await rowCounts()).toEqual({ products: 2, targets: 2, campaigns: 2 })
  const { rows } = await pool.query(
    `SELECT p.slug, t.target_index, t.image_file
     FROM ar_targets t JOIN products p ON p.id = t.product_id
     ORDER BY t.target_index`,
  )
  expect(rows).toEqual([
    { slug: 'wizard-of-oz', target_index: 0, image_file: 'wizard-of-oz.jpg' },
    { slug: 'peter-rabbit', target_index: 1, image_file: 'peter-rabbit.jpg' },
  ])
})

it('can run twice and keeps claimed counts', async () => {
  await seedDatabase(pool, seed)
  await pool.query('UPDATE coupon_campaigns SET claimed_count = 1')

  await seedDatabase(pool, seed)

  expect(await rowCounts()).toEqual({ products: 2, targets: 2, campaigns: 2 })
  const { rows } = await pool.query(
    'SELECT DISTINCT claimed_count FROM coupon_campaigns',
  )
  expect(rows).toEqual([{ claimed_count: 1 }])
})

it('updates a product that changed in the seed file', async () => {
  await seedDatabase(pool, seed)
  const [first, ...rest] = seed.products

  await seedDatabase(pool, {
    products: [{ ...first!, name: 'Renamed' }, ...rest],
  })

  const { rows } = await pool.query(
    'SELECT name FROM products WHERE slug = $1',
    [first!.slug],
  )
  expect(rows).toEqual([{ name: 'Renamed' }])
})

it('leaves nothing behind when a row is invalid', async () => {
  const invalid = { ...seed.products[0]!, slug: 'Not Valid' }

  await expect(
    seedDatabase(pool, { products: [seed.products[1]!, invalid] }),
  ).rejects.toThrow()

  expect(await countRows(pool, 'products')).toBe(0)
})
