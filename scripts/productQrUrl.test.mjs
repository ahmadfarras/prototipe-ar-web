import { describe, expect, it } from 'vitest'
import { parseProductLink } from '../src/domain/productLink.ts'
import { buildProductQrUrl } from './productQrUrl.mjs'

describe('buildProductQrUrl', () => {
  it.each([
    ['https://ar.example.com', 'https://ar.example.com/view-in-ar/p/chair'],
    ['https://ar.example.com/', 'https://ar.example.com/view-in-ar/p/chair'],
    [
      'https://ar.example.com/some/path?x=1',
      'https://ar.example.com/view-in-ar/p/chair',
    ],
    [
      'https://192.168.1.10:5173',
      'https://192.168.1.10:5173/view-in-ar/p/chair',
    ],
    ['http://localhost:5173', 'http://localhost:5173/view-in-ar/p/chair'],
  ])('builds the product URL from %s', (baseUrl, expected) => {
    expect(buildProductQrUrl(baseUrl, 'chair')).toBe(expected)
  })

  it('produces a link the app recognises', () => {
    const url = buildProductQrUrl('https://ar.example.com', 'wall-art')

    expect(parseProductLink(url)).toBe('wall-art')
  })

  it.each([
    '',
    'not a url',
    'ar.example.com',
    'javascript:alert(1)',
    'ftp://x',
  ])('rejects the base URL %j', (baseUrl) => {
    expect(() => buildProductQrUrl(baseUrl, 'chair')).toThrow(/Base URL/)
  })
})
