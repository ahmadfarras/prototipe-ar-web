import { lazy } from 'react'

export const LazyScanProductPage = lazy(() =>
  import('./ScanProductPage').then((module) => ({
    default: module.ScanProductPage,
  })),
)
