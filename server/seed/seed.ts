import type { Pool } from 'pg'

export type SeedProduct = {
  slug: string
  name: string
  summary: string
  description: string
  targets: { index: number; imageFile: string }[]
  coupon?: {
    title: string
    terms: string
    totalQuantity: number
    startsAt: string
    endsAt: string
  }
}

export type Seed = { products: SeedProduct[] }

// Idempotent: existing rows are updated by slug; claims and claimed_count are never touched.
export async function seedDatabase(pool: Pool, seed: Seed): Promise<void> {
  const targets = seed.products.flatMap((product) =>
    product.targets.map((target) => ({ slug: product.slug, ...target })),
  )
  const campaigns = seed.products.flatMap((product) =>
    product.coupon ? [{ slug: product.slug, ...product.coupon }] : [],
  )

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO products (slug, name, summary, description)
       SELECT slug, name, summary, description
       FROM jsonb_to_recordset($1::jsonb)
         AS p(slug text, name text, summary text, description text)
       ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name,
             summary = EXCLUDED.summary,
             description = EXCLUDED.description`,
      [JSON.stringify(seed.products)],
    )
    await client.query(
      `INSERT INTO ar_targets (product_id, target_index, image_file)
       SELECT p.id, t.index, t."imageFile"
       FROM jsonb_to_recordset($1::jsonb)
         AS t(slug text, index integer, "imageFile" text)
       JOIN products p ON p.slug = t.slug
       ON CONFLICT (image_file) DO UPDATE
         SET product_id = EXCLUDED.product_id,
             target_index = EXCLUDED.target_index`,
      [JSON.stringify(targets)],
    )
    await client.query(
      `INSERT INTO coupon_campaigns
         (product_id, title, terms, total_quantity, starts_at, ends_at)
       SELECT p.id, c.title, c.terms, c."totalQuantity", c."startsAt", c."endsAt"
       FROM jsonb_to_recordset($1::jsonb)
         AS c(slug text, title text, terms text, "totalQuantity" integer,
              "startsAt" timestamptz, "endsAt" timestamptz)
       JOIN products p ON p.slug = c.slug
       ON CONFLICT (product_id) DO UPDATE
         SET title = EXCLUDED.title,
             terms = EXCLUDED.terms,
             total_quantity = EXCLUDED.total_quantity,
             starts_at = EXCLUDED.starts_at,
             ends_at = EXCLUDED.ends_at`,
      [JSON.stringify(campaigns)],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
