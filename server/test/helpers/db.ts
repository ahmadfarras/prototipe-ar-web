import { Pool } from 'pg'

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://ar:ar@127.0.0.1:54329/ar_test'

const DISPOSABLE_DATABASE = /_(test|e2e)$/

export function createTestPool(): Pool {
  return new Pool({ connectionString: TEST_DATABASE_URL })
}

export function assertDisposableDatabase(name: string): void {
  if (!DISPOSABLE_DATABASE.test(name)) {
    throw new Error(`Refusing to reset database "${name}"`)
  }
}

export async function resetDatabase(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ name: string }>(
    'SELECT current_database() AS name',
  )
  assertDisposableDatabase(rows[0]!.name)
  await pool.query(
    'TRUNCATE products, ar_targets, coupon_campaigns, coupon_claims RESTART IDENTITY CASCADE',
  )
}

type ProductInput = {
  slug?: string
  name?: string
  summary?: string
  description?: string
}

export async function insertProduct(
  pool: Pool,
  product: ProductInput = {},
): Promise<number> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO products (slug, name, summary, description)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [
      product.slug ?? 'sample-book',
      product.name ?? 'Sample Book',
      product.summary ?? 'A sample summary.',
      product.description ?? 'A sample description.',
    ],
  )
  return Number(rows[0]!.id)
}

export async function insertTarget(
  pool: Pool,
  productId: number,
  targetIndex = 0,
  imageFile = `target-${targetIndex}.jpg`,
): Promise<void> {
  await pool.query(
    'INSERT INTO ar_targets (product_id, target_index, image_file) VALUES ($1, $2, $3)',
    [productId, targetIndex, imageFile],
  )
}

type CampaignInput = {
  title?: string
  terms?: string
  totalQuantity?: number
  claimedCount?: number
  startsAt?: string
  endsAt?: string
}

export async function insertCampaign(
  pool: Pool,
  productId: number,
  campaign: CampaignInput = {},
): Promise<number> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO coupon_campaigns
       (product_id, title, terms, total_quantity, claimed_count, starts_at, ends_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      productId,
      campaign.title ?? '10% off',
      campaign.terms ?? 'One per visitor.',
      campaign.totalQuantity ?? 10,
      campaign.claimedCount ?? 0,
      campaign.startsAt ?? '2020-01-01T00:00:00Z',
      campaign.endsAt ?? '2099-01-01T00:00:00Z',
    ],
  )
  return Number(rows[0]!.id)
}

export async function insertRegisteredProduct(
  pool: Pool,
  slug = 'sample-book',
  campaign?: CampaignInput,
): Promise<{ productId: number; campaignId: number }> {
  const productId = await insertProduct(pool, { slug })
  const { rows } = await pool.query<{ next: number }>(
    'SELECT coalesce(max(target_index) + 1, 0) AS next FROM ar_targets',
  )
  await insertTarget(pool, productId, rows[0]!.next)
  const campaignId = await insertCampaign(pool, productId, campaign)
  return { productId, campaignId }
}

type Table = 'products' | 'ar_targets' | 'coupon_campaigns' | 'coupon_claims'

export async function countRows(pool: Pool, table: Table): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT count(*) FROM ${table}`,
  )
  return Number(rows[0]!.count)
}
