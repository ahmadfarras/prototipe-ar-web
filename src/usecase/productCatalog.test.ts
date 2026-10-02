import { describe, expect, it, vi } from 'vitest'
import { chair, wallArt } from '../test/fixtures'
import { createProductCatalog, type ProductRepository } from './productCatalog'

function fakeRepository(): ProductRepository {
  const products = [chair, wallArt]
  return {
    findBySlug: vi.fn((slug: string) => products.find((p) => p.slug === slug)),
    list: vi.fn(() => products),
  }
}

describe('createProductCatalog', () => {
  it('finds a product by slug', () => {
    const catalog = createProductCatalog(fakeRepository())

    expect(catalog.findProduct('chair')).toBe(chair)
  })

  it('returns undefined for an unknown slug', () => {
    const catalog = createProductCatalog(fakeRepository())

    expect(catalog.findProduct('table')).toBeUndefined()
  })

  it('rejects an invalid slug without touching the repository', () => {
    const repository = fakeRepository()
    const catalog = createProductCatalog(repository)

    expect(catalog.findProduct('../etc')).toBeUndefined()
    expect(repository.findBySlug).not.toHaveBeenCalled()
  })

  it('lists every product', () => {
    const catalog = createProductCatalog(fakeRepository())

    expect(catalog.listProducts()).toEqual([chair, wallArt])
  })
})
