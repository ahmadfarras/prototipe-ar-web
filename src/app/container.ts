import { createHttpExperienceGateway } from '../adapter/httpExperienceGateway'
import { createHttpTargetManifestSource } from '../adapter/httpTargetManifest'
import products from '../adapter/products.json'
import { createStaticProductRepository } from '../adapter/staticProductRepository'
import type { Product } from '../domain/product'
import { createProductCatalog } from '../usecase/productCatalog'
import { createProductExperiences } from '../usecase/productExperience'

export const productCatalog = createProductCatalog(
  createStaticProductRepository(products as Product[]),
)

const sameOriginFetch: typeof fetch = (input, init) => fetch(input, init)

export const productExperiences = createProductExperiences(
  createHttpExperienceGateway(sameOriginFetch),
  createHttpTargetManifestSource(sameOriginFetch),
)
