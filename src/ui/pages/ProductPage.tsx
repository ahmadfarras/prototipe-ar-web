import { Link, useParams } from 'react-router'
import type { Product } from '../../domain/product'
import { ModelViewer } from '../components/ModelViewer'
import { QR_SCAN_PATH } from '../paths'
import { NotFoundPage } from './NotFoundPage'

type Props = {
  findProduct: (slug: string) => Product | undefined
}

export function ProductPage({ findProduct }: Props) {
  const { slug = '' } = useParams()
  const product = findProduct(slug)

  if (!product) return <NotFoundPage />

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
      <p className="mt-2 mb-4 text-slate-600">{product.description}</p>
      <ModelViewer key={product.slug} product={product} />
      <Link
        to={QR_SCAN_PATH}
        className="mt-6 inline-block font-semibold underline"
      >
        Scan another product
      </Link>
    </>
  )
}
