import { describe, expect, it, vi } from 'vitest'
import { createHttpTargetManifestSource } from './httpTargetManifest'

const published = {
  mindUrl: '/targets/targets-07a7ebdd.mind',
  targets: [{ slug: 'book' }, { slug: 'box' }],
}

function setup(status: number, body: unknown) {
  const fetchFn = vi.fn<typeof fetch>(async () =>
    Response.json(body, { status }),
  )
  return { fetchFn, source: createHttpTargetManifestSource(fetchFn) }
}

describe('httpTargetManifestSource', () => {
  it('loads and parses the published manifest', async () => {
    const { source, fetchFn } = setup(200, published)

    expect(await source.load()).toEqual({
      mindUrl: '/targets/targets-07a7ebdd.mind',
      slugs: ['book', 'box'],
    })
    expect(fetchFn).toHaveBeenCalledExactlyOnceWith(
      '/targets/targets.manifest.json',
      { signal: expect.any(AbortSignal) },
    )
  })

  it('rejects when the manifest is missing', async () => {
    const { source } = setup(404, {})

    await expect(source.load()).rejects.toThrow(
      'Target manifest request failed: 404',
    )
  })

  it('rejects a manifest that points to another origin', async () => {
    const { source } = setup(200, {
      mindUrl: 'https://evil.example/targets/targets-07a7ebdd.mind',
      targets: [{ slug: 'book' }],
    })

    await expect(source.load()).rejects.toThrow('Target manifest is malformed')
  })
})
