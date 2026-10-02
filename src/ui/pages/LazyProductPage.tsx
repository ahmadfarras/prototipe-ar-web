import { lazy } from 'react'

export const LazyProductPage = lazy(() =>
  import('./ProductPage').then((module) => ({ default: module.ProductPage })),
)
