import { isValidSlug } from './product'

export type RegisteredTarget = {
  slug: string
  name: string
  imageUrl: string
}

// The position of a target is the tracker's target index.
export type TargetManifest = {
  mindUrl: string
  targets: readonly RegisteredTarget[]
}

export const MAX_TARGETS = 20
const MAX_NAME_LENGTH = 120

// Same-origin path only: the tracker must never load a target file from elsewhere.
const MIND_URL_PATTERN = /^\/targets\/targets-[0-9a-f]{8}\.mind$/
// Same-origin path only: the page must never show an image from elsewhere.
const IMAGE_URL_PATTERN =
  /^\/targets\/images\/[a-z0-9]+(-[a-z0-9]+)*\.(jpe?g|png)$/

export function parseTargetManifest(value: unknown): TargetManifest | null {
  if (!isRecord(value)) return null

  const { mindUrl, targets } = value
  if (typeof mindUrl !== 'string' || !MIND_URL_PATTERN.test(mindUrl))
    return null
  if (!Array.isArray(targets)) return null
  if (targets.length === 0 || targets.length > MAX_TARGETS) return null

  const parsed: RegisteredTarget[] = []
  for (const value of targets) {
    const target = parseTarget(value)
    if (!target) return null
    parsed.push(target)
  }
  return { mindUrl, targets: parsed }
}

function parseTarget(value: unknown): RegisteredTarget | null {
  if (!isRecord(value)) return null

  const { slug, name, imageUrl } = value
  if (typeof slug !== 'string' || !isValidSlug(slug)) return null
  if (typeof name !== 'string') return null
  if (name.trim() === '' || name.length > MAX_NAME_LENGTH) return null
  if (typeof imageUrl !== 'string' || !IMAGE_URL_PATTERN.test(imageUrl))
    return null
  return { slug, name, imageUrl }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
