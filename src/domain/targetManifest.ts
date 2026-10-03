import { isValidSlug } from './product'

// The position of a slug is the tracker's target index.
export type TargetManifest = {
  mindUrl: string
  slugs: readonly string[]
}

export const MAX_TARGETS = 20

// Same-origin path only: the tracker must never load a target file from elsewhere.
const MIND_URL_PATTERN = /^\/targets\/targets-[0-9a-f]{8}\.mind$/

export function parseTargetManifest(value: unknown): TargetManifest | null {
  if (!isRecord(value)) return null

  const { mindUrl, targets } = value
  if (typeof mindUrl !== 'string' || !MIND_URL_PATTERN.test(mindUrl))
    return null
  if (!Array.isArray(targets)) return null
  if (targets.length === 0 || targets.length > MAX_TARGETS) return null

  const slugs: string[] = []
  for (const target of targets) {
    if (!isRecord(target)) return null
    if (typeof target.slug !== 'string' || !isValidSlug(target.slug))
      return null
    slugs.push(target.slug)
  }
  return { mindUrl, slugs }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
