import { describe, expect, it, vi } from 'vitest'
import type { ClaimOutcome } from '../domain/coupon.ts'
import { createClaimCoupon } from './claimCoupon.ts'

const VISITOR = '11111111-1111-4111-8111-111111111111'
const coupon = {
  code: 'AAAA-BBBB-CCCC',
  title: '10% off',
  terms: 'One per visitor.',
  endsAt: new Date('2027-01-01T00:00:00Z'),
}

function setup(outcome: ClaimOutcome) {
  const claim = vi.fn(async () => outcome)
  const claimCoupon = createClaimCoupon({ claim }, () => 'AAAA-BBBB-CCCC')
  return { claim, claimCoupon }
}

describe('claimCoupon', () => {
  it.each<ClaimOutcome>([
    { kind: 'claimed', coupon },
    { kind: 'already_claimed', coupon },
    { kind: 'product_not_found' },
    { kind: 'coupon_not_found' },
    { kind: 'sold_out' },
    { kind: 'not_active' },
  ])('returns the repository outcome $kind', async (outcome) => {
    const { claimCoupon } = setup(outcome)

    expect(await claimCoupon('book', VISITOR)).toEqual(outcome)
  })

  it('passes the slug, the visitor and a generated code to the repository', async () => {
    const { claimCoupon, claim } = setup({ kind: 'claimed', coupon })

    await claimCoupon('book', VISITOR)

    expect(claim).toHaveBeenCalledExactlyOnceWith(
      'book',
      VISITOR,
      'AAAA-BBBB-CCCC',
    )
  })

  it.each(['', 'Book', '../etc'])(
    'does not reach the repository for the invalid slug %j',
    async (slug) => {
      const { claimCoupon, claim } = setup({ kind: 'claimed', coupon })

      expect(await claimCoupon(slug, VISITOR)).toEqual({
        kind: 'product_not_found',
      })
      expect(claim).not.toHaveBeenCalled()
    },
  )
})
