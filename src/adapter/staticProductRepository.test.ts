import { describe, expect, it } from 'vitest'
import { chair, wallArt } from '../test/fixtures'
import { createStaticProductRepository } from './staticProductRepository'

describe('createStaticProductRepository', () => {
  it('finds a product by slug', () => {
    const repository = createStaticProductRepository([chair, wallArt])

    expect(repository.findBySlug('wall-art')).toBe(wallArt)
  })

  it('returns undefined for an unknown slug', () => {
    const repository = createStaticProductRepository([chair])

    expect(repository.findBySlug('wall-art')).toBeUndefined()
  })

  it('lists products in catalog order', () => {
    const repository = createStaticProductRepository([wallArt, chair])

    expect(repository.list()).toEqual([wallArt, chair])
  })

  it('throws on a duplicate slug', () => {
    expect(() => createStaticProductRepository([chair, chair])).toThrow(
      'Duplicate product slug: chair',
    )
  })
})
