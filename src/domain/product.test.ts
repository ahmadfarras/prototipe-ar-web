import { describe, expect, it } from 'vitest'
import { MAX_SLUG_LENGTH, isValidSlug } from './product'

describe('isValidSlug', () => {
  it.each([
    'chair',
    'wall-art',
    'a1',
    'sofa-2-seater',
    'a'.repeat(MAX_SLUG_LENGTH),
  ])('accepts %s', (slug) => {
    expect(isValidSlug(slug)).toBe(true)
  })

  it.each([
    ['empty', ''],
    ['uppercase', 'Chair'],
    ['space', 'my chair'],
    ['leading hyphen', '-chair'],
    ['trailing hyphen', 'chair-'],
    ['double hyphen', 'my--chair'],
    ['too long', 'a'.repeat(MAX_SLUG_LENGTH + 1)],
    ['path traversal', '../etc'],
    ['slash', 'a/b'],
    ['encoded slash', 'a%2Fb'],
    ['underscore', 'my_chair'],
    ['trailing newline', 'chair\n'],
  ])('rejects %s', (_label, slug) => {
    expect(isValidSlug(slug)).toBe(false)
  })
})
