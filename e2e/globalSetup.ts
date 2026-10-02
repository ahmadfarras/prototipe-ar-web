import { readFile } from 'node:fs/promises'
import { Pool } from 'pg'
import { seedDatabase, type Seed } from '../server/seed/seed.ts'
import { migrate } from '../server/src/app/migrate.ts'
import { resetDatabase } from '../server/test/helpers/db.ts'
import { E2E_DATABASE_URL } from './database.ts'

export default async function globalSetup() {
  const seed = JSON.parse(
    await readFile(
      new URL('../server/seed/seed.json', import.meta.url),
      'utf8',
    ),
  ) as Seed
  const pool = new Pool({ connectionString: E2E_DATABASE_URL })
  try {
    await migrate(E2E_DATABASE_URL, 'up', () => {})
    await resetDatabase(pool)
    await seedDatabase(pool, seed)
  } finally {
    await pool.end()
  }
}
