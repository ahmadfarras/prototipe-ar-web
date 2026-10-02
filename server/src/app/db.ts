import { Pool } from 'pg'

export function createPool(databaseUrl: string): Pool {
  return new Pool({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 5_000,
    idle_in_transaction_session_timeout: 10_000,
  })
}
