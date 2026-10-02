import type { FastifyInstance } from 'fastify'
import type { ClaimedCoupon, ClaimOutcome } from '../../domain/coupon.ts'
import {
  MAX_SLUG_LENGTH,
  SLUG_PATTERN,
  type ProductExperience,
} from '../../domain/product.ts'
import type { ClaimCoupon } from '../../usecase/claimCoupon.ts'
import type { GetProductExperience } from '../../usecase/getProductExperience.ts'
import { sendError } from './errors.ts'
import { readOrIssueVisitorId } from './visitorCookie.ts'

export type RouteDeps = {
  getProductExperience: GetProductExperience
  claimCoupon: ClaimCoupon
  checkHealth: () => Promise<void>
}

export type RouteOptions = {
  cookieSecure: boolean
  claimsPerMinute: number
}

type SlugRoute = { Params: { slug: string } }

const slugParams = {
  type: 'object',
  required: ['slug'],
  properties: {
    slug: {
      type: 'string',
      maxLength: MAX_SLUG_LENGTH,
      pattern: SLUG_PATTERN.source,
    },
  },
}

type RejectedClaim = Exclude<
  ClaimOutcome['kind'],
  'claimed' | 'already_claimed'
>

const CLAIM_ERRORS: Record<RejectedClaim, [number, string, string]> = {
  product_not_found: [
    404,
    'product_not_found',
    'This product is not registered.',
  ],
  coupon_not_found: [404, 'coupon_not_found', 'This product has no coupon.'],
  sold_out: [409, 'coupon_sold_out', 'All coupons have been claimed.'],
  not_active: [409, 'coupon_not_active', 'This offer is not active.'],
}

export function registerRoutes(
  app: FastifyInstance,
  deps: RouteDeps,
  options: RouteOptions,
): void {
  app.get('/api/v1/health', async (_request, reply) => {
    try {
      await deps.checkHealth()
    } catch (error) {
      app.log.error(error)
      return sendError(reply, 503, 'unavailable', 'The service is unavailable.')
    }
    return { status: 'ok' }
  })

  app.get<SlugRoute>(
    '/api/v1/products/:slug/experience',
    { schema: { params: slugParams } },
    async (request, reply) => {
      const experience = await deps.getProductExperience(request.params.slug)
      if (!experience) {
        return sendError(reply, ...CLAIM_ERRORS.product_not_found)
      }
      reply.header('cache-control', 'public, max-age=30')
      return toExperienceResponse(experience)
    },
  )

  app.post<SlugRoute>(
    '/api/v1/products/:slug/coupon-claims',
    {
      schema: { params: slugParams },
      config: {
        rateLimit: { max: options.claimsPerMinute, timeWindow: '1 minute' },
      },
    },
    async (request, reply) => {
      const visitorId = readOrIssueVisitorId(
        request,
        reply,
        options.cookieSecure,
      )
      const outcome = await deps.claimCoupon(request.params.slug, visitorId)
      if (outcome.kind !== 'claimed' && outcome.kind !== 'already_claimed') {
        return sendError(reply, ...CLAIM_ERRORS[outcome.kind])
      }
      return reply
        .code(outcome.kind === 'claimed' ? 201 : 200)
        .header('cache-control', 'no-store')
        .send(toClaimResponse(outcome.coupon))
    },
  )
}

function toExperienceResponse(experience: ProductExperience) {
  const { coupon } = experience
  return {
    slug: experience.slug,
    name: experience.name,
    summary: experience.summary,
    description: experience.description,
    coupon: coupon && {
      title: coupon.title,
      terms: coupon.terms,
      endsAt: coupon.endsAt.toISOString(),
      status: coupon.status,
    },
  }
}

function toClaimResponse(coupon: ClaimedCoupon) {
  return {
    code: coupon.code,
    title: coupon.title,
    terms: coupon.terms,
    endsAt: coupon.endsAt.toISOString(),
  }
}
