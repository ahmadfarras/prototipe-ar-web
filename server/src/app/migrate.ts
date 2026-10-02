import path from 'node:path'
import { runner } from 'node-pg-migrate'

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../../migrations')

export type MigrationDirection = 'up' | 'down'

export async function migrate(
  databaseUrl: string,
  direction: MigrationDirection,
  log: (message: string) => void = console.log,
): Promise<void> {
  await runner({
    databaseUrl,
    dir: MIGRATIONS_DIR,
    direction,
    migrationsTable: 'schema_migrations',
    log,
  })
}
