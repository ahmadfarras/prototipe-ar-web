import { describe, expect, it, vi } from 'vitest'
import type { RegisteredProduct } from '../domain/product.ts'
import { createGetProductExperience } from './getProductExperience.ts'

const NOW = new Date('2026-06-01T00:00:00Z')

const book: RegisteredProduct = {
  slug: 'book',
  name: 'Book',
  summary: 'A book.',
  description: 'A longer text.',
  campaign: {
    title: '10% off',
    terms: 'One per visitor.',
    totalQuantity: 5,
    claimedCount: 5,
    startsAt: new Date('2026-01-01T00:00:00Z'),
    endsAt: new Date('2027-01-01T00:00:00Z'),
  },
}

function setup(product: RegisteredProduct | undefined) {
  const findBySlug = vi.fn(async () => product)
  const getProductExperience = createGetProductExperience(
    { findBySlug },
    () => NOW,
  )
  return { findBySlug, getProductExperience }
}

describe('getProductExperience', () => {
  it('returns the product with its coupon status and no counts', async () => {
    const { getProductExperience } = setup(book)

    expect(await getProductExperience('book')).toEqual({
      slug: 'book',
      name: 'Book',
      summary: 'A book.',
      description: 'A longer text.',
      coupon: {
        title: '10% off',
        terms: 'One per visitor.',
        endsAt: new Date('2027-01-01T00:00:00Z'),
        status: 'sold_out',
      },
    })
  })

  it('returns a null coupon for a product without a campaign', async () => {
    const { getProductExperience } = setup({ ...book, campaign: null })

    expect(await getProductExperience('book')).toMatchObject({ coupon: null })
  })

  it('returns undefined for an unknown product', async () => {
    const { getProductExperience, findBySlug } = setup(undefined)

    expect(await getProductExperience('missing')).toBeUndefined()
    expect(findBySlug).toHaveBeenCalledWith('missing')
  })

  it.each(['', 'Book', '../etc', "x' OR '1'='1"])(
    'does not query the repository for the invalid slug %j',
    async (slug) => {
      const { getProductExperience, findBySlug } = setup(book)

      expect(await getProductExperience(slug)).toBeUndefined()
      expect(findBySlug).not.toHaveBeenCalled()
    },
  )
})
