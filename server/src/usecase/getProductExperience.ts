import { couponStatus } from '../domain/coupon.ts'
import {
  isValidSlug,
  type ProductExperience,
  type RegisteredProduct,
} from '../domain/product.ts'

export interface ExperienceRepository {
  findBySlug(slug: string): Promise<RegisteredProduct | undefined>
}

export type GetProductExperience = (
  slug: string,
) => Promise<ProductExperience | undefined>

export function createGetProductExperience(
  repository: ExperienceRepository,
  now: () => Date,
): GetProductExperience {
  return async (slug) => {
    if (!isValidSlug(slug)) return undefined

    const product = await repository.findBySlug(slug)
    if (!product) return undefined

    const { campaign, ...details } = product
    return {
      ...details,
      coupon: campaign && {
        title: campaign.title,
        terms: campaign.terms,
        endsAt: campaign.endsAt,
        status: couponStatus(campaign, now()),
      },
    }
  }
}
