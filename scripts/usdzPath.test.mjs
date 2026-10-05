import { describe, expect, it } from 'vitest'
import { usdzUrlFor } from './usdzPath.mjs'

describe('usdzUrlFor', () => {
  it('puts the USDZ next to the GLB', () => {
    expect(usdzUrlFor('/models/water-bottle.glb')).toBe(
      '/models/water-bottle.usdz',
    )
  })

  it.each([
    '/models/../secret.glb',
    '/models/nested/chair.glb',
    '/other/chair.glb',
    'https://example.com/models/chair.glb',
    '/models/chair.gltf',
    '',
  ])('rejects %j', (modelUrl) => {
    expect(() => usdzUrlFor(modelUrl)).toThrow('Not a /models/<name>.glb URL')
  })
})
