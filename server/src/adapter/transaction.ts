import type { Pool, PoolClient } from 'pg'

// Commits when shouldCommit(result) is true, otherwise rolls back and still
// returns the result. The client always goes back to the pool.
export async function withTransaction<T>(
  pool: Pool,
  run: (client: PoolClient) => Promise<T>,
  shouldCommit: (result: T) => boolean = () => true,
): Promise<T> {
  const client = await pool.connect()
  let isBroken = false
  try {
    await client.query("BEGIN; SET LOCAL lock_timeout = '2s'")
    const result = await run(client)
    await client.query(shouldCommit(result) ? 'COMMIT' : 'ROLLBACK')
    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {
      isBroken = true
    })
    throw error
  } finally {
    client.release(isBroken)
  }
}
