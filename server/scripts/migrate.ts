import { migrate } from '../src/app/migrate.ts'

const direction = process.argv[2]
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) throw new Error('DATABASE_URL is not set')
if (direction !== 'up' && direction !== 'down') {
  throw new Error('Usage: migrate.ts <up|down>')
}

await migrate(databaseUrl, direction)
