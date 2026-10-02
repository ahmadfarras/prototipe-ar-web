export type Placement = 'floor' | 'wall'

export type Product = {
  slug: string
  name: string
  description: string
  modelUrl: string
  iosModelUrl?: string
  posterUrl?: string
  alt: string
  placement: Placement
}

export const MAX_SLUG_LENGTH = 64

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidSlug(value: string): boolean {
  return value.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(value)
}
