# Database tasks. They run against DATABASE_URL from .env.

.PHONY: migrate migrate-down seed

migrate:
	node --env-file=.env server/scripts/migrate.ts up

# Rolls back the most recent migration.
migrate-down:
	node --env-file=.env server/scripts/migrate.ts down

# Inserts or updates the products in server/seed/seed.json. Safe to repeat.
seed:
	node --env-file=.env server/scripts/seed.ts
