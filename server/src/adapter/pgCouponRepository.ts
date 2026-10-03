import type { Pool, PoolClient } from 'pg'
import type { ClaimOutcome } from '../domain/coupon.ts'
import type { CouponRepository } from '../usecase/claimCoupon.ts'
import { withTransaction } from './transaction.ts'

export const FIND_CAMPAIGN_SQL = `
  SELECT c.id, c.title, c.terms, c.ends_at,
         (c.starts_at <= now() AND c.ends_at > now()) AS is_active
  FROM products p
  LEFT JOIN coupon_campaigns c ON c.product_id = p.id
  WHERE p.slug = $1
    AND EXISTS (SELECT 1 FROM ar_targets t WHERE t.product_id = p.id)`

export const INSERT_CLAIM_SQL = `
  INSERT INTO coupon_claims (campaign_id, visitor_id, code)
  VALUES ($1, $2, $3)
  ON CONFLICT (campaign_id, visitor_id) DO NOTHING
  RETURNING code`

export const FIND_CLAIM_SQL = `
  SELECT code FROM coupon_claims WHERE campaign_id = $1 AND visitor_id = $2`

// One conditional UPDATE is the stock gate: two transactions can never both
// take the last unit. Do not replace it with a read followed by a write.
export const TAKE_UNIT_SQL = `
  UPDATE coupon_campaigns
  SET claimed_count = claimed_count + 1
  WHERE id = $1
    AND claimed_count < total_quantity
    AND starts_at <= now() AND ends_at > now()
  RETURNING id`

type CampaignRow = {
  id: string | null
  title: string
  terms: string
  ends_at: Date
  is_active: boolean
}

export function createPgCouponRepository(pool: Pool): CouponRepository {
  return {
    claim: (slug, visitorId, code) =>
      withTransaction(
        pool,
        (client) => claimInTransaction(client, slug, visitorId, code),
        (outcome) =>
          outcome.kind !== 'sold_out' && outcome.kind !== 'not_active',
      ),
  }
}

// Lock order is always: the visitor's claim row, then the campaign row.
async function claimInTransaction(
  client: PoolClient,
  slug: string,
  visitorId: string,
  code: string,
): Promise<ClaimOutcome> {
  const found = await client.query<CampaignRow>(FIND_CAMPAIGN_SQL, [slug])
  const campaign = found.rows[0]
  if (!campaign) return { kind: 'product_not_found' }
  if (campaign.id === null) return { kind: 'coupon_not_found' }

  const coupon = {
    title: campaign.title,
    terms: campaign.terms,
    endsAt: campaign.ends_at,
  }

  const inserted = await client.query(INSERT_CLAIM_SQL, [
    campaign.id,
    visitorId,
    code,
  ])
  if (inserted.rowCount === 0) {
    const existing = await client.query<{ code: string }>(FIND_CLAIM_SQL, [
      campaign.id,
      visitorId,
    ])
    return {
      kind: 'already_claimed',
      coupon: { ...coupon, code: existing.rows[0]!.code },
    }
  }

  const taken = await client.query(TAKE_UNIT_SQL, [campaign.id])
  if (taken.rowCount === 0) {
    return { kind: campaign.is_active ? 'sold_out' : 'not_active' }
  }

  return { kind: 'claimed', coupon: { ...coupon, code } }
}
