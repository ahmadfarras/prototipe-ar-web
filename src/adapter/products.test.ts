import { describe, expect, it } from 'vitest'
import { isValidSlug, type Product } from '../domain/product'
import products from './products.json'

const publicFiles = new Set(
  Object.keys(import.meta.glob('/public/**/*')).map((path) =>
    path.replace(/^\/public/, ''),
  ),
)
const catalog = products as Product[]

describe('product catalog', () => {
  it('has at least two products', () => {
    expect(catalog.length).toBeGreaterThanOrEqual(2)
  })

  it('has unique slugs', () => {
    const slugs = catalog.map((product) => product.slug)

    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it.each(catalog)(
    '$slug is complete and points to existing files',
    (product) => {
      expect(isValidSlug(product.slug)).toBe(true)
      expect(product.name).not.toBe('')
      expect(product.alt).not.toBe('')
      expect(['floor', 'wall']).toContain(product.placement)
      expect(product.modelUrl).toMatch(/\.glb$/)
      // Without it, AR is unavailable in Chrome, Edge and Firefox on iOS.
      expect(product.iosModelUrl).toBe(
        product.modelUrl.replace(/\.glb$/, '.usdz'),
      )

      const urls = [product.modelUrl, product.iosModelUrl, product.posterUrl]
      for (const url of urls.filter((url) => url !== undefined)) {
        expect(publicFiles).toContain(url)
      }
    },
  )
})
