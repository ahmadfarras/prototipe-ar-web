import { isValidSlug, type Product } from '../domain/product'

export interface ProductRepository {
  findBySlug(slug: string): Product | undefined
  list(): readonly Product[]
}

export type ProductCatalog = {
  findProduct(slug: string): Product | undefined
  listProducts(): readonly Product[]
}

export function createProductCatalog(
  repository: ProductRepository,
): ProductCatalog {
  return {
    findProduct: (slug) =>
      isValidSlug(slug) ? repository.findBySlug(slug) : undefined,
    listProducts: () => repository.list(),
  }
}
