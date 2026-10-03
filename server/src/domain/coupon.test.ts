import { describe, expect, it } from 'vitest'
import { couponStatus, type Campaign } from './coupon.ts'

const campaign: Campaign = {
  title: '10% off',
  terms: 'One per visitor.',
  totalQuantity: 2,
  claimedCount: 0,
  startsAt: new Date('2026-01-01T00:00:00Z'),
  endsAt: new Date('2026-02-01T00:00:00Z'),
}

describe('couponStatus', () => {
  it.each([
    ['2025-12-31T23:59:59.999Z', 0, 'not_started'],
    ['2026-01-01T00:00:00.000Z', 0, 'available'],
    ['2026-01-15T00:00:00.000Z', 1, 'available'],
    ['2026-01-15T00:00:00.000Z', 2, 'sold_out'],
    ['2026-01-31T23:59:59.999Z', 0, 'available'],
    ['2026-02-01T00:00:00.000Z', 0, 'ended'],
    ['2026-02-01T00:00:00.000Z', 2, 'ended'],
    ['2025-12-01T00:00:00.000Z', 2, 'not_started'],
  ])('at %s with %i claimed is %s', (now, claimedCount, expected) => {
    expect(couponStatus({ ...campaign, claimedCount }, new Date(now))).toBe(
      expected,
    )
  })
})
