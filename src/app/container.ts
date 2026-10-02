import products from '../adapter/products.json'
import { createStaticProductRepository } from '../adapter/staticProductRepository'
import type { Product } from '../domain/product'
import { createProductCatalog } from '../usecase/productCatalog'

export const productCatalog = createProductCatalog(
  createStaticProductRepository(products as Product[]),
)
