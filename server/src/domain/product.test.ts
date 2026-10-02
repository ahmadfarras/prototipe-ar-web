import { describe, expect, it } from 'vitest'
import { isValidSlug } from './product.ts'

describe('isValidSlug', () => {
  it.each(['book', 'wizard-of-oz', 'a1-b2-c3', '7', 'a'.repeat(64)])(
    'accepts %j',
    (slug) => {
      expect(isValidSlug(slug)).toBe(true)
    },
  )

  it.each([
    '',
    'Book',
    'two words',
    '-lead',
    'trail-',
    'a--b',
    '../etc',
    'a/b',
    "a';--",
    'a'.repeat(65),
  ])('rejects %j', (slug) => {
    expect(isValidSlug(slug)).toBe(false)
  })
})
