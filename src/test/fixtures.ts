import type { Product } from '../domain/product'

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
