import { Suspense } from 'react'
import { Navigate, type RouteObject } from 'react-router'
import { VIEW_IN_AR_PATH } from '../domain/productLink'
import type { ProductCatalog } from '../usecase/productCatalog'
import type { ProductExperiences } from '../usecase/productExperience'
import { AppLayout } from '../ui/components/AppLayout'
import { ErrorPage } from '../ui/pages/ErrorPage'
import { LazyProductPage } from '../ui/pages/LazyProductPage'
import { LazyScanProductPage } from '../ui/pages/LazyScanProductPage'
import { NotFoundPage } from '../ui/pages/NotFoundPage'
import { QrScanPage } from '../ui/pages/QrScanPage'
import { ViewInArPage } from '../ui/pages/ViewInArPage'
import { SCAN_PRODUCT_PATH } from '../ui/paths'

export function createRoutes(
  catalog: ProductCatalog,
  experiences: ProductExperiences,
): RouteObject[] {
  return [
    {
      element: <AppLayout />,
      errorElement: <ErrorPage />,
      children: [
        { index: true, element: <Navigate to={SCAN_PRODUCT_PATH} replace /> },
        {
          path: SCAN_PRODUCT_PATH,
          element: (
            <Suspense fallback={<output>Loading scanner…</output>}>
              <LazyScanProductPage experiences={experiences} />
            </Suspense>
          ),
        },
        {
          path: VIEW_IN_AR_PATH,
          children: [
            {
              index: true,
              element: <ViewInArPage products={catalog.listProducts()} />,
            },
            { path: 'scan', element: <QrScanPage /> },
            {
              path: 'p/:slug',
              element: (
                <Suspense fallback={<output>Loading product…</output>}>
                  <LazyProductPage findProduct={catalog.findProduct} />
                </Suspense>
              ),
            },
          ],
        },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ]
}
