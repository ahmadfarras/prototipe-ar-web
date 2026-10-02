import { describe, expect, it, vi } from 'vitest'
import type { ClaimOutcome } from '../domain/experience'
import { bookCoupon, bookExperience, manifest } from '../test/fixtures'
import { createProductExperiences } from './productExperience'

function setup() {
  const gateway = {
    fetchExperience: vi.fn(async () => bookExperience),
    claimCoupon: vi.fn(async (): Promise<ClaimOutcome> => ({
      kind: 'claimed',
      coupon: bookCoupon,
    })),
  }
  const manifestSource = { load: vi.fn(async () => manifest) }
  const experiences = createProductExperiences(gateway, manifestSource)
  return { gateway, manifestSource, experiences }
}

describe('getExperience', () => {
  it('returns the experience from the gateway', async () => {
    const { experiences, gateway } = setup()

    expect(await experiences.getExperience('book')).toBe(bookExperience)
    expect(gateway.fetchExperience).toHaveBeenCalledWith('book')
  })

  it('shares one request between repeated and concurrent calls', async () => {
    const { experiences, gateway } = setup()

    const first = experiences.getExperience('book')
    const second = experiences.getExperience('book')
    await first
    const third = experiences.getExperience('book')

    expect(second).toBe(first)
    expect(third).toBe(first)
    expect(gateway.fetchExperience).toHaveBeenCalledTimes(1)
  })

  it('loads each product separately', async () => {
    const { experiences, gateway } = setup()

    await experiences.getExperience('book')
    await experiences.getExperience('box')

    expect(gateway.fetchExperience).toHaveBeenCalledTimes(2)
  })

  it('caches an unregistered product as null', async () => {
    const { experiences, gateway } = setup()
    gateway.fetchExperience.mockResolvedValue(null as never)

    expect(await experiences.getExperience('book')).toBeNull()
    expect(await experiences.getExperience('book')).toBeNull()
    expect(gateway.fetchExperience).toHaveBeenCalledTimes(1)
  })

  it('retries after a failed load', async () => {
    const { experiences, gateway } = setup()
    gateway.fetchExperience.mockRejectedValueOnce(new Error('offline'))

    await expect(experiences.getExperience('book')).rejects.toThrow('offline')

    expect(await experiences.getExperience('book')).toBe(bookExperience)
    expect(gateway.fetchExperience).toHaveBeenCalledTimes(2)
  })

  it.each(['', 'Book', '../etc'])(
    'resolves null for the invalid slug %j without a request',
    async (slug) => {
      const { experiences, gateway } = setup()

      expect(await experiences.getExperience(slug)).toBeNull()
      expect(gateway.fetchExperience).not.toHaveBeenCalled()
    },
  )
})

describe('claimCoupon', () => {
  it.each<ClaimOutcome>([
    { kind: 'claimed', coupon: bookCoupon },
    { kind: 'unavailable', reason: 'sold_out' },
    { kind: 'failed' },
  ])('passes the outcome $kind through', async (outcome) => {
    const { experiences, gateway } = setup()
    gateway.claimCoupon.mockResolvedValue(outcome)

    expect(await experiences.claimCoupon('book')).toEqual(outcome)
    expect(gateway.claimCoupon).toHaveBeenCalledWith('book')
  })

  it('sends every claim to the gateway', async () => {
    const { experiences, gateway } = setup()

    await experiences.claimCoupon('book')
    await experiences.claimCoupon('book')

    expect(gateway.claimCoupon).toHaveBeenCalledTimes(2)
  })

  it('does not send a claim for an invalid slug', async () => {
    const { experiences, gateway } = setup()

    expect(await experiences.claimCoupon('../etc')).toEqual({
      kind: 'unavailable',
      reason: 'not_found',
    })
    expect(gateway.claimCoupon).not.toHaveBeenCalled()
  })
})

describe('loadManifest', () => {
  it('loads the manifest once', async () => {
    const { experiences, manifestSource } = setup()

    const first = experiences.loadManifest()

    expect(experiences.loadManifest()).toBe(first)
    expect(await first).toBe(manifest)
    expect(manifestSource.load).toHaveBeenCalledTimes(1)
  })

  it('retries after a failed load', async () => {
    const { experiences, manifestSource } = setup()
    manifestSource.load.mockRejectedValueOnce(new Error('offline'))

    await expect(experiences.loadManifest()).rejects.toThrow('offline')

    expect(await experiences.loadManifest()).toBe(manifest)
  })
})
