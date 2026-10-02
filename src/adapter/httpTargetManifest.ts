import { parseTargetManifest } from '../domain/targetManifest'
import type { TargetManifestSource } from '../usecase/productExperience'

const MANIFEST_URL = '/targets/targets.manifest.json'
const REQUEST_TIMEOUT_MS = 8000

export function createHttpTargetManifestSource(
  fetchFn: typeof fetch,
): TargetManifestSource {
  return {
    async load() {
      const response = await fetchFn(MANIFEST_URL, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (!response.ok) {
        throw new Error(`Target manifest request failed: ${response.status}`)
      }
      const manifest = parseTargetManifest(await response.json())
      if (!manifest) throw new Error('Target manifest is malformed')
      return manifest
    },
  }
}
