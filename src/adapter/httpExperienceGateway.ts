import type {
  ClaimedCoupon,
  ClaimOutcome,
  CouponOffer,
  CouponStatus,
  ProductExperience,
} from '../domain/experience'
import type { ExperienceGateway } from '../usecase/productExperience'

const REQUEST_TIMEOUT_MS = 8000
const COUPON_STATUSES: readonly string[] = [
  'available',
  'sold_out',
  'not_started',
  'ended',
] satisfies CouponStatus[]

type Json = Record<string, unknown>

function productUrl(slug: string, resource: string): string {
  return `/api/v1/products/${encodeURIComponent(slug)}/${resource}`
}

export function createHttpExperienceGateway(
  fetchFn: typeof fetch,
): ExperienceGateway {
  return {
    async fetchExperience(slug) {
      const response = await fetchFn(productUrl(slug, 'experience'), {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (response.status === 404) return null
      if (!response.ok) {
        throw new Error(`Experience request failed: ${response.status}`)
      }
      const experience = parseExperience(await response.json())
      if (!experience) throw new Error('Experience response is malformed')
      return experience
    },

    async claimCoupon(slug) {
      try {
        const response = await fetchFn(productUrl(slug, 'coupon-claims'), {
          method: 'POST',
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
        return toClaimOutcome(response.status, await response.json())
      } catch {
        return { kind: 'failed' }
      }
    },
  }
}

function toClaimOutcome(status: number, body: unknown): ClaimOutcome {
  if (status === 200 || status === 201) {
    const coupon = parseClaimedCoupon(body)
    return coupon ? { kind: 'claimed', coupon } : { kind: 'failed' }
  }

  const code = isJson(body) && isJson(body.error) ? body.error.code : undefined
  if (code === 'coupon_sold_out') {
    return { kind: 'unavailable', reason: 'sold_out' }
  }
  if (code === 'coupon_not_active') {
    return { kind: 'unavailable', reason: 'not_active' }
  }
  if (status === 404) return { kind: 'unavailable', reason: 'not_found' }
  return { kind: 'failed' }
}

function parseExperience(value: unknown): ProductExperience | null {
  const fields = pickStrings(value, ['slug', 'name', 'summary', 'description'])
  if (!fields || !isJson(value)) return null

  const coupon = value.coupon === null ? null : parseCouponOffer(value.coupon)
  return coupon === undefined ? null : { ...fields, coupon }
}

function parseCouponOffer(value: unknown): CouponOffer | undefined {
  const fields = pickStrings(value, ['title', 'terms', 'endsAt', 'status'])
  if (!fields || !isCouponStatus(fields.status)) return undefined
  return { ...fields, status: fields.status }
}

function parseClaimedCoupon(value: unknown): ClaimedCoupon | null {
  return pickStrings(value, ['code', 'title', 'terms', 'endsAt'])
}

function isCouponStatus(value: string): value is CouponStatus {
  return COUPON_STATUSES.includes(value)
}

function isJson(value: unknown): value is Json {
  return typeof value === 'object' && value !== null
}

function pickStrings<Key extends string>(
  value: unknown,
  keys: readonly Key[],
): Record<Key, string> | null {
  if (!isJson(value)) return null

  const picked = {} as Record<Key, string>
  for (const key of keys) {
    const field = value[key]
    if (typeof field !== 'string') return null
    picked[key] = field
  }
  return picked
}
