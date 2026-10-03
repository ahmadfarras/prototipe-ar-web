import { Pool } from 'pg'
import seed from '../seed/seed.json' with { type: 'json' }
import { seedDatabase } from '../seed/seed.ts'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is not set')

const pool = new Pool({ connectionString: databaseUrl })
try {
  await seedDatabase(pool, seed)
  console.log(`Seeded ${seed.products.length} products`)
} finally {
  await pool.end()
}
