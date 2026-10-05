import type { ClaimedCoupon, ProductExperience } from '../domain/experience'
import type { Product } from '../domain/product'
import type { TargetManifest } from '../domain/targetManifest'

export const chair: Product = {
  slug: 'chair',
  name: 'Lounge Chair',
  description: 'A comfortable chair.',
  modelUrl: '/models/chair.glb',
  alt: '3D model of a lounge chair',
  placement: 'floor',
}

export const wallArt: Product = {
  slug: 'wall-art',
  name: 'Wall Art',
  description: 'A framed print.',
  modelUrl: '/models/wall-art.glb',
  iosModelUrl: '/models/wall-art.usdz',
  posterUrl: '/models/wall-art.webp',
  alt: '3D model of a framed print',
  placement: 'wall',
}

export const bookExperience: ProductExperience = {
  slug: 'book',
  name: 'Sample Book',
  summary: 'A short summary.',
  description: 'A longer description.',
  coupon: {
    title: '10% off',
    terms: 'One per visitor.',
    endsAt: '2030-01-01T00:00:00.000Z',
    status: 'available',
  },
}

export const bookCoupon: ClaimedCoupon = {
  code: 'AAAA-BBBB-CCCC',
  title: '10% off',
  terms: 'One per visitor.',
  endsAt: '2030-01-01T00:00:00.000Z',
}

export const manifest: TargetManifest = {
  mindUrl: '/targets/targets-07a7ebdd.mind',
  targets: [
    { slug: 'book', name: 'Sample Book', imageUrl: '/targets/images/book.jpg' },
    { slug: 'box', name: 'Sample Box', imageUrl: '/targets/images/box.jpg' },
  ],
}
