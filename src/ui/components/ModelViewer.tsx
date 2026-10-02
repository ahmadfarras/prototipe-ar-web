import '@google/model-viewer'
import type { ModelViewerElement } from '@google/model-viewer'
import { useEffect, useRef, useState } from 'react'
import type { Product } from '../../domain/product'

type Status = 'loading' | 'ready' | 'ar-unavailable' | 'error'

type Props = {
  product: Product
}

export function ModelViewer({ product }: Props) {
  const viewerRef = useRef<ModelViewerElement>(null)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    const handleLoad = () =>
      setStatus(viewer.canActivateAR ? 'ready' : 'ar-unavailable')
    const handleError = () => setStatus('error')

    viewer.addEventListener('load', handleLoad)
    viewer.addEventListener('error', handleError)
    return () => {
      viewer.removeEventListener('load', handleLoad)
      viewer.removeEventListener('error', handleError)
    }
  }, [])

  return (
    <div>
      <model-viewer
        ref={viewerRef}
        className="block h-[60dvh] w-full rounded-xl bg-slate-100"
        src={product.modelUrl}
        ios-src={product.iosModelUrl}
        poster={product.posterUrl}
        alt={product.alt}
        ar
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="fixed"
        ar-placement={product.placement}
        camera-controls
        touch-action="pan-y"
        shadow-intensity="1"
      >
        <button
          slot="ar-button"
          className="absolute bottom-4 left-1/2 min-h-11 -translate-x-1/2 rounded-full bg-slate-900 px-6 font-semibold text-white shadow-lg"
        >
          View in AR
        </button>
      </model-viewer>
      {status === 'loading' && (
        <output className="mt-3 block text-sm text-slate-600">
          Loading 3D model…
        </output>
      )}
      {status === 'ar-unavailable' && (
        <p className="mt-3 text-sm text-slate-600">
          AR is not available on this device. Open this page on an AR-capable
          phone to place the product in your space.
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          The 3D model could not be loaded.
        </p>
      )}
    </div>
  )
}
