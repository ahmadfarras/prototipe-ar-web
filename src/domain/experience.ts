export type CouponStatus = 'available' | 'sold_out' | 'not_started' | 'ended'

export type CouponOffer = {
  title: string
  terms: string
  endsAt: string
  status: CouponStatus
}

export type ProductExperience = {
  slug: string
  name: string
  summary: string
  description: string
  coupon: CouponOffer | null
}

export type ClaimedCoupon = {
  code: string
  title: string
  terms: string
  endsAt: string
}

export type ClaimOutcome =
  | { kind: 'claimed'; coupon: ClaimedCoupon }
  | { kind: 'unavailable'; reason: 'sold_out' | 'not_active' | 'not_found' }
  | { kind: 'failed' }
