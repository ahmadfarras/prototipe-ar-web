import type { ClaimOutcome } from '../domain/coupon.ts'
import { isValidSlug } from '../domain/product.ts'

export interface CouponRepository {
  // Must be atomic: one claim per visitor and never more claims than the quantity.
  claim(slug: string, visitorId: string, code: string): Promise<ClaimOutcome>
}

export type ClaimCoupon = (
  slug: string,
  visitorId: string,
) => Promise<ClaimOutcome>

export function createClaimCoupon(
  repository: CouponRepository,
  generateCode: () => string,
): ClaimCoupon {
  return async (slug, visitorId) => {
    if (!isValidSlug(slug)) return { kind: 'product_not_found' }
    return repository.claim(slug, visitorId, generateCode())
  }
}
