import type { ClaimOutcome, ProductExperience } from '../domain/experience'
import { isValidSlug } from '../domain/product'
import type { TargetManifest } from '../domain/targetManifest'

export interface ExperienceGateway {
  fetchExperience(slug: string): Promise<ProductExperience | null>
  claimCoupon(slug: string): Promise<ClaimOutcome>
}

export interface TargetManifestSource {
  load(): Promise<TargetManifest>
}

export type ProductExperiences = {
  loadManifest(): Promise<TargetManifest>
  getExperience(slug: string): Promise<ProductExperience | null>
  claimCoupon(slug: string): Promise<ClaimOutcome>
}

const MANIFEST_KEY = 'manifest'

export function createProductExperiences(
  gateway: ExperienceGateway,
  manifestSource: TargetManifestSource,
): ProductExperiences {
  const experiences = new Map<string, Promise<ProductExperience | null>>()
  const manifests = new Map<string, Promise<TargetManifest>>()

  return {
    loadManifest: () =>
      loadOnce(manifests, MANIFEST_KEY, () => manifestSource.load()),
    getExperience: (slug) =>
      isValidSlug(slug)
        ? loadOnce(experiences, slug, () => gateway.fetchExperience(slug))
        : Promise.resolve(null),
    claimCoupon: (slug) =>
      isValidSlug(slug)
        ? gateway.claimCoupon(slug)
        : Promise.resolve({ kind: 'unavailable', reason: 'not_found' }),
  }
}

// Callers share one promise per key, so React's use() sees a stable promise.
// A failed load is forgotten so the next call can retry.
function loadOnce<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const cached = cache.get(key)
  if (cached) return cached

  const promise = load()
  cache.set(key, promise)
  promise.catch(() => cache.delete(key))
  return promise
}
