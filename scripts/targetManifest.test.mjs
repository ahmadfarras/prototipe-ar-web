import { describe, expect, it } from 'vitest'
import {
  buildManifest,
  MAX_TARGETS,
  mindFileName,
  validateTargets,
} from './targetManifest.mjs'

const row = (targetIndex, slug = 'book') => ({
  targetIndex,
  slug,
  name: `Sample ${slug}`,
  imageFile: `${targetIndex}.jpg`,
})
const rows = (count) => Array.from({ length: count }, (_, index) => row(index))
const images = (count) => new Set(rows(count).map((r) => r.imageFile))

describe('validateTargets', () => {
  it.each([1, 2, MAX_TARGETS])('accepts %i contiguous targets', (count) => {
    expect(() => validateTargets(rows(count), images(count))).not.toThrow()
  })

  it('accepts two targets of the same product', () => {
    expect(() =>
      validateTargets([row(0, 'book'), row(1, 'book')], images(2)),
    ).not.toThrow()
  })

  it('rejects an empty registry', () => {
    expect(() => validateTargets([], new Set())).toThrow(
      'No registered targets found',
    )
  })

  it('rejects more targets than the limit', () => {
    const count = MAX_TARGETS + 1

    expect(() => validateTargets(rows(count), images(count))).toThrow(
      '21 targets registered; the limit is 20',
    )
  })

  it.each([
    ['a gap', [row(0), row(2)]],
    ['a start above zero', [row(1), row(2)]],
  ])('rejects %s in the indexes', (_label, input) => {
    expect(() => validateTargets(input, images(3))).toThrow(
      'Target indexes must be 0..1 without gaps',
    )
  })

  it.each(['../secret.jpg', 'Cover.jpg', 'my cover.jpg', 'cover.gif', 'cover'])(
    'rejects the image file name %j',
    (imageFile) => {
      expect(() =>
        validateTargets([{ ...row(0), imageFile }], new Set([imageFile])),
      ).toThrow(`ending in .jpg, .jpeg or .png: ${imageFile}`)
    },
  )

  it.each(['cover.jpg', 'front-cover-2.jpeg', 'box.png'])(
    'accepts the image file name %j',
    (imageFile) => {
      expect(() =>
        validateTargets([{ ...row(0), imageFile }], new Set([imageFile])),
      ).not.toThrow()
    },
  )

  it('rejects a target whose image is missing', () => {
    expect(() => validateTargets(rows(2), images(1))).toThrow(
      'Image not found in public/targets/images: 1.jpg',
    )
  })
})

describe('mindFileName', () => {
  it('names the file after the first 8 hex digits of its sha256', () => {
    expect(mindFileName(Buffer.from('abc'))).toBe('targets-ba7816bf.mind')
  })

  it('changes with the content', () => {
    expect(mindFileName(Buffer.from('abd'))).not.toBe('targets-ba7816bf.mind')
  })
})

describe('buildManifest', () => {
  it('lists each target with its product name and image in target order', () => {
    expect(
      buildManifest(
        [row(0, 'book'), row(1, 'box'), row(2, 'book')],
        'targets-ba7816bf.mind',
      ),
    ).toEqual({
      mindUrl: '/targets/targets-ba7816bf.mind',
      targets: [
        {
          slug: 'book',
          name: 'Sample book',
          imageUrl: '/targets/images/0.jpg',
        },
        { slug: 'box', name: 'Sample box', imageUrl: '/targets/images/1.jpg' },
        {
          slug: 'book',
          name: 'Sample book',
          imageUrl: '/targets/images/2.jpg',
        },
      ],
    })
  })
})
