import type { ModelViewerElement } from '@google/model-viewer'
import type { DetailedHTMLProps, HTMLAttributes } from 'react'
import type { Placement } from '../domain/product'

type ModelViewerAttributes = {
  src: string
  alt: string
  poster?: string
  ar?: boolean
  'ios-src'?: string
  'ar-modes'?: string
  'ar-scale'?: 'auto' | 'fixed'
  'ar-placement'?: Placement
  'camera-controls'?: boolean
  'touch-action'?: string
  'shadow-intensity'?: string
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<
        HTMLAttributes<ModelViewerElement>,
        ModelViewerElement
      > &
        ModelViewerAttributes
    }
  }
}
