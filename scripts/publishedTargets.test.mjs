import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseTargetManifest } from '../src/domain/targetManifest.ts'

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

// Guards against changing the seed without running `npm run targets:build`.
describe('published target files', () => {
  const manifest = parseTargetManifest(
    readJson('public/targets/targets.manifest.json'),
  )

  it('has a valid manifest whose mind file exists', () => {
    expect(manifest).not.toBeNull()
    expect(existsSync(`public${manifest.mindUrl}`)).toBe(true)
  })

  it('lists the seeded targets in index order', () => {
    const seeded = readJson('server/seed/seed.json')
      .products.flatMap(({ slug, targets }) =>
        targets.map(({ index }) => ({ slug, index })),
      )
      .sort((a, b) => a.index - b.index)
      .map(({ slug }) => slug)

    expect(manifest.slugs).toEqual(seeded)
  })

  it('has an image for every seeded target', () => {
    const images = readJson('server/seed/seed.json').products.flatMap(
      ({ targets }) => targets.map(({ imageFile }) => imageFile),
    )

    for (const image of images) {
      expect(existsSync(`targets/images/${image}`)).toBe(true)
    }
  })
})
