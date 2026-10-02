import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { generateCouponCode } from './couponCode.ts'

describe('generateCouponCode', () => {
  it('maps each byte to one character, in groups of four', () => {
    const bytes = Uint8Array.from([
      0, 1, 9, 10, 17, 18, 31, 32, 63, 255, 20, 22,
    ])

    expect(generateCouponCode(() => bytes)).toBe('019A-HJZ0-ZZMP')
  })

  it('asks for twelve random bytes', () => {
    const sizes: number[] = []

    generateCouponCode((size) => {
      sizes.push(size)
      return new Uint8Array(size)
    })

    expect(sizes).toEqual([12])
  })

  it('only uses unambiguous characters with real randomness', () => {
    for (let run = 0; run < 100; run += 1) {
      expect(generateCouponCode(randomBytes)).toMatch(
        /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/,
      )
    }
  })
})
