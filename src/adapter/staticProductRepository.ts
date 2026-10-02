import type { Product } from '../domain/product'
import type { ProductRepository } from '../usecase/productCatalog'

export function createStaticProductRepository(
  products: readonly Product[],
): ProductRepository {
  const bySlug = new Map<string, Product>()
  for (const product of products) {
    if (bySlug.has(product.slug)) {
      throw new Error(`Duplicate product slug: ${product.slug}`)
    }
    bySlug.set(product.slug, product)
  }

  return {
    findBySlug: (slug) => bySlug.get(slug),
    list: () => products,
  }
}
