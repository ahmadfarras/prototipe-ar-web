import { Link } from 'react-router'
import type { Product } from '../../domain/product'
import { buildProductPath } from '../../domain/productLink'
import { QR_SCAN_PATH } from '../paths'

type Props = {
  products: readonly Product[]
}

export function ViewInArPage({ products }: Props) {
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">View product in AR</h1>
      <p className="mt-2 text-slate-600">
        Scan the QR code on a product to place it in your space.
      </p>
      <Link
        to={QR_SCAN_PATH}
        className="mt-4 flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-6 font-semibold text-white"
      >
        Scan QR code
      </Link>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">
        Demo products
      </h2>
      <ul className="mt-2 divide-y divide-slate-200">
        {products.map((product) => (
          <li key={product.slug}>
            <Link to={buildProductPath(product.slug)} className="block py-3">
              <span className="font-medium text-slate-900 underline">
                {product.name}
              </span>
              <span className="block text-sm text-slate-600">
                {product.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
