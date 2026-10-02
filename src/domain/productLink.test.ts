import { describe, expect, it } from 'vitest'
import { buildProductPath, parseProductLink } from './productLink'

describe('buildProductPath', () => {
  it('builds the product route for a slug', () => {
    expect(buildProductPath('chair')).toBe('/view-in-ar/p/chair')
  })
})

describe('parseProductLink', () => {
  it.each([
    ['https URL', 'https://ar.example.com/view-in-ar/p/chair', 'chair'],
    [
      'http URL on a LAN host',
      'http://192.168.1.10:5173/view-in-ar/p/wall-art',
      'wall-art',
    ],
    [
      'URL on any other host',
      'https://evil.example/view-in-ar/p/chair',
      'chair',
    ],
    [
      'URL with query and hash',
      'https://ar.example.com/view-in-ar/p/chair?utm=qr#top',
      'chair',
    ],
    ['bare slug', 'chair', 'chair'],
    [
      'surrounding whitespace',
      '  https://ar.example.com/view-in-ar/p/chair \n',
      'chair',
    ],
  ])('returns the slug for %s', (_label, text, slug) => {
    expect(parseProductLink(text)).toBe(slug)
  })

  it.each([
    ['empty string', ''],
    ['whitespace only', '   '],
    ['trailing slash', 'https://ar.example.com/view-in-ar/p/chair/'],
    ['extra path segment', 'https://ar.example.com/view-in-ar/p/chair/extra'],
    ['wrong prefix', 'https://ar.example.com/products/chair'],
    ['product path outside the section', 'https://ar.example.com/p/chair'],
    ['root URL', 'https://ar.example.com/'],
    ['invalid slug in URL', 'https://ar.example.com/view-in-ar/p/My_Chair'],
    ['encoded traversal', 'https://ar.example.com/view-in-ar/p/..%2F..%2Fetc'],
    ['javascript URL', 'javascript:alert(1)//view-in-ar/p/chair'],
    ['data URL', 'data:text/html,/view-in-ar/p/chair'],
    ['non-http scheme', 'ftp://ar.example.com/view-in-ar/p/chair'],
    ['plain text', 'hello world'],
    [
      'very long input',
      `https://ar.example.com/view-in-ar/p/${'a'.repeat(5000)}`,
    ],
  ])('returns null for %s', (_label, text) => {
    expect(parseProductLink(text)).toBeNull()
  })
})
