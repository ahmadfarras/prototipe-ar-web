import type { Pool } from 'pg'
import type { RegisteredProduct } from '../domain/product.ts'
import type { ExperienceRepository } from '../usecase/getProductExperience.ts'

export const FIND_REGISTERED_PRODUCT_SQL = `
  SELECT p.slug, p.name, p.summary, p.description,
         c.title, c.terms, c.total_quantity, c.claimed_count,
         c.starts_at, c.ends_at
  FROM products p
  LEFT JOIN coupon_campaigns c ON c.product_id = p.id
  WHERE p.slug = $1
    AND EXISTS (SELECT 1 FROM ar_targets t WHERE t.product_id = p.id)`

type Row = {
  slug: string
  name: string
  summary: string
  description: string
  title: string | null
  terms: string
  total_quantity: number
  claimed_count: number
  starts_at: Date
  ends_at: Date
}

export function createPgExperienceRepository(pool: Pool): ExperienceRepository {
  return {
    async findBySlug(slug) {
      const { rows } = await pool.query<Row>(FIND_REGISTERED_PRODUCT_SQL, [
        slug,
      ])
      const row = rows[0]
      return row && toRegisteredProduct(row)
    },
  }
}

function toRegisteredProduct(row: Row): RegisteredProduct {
  return {
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    description: row.description,
    campaign:
      row.title === null
        ? null
        : {
            title: row.title,
            terms: row.terms,
            totalQuantity: row.total_quantity,
            claimedCount: row.claimed_count,
            startsAt: row.starts_at,
            endsAt: row.ends_at,
          },
  }
}
