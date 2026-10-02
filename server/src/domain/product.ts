import type { Campaign, CouponStatus } from './coupon.ts'

export const MAX_SLUG_LENGTH = 64

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidSlug(value: string): boolean {
  return value.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(value)
}

export type RegisteredProduct = {
  slug: string
  name: string
  summary: string
  description: string
  campaign: Campaign | null
}

export type CouponOffer = {
  title: string
  terms: string
  endsAt: Date
  status: CouponStatus
}

export type ProductExperience = {
  slug: string
  name: string
  summary: string
  description: string
  coupon: CouponOffer | null
}
