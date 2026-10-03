export type Campaign = {
  title: string
  terms: string
  totalQuantity: number
  claimedCount: number
  startsAt: Date
  endsAt: Date
}

export type CouponStatus = 'available' | 'sold_out' | 'not_started' | 'ended'

export function couponStatus(campaign: Campaign, now: Date): CouponStatus {
  if (now < campaign.startsAt) return 'not_started'
  if (now >= campaign.endsAt) return 'ended'
  if (campaign.claimedCount >= campaign.totalQuantity) return 'sold_out'
  return 'available'
}

export type ClaimedCoupon = {
  code: string
  title: string
  terms: string
  endsAt: Date
}

export type ClaimOutcome =
  | { kind: 'claimed'; coupon: ClaimedCoupon }
  | { kind: 'already_claimed'; coupon: ClaimedCoupon }
  | { kind: 'product_not_found' }
  | { kind: 'coupon_not_found' }
  | { kind: 'sold_out' }
  | { kind: 'not_active' }
