import type { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { withTransaction } from '../src/adapter/transaction.ts'
import {
  countRows,
  createTestPool,
  insertProduct,
  resetDatabase,
} from './helpers/db.ts'

let pool: Pool

beforeAll(() => {
  pool = createTestPool()
})
beforeEach(() => resetDatabase(pool))
afterAll(() => pool.end())

const insertBook = (client: { query: Pool['query'] }) =>
  client.query(
    "INSERT INTO products (slug, name, summary, description) VALUES ('book', 'n', 's', 'd')",
  )

function expectAllClientsReturned() {
  expect(pool.idleCount).toBe(pool.totalCount)
  expect(pool.waitingCount).toBe(0)
}

describe('withTransaction', () => {
  it('commits and returns the result', async () => {
    const result = await withTransaction(pool, async (client) => {
      await insertBook(client)
      return 'done'
    })

    expect(result).toBe('done')
    expect(await countRows(pool, 'products')).toBe(1)
    expectAllClientsReturned()
  })

  it('rolls back and rethrows when the work throws', async () => {
    await expect(
      withTransaction(pool, async (client) => {
        await insertBook(client)
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    expect(await countRows(pool, 'products')).toBe(0)
    expectAllClientsReturned()
  })

  it('rolls back and rethrows when a statement fails', async () => {
    await insertProduct(pool, { slug: 'book' })

    await expect(
      withTransaction(pool, (client) => insertBook(client)),
    ).rejects.toMatchObject({ code: '23505' })

    expect(await countRows(pool, 'products')).toBe(1)
    expectAllClientsReturned()
  })

  it('rolls back but returns the result when told not to commit', async () => {
    const result = await withTransaction(
      pool,
      async (client) => {
        await insertBook(client)
        return 'rejected'
      },
      (value) => value !== 'rejected',
    )

    expect(result).toBe('rejected')
    expect(await countRows(pool, 'products')).toBe(0)
    expectAllClientsReturned()
  })

  it('gives up waiting for a lock after the lock timeout', async () => {
    const productId = await insertProduct(pool)
    const lockRow = (client: { query: Pool['query'] }) =>
      client.query('SELECT 1 FROM products WHERE id = $1 FOR UPDATE', [
        productId,
      ])
    let releaseHolder = () => {}
    const holderDone = new Promise<void>((resolve) => {
      releaseHolder = resolve
    })
    const holderHasLock = new Promise<void>((resolve, reject) => {
      withTransaction(pool, async (client) => {
        await lockRow(client)
        resolve()
        await holderDone
      }).catch(reject)
    })
    await holderHasLock

    await expect(withTransaction(pool, lockRow)).rejects.toMatchObject({
      code: '55P03',
    })
    releaseHolder()
  })
})
