import { Suspense } from 'react'
import type { RouteObject } from 'react-router'
import type { ProductCatalog } from '../usecase/productCatalog'
import { AppLayout } from '../ui/components/AppLayout'
import { ErrorPage } from '../ui/pages/ErrorPage'
import { HomePage } from '../ui/pages/HomePage'
import { LazyProductPage } from '../ui/pages/LazyProductPage'
import { NotFoundPage } from '../ui/pages/NotFoundPage'
import { ScanPage } from '../ui/pages/ScanPage'

export function createRoutes(catalog: ProductCatalog): RouteObject[] {
  return [
    {
      element: <AppLayout />,
      errorElement: <ErrorPage />,
      children: [
        {
          path: '/',
          element: <HomePage products={catalog.listProducts()} />,
        },
        { path: '/scan', element: <ScanPage /> },
        {
          path: '/p/:slug',
          element: (
            <Suspense fallback={<output>Loading product…</output>}>
              <LazyProductPage findProduct={catalog.findProduct} />
            </Suspense>
          ),
        },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ]
}
