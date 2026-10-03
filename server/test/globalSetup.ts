import { migrate } from '../src/app/migrate.ts'
import { TEST_DATABASE_URL } from './helpers/db.ts'

export default async function setup(): Promise<void> {
  await migrate(TEST_DATABASE_URL, 'up', () => {})
}
