import { randomBytes } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'
import type { RouteDeps } from '../adapter/http/routes.ts'
import { createPgCouponRepository } from '../adapter/pgCouponRepository.ts'
import { createPgExperienceRepository } from '../adapter/pgExperienceRepository.ts'
import { generateCouponCode } from '../domain/couponCode.ts'
import { createClaimCoupon } from '../usecase/claimCoupon.ts'
import { createGetProductExperience } from '../usecase/getProductExperience.ts'
import { buildApp, type AppOptions } from './buildApp.ts'
import { createPool } from './db.ts'

export function createDeps(pool: Pool): RouteDeps {
  return {
    getProductExperience: createGetProductExperience(
      createPgExperienceRepository(pool),
      () => new Date(),
    ),
    claimCoupon: createClaimCoupon(createPgCouponRepository(pool), () =>
      generateCouponCode(randomBytes),
    ),
    checkHealth: async () => {
      await pool.query('SELECT 1')
    },
  }
}

// Closing the returned app also closes the pool.
export async function createServer(
  databaseUrl: string,
  options: AppOptions,
): Promise<{ app: FastifyInstance; pool: Pool }> {
  const pool = createPool(databaseUrl)
  const app = await buildApp(createDeps(pool), options)
  pool.on('error', (error) => app.log.error(error))
  app.addHook('onClose', () => pool.end())
  return { app, pool }
}
