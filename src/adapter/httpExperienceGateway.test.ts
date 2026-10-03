import { describe, expect, it, vi } from 'vitest'
import { bookCoupon, bookExperience } from '../test/fixtures'
import { createHttpExperienceGateway } from './httpExperienceGateway'

function setup(status: number, body: unknown) {
  const fetchFn = vi.fn<typeof fetch>(async () =>
    typeof body === 'string'
      ? new Response(body, { status })
      : Response.json(body, { status }),
  )
  return { fetchFn, gateway: createHttpExperienceGateway(fetchFn) }
}

const errorBody = (code: string) => ({ error: { code, message: 'text' } })

describe('fetchExperience', () => {
  it('requests the product experience with a timeout', async () => {
    const { gateway, fetchFn } = setup(200, bookExperience)

    expect(await gateway.fetchExperience('book')).toEqual(bookExperience)
    expect(fetchFn).toHaveBeenCalledExactlyOnceWith(
      '/api/v1/products/book/experience',
      { signal: expect.any(AbortSignal) },
    )
  })

  it('accepts a product without a coupon', async () => {
    const { gateway } = setup(200, { ...bookExperience, coupon: null })

    expect(await gateway.fetchExperience('book')).toMatchObject({
      coupon: null,
    })
  })

  it('drops fields the app does not know', async () => {
    const { gateway } = setup(200, { ...bookExperience, internalId: 7 })

    expect(await gateway.fetchExperience('book')).toEqual(bookExperience)
  })

  it('encodes the slug in the URL', async () => {
    const { gateway, fetchFn } = setup(404, errorBody('product_not_found'))

    await gateway.fetchExperience('a/b?c')

    expect(fetchFn.mock.calls[0]![0]).toBe(
      '/api/v1/products/a%2Fb%3Fc/experience',
    )
  })

  it('returns null for a product that is not registered', async () => {
    const { gateway } = setup(404, errorBody('product_not_found'))

    expect(await gateway.fetchExperience('book')).toBeNull()
  })

  it.each([400, 429, 500, 503])('rejects on status %i', async (status) => {
    const { gateway } = setup(status, errorBody('any'))

    await expect(gateway.fetchExperience('book')).rejects.toThrow(
      `Experience request failed: ${status}`,
    )
  })

  it.each([
    ['not JSON', '<html>'],
    ['null', null],
    ['a missing name', { ...bookExperience, name: undefined }],
    ['a numeric summary', { ...bookExperience, summary: 3 }],
    ['a missing coupon field', { ...bookExperience, coupon: undefined }],
    ['a coupon that is a string', { ...bookExperience, coupon: 'yes' }],
    [
      'an unknown coupon status',
      { ...bookExperience, coupon: { ...bookExperience.coupon, status: 'x' } },
    ],
    [
      'a coupon without terms',
      { ...bookExperience, coupon: { ...bookExperience.coupon, terms: null } },
    ],
  ])('rejects a body that is %s', async (_label, body) => {
    const { gateway } = setup(200, body)

    await expect(gateway.fetchExperience('book')).rejects.toThrow()
  })

  it('rejects when the request fails or times out', async () => {
    const fetchFn = vi.fn<typeof fetch>(() =>
      Promise.reject(new DOMException('timed out', 'TimeoutError')),
    )

    await expect(
      createHttpExperienceGateway(fetchFn).fetchExperience('book'),
    ).rejects.toThrow('timed out')
  })
})

describe('claimCoupon', () => {
  it('posts to the claim URL without a body', async () => {
    const { gateway, fetchFn } = setup(201, bookCoupon)

    await gateway.claimCoupon('a b')

    expect(fetchFn).toHaveBeenCalledExactlyOnceWith(
      '/api/v1/products/a%20b/coupon-claims',
      { method: 'POST', signal: expect.any(AbortSignal) },
    )
  })

  it.each([201, 200])('returns the coupon on status %i', async (status) => {
    const { gateway } = setup(status, { ...bookCoupon, extra: true })

    expect(await gateway.claimCoupon('book')).toEqual({
      kind: 'claimed',
      coupon: bookCoupon,
    })
  })

  it.each([
    [409, 'coupon_sold_out', 'sold_out'],
    [409, 'coupon_not_active', 'not_active'],
    [404, 'coupon_not_found', 'not_found'],
    [404, 'product_not_found', 'not_found'],
  ])('maps %i %s to unavailable: %s', async (status, code, reason) => {
    const { gateway } = setup(status, errorBody(code))

    expect(await gateway.claimCoupon('book')).toEqual({
      kind: 'unavailable',
      reason,
    })
  })

  it.each([
    ['a rate limit', 429, errorBody('rate_limited')],
    ['a busy server', 503, errorBody('try_again')],
    ['a server error', 500, errorBody('internal_error')],
    ['a bad request', 400, errorBody('invalid_slug')],
    ['an unknown conflict', 409, errorBody('other')],
    ['a body that is not JSON', 201, '<html>'],
    ['a coupon without a code', 201, { ...bookCoupon, code: undefined }],
    ['an error without a body', 409, null],
  ])('fails on %s', async (_label, status, body) => {
    const { gateway } = setup(status, body)

    expect(await gateway.claimCoupon('book')).toEqual({ kind: 'failed' })
  })

  it('fails when the request fails or times out', async () => {
    const fetchFn = vi.fn<typeof fetch>(() =>
      Promise.reject(new TypeError('network')),
    )

    expect(
      await createHttpExperienceGateway(fetchFn).claimCoupon('book'),
    ).toEqual({ kind: 'failed' })
  })
})
