import { describe, expect, it } from 'vitest'
import { MAX_TARGETS, parseTargetManifest } from './targetManifest'

const MIND_URL = '/targets/targets-07a7ebdd.mind'
const target = (slug: string) => ({
  slug,
  name: `Sample ${slug}`,
  imageUrl: `/targets/images/${slug}.jpg`,
})
const targets = (count: number) =>
  Array.from({ length: count }, (_, index) => target(`book-${index}`))
const manifestOf = (...list: unknown[]) => ({
  mindUrl: MIND_URL,
  targets: list,
})

describe('parseTargetManifest', () => {
  it('returns the mind URL and the targets in target order', () => {
    expect(
      parseTargetManifest(
        manifestOf(target('book'), target('box'), target('book')),
      ),
    ).toEqual({
      mindUrl: MIND_URL,
      targets: [
        {
          slug: 'book',
          name: 'Sample book',
          imageUrl: '/targets/images/book.jpg',
        },
        {
          slug: 'box',
          name: 'Sample box',
          imageUrl: '/targets/images/box.jpg',
        },
        {
          slug: 'book',
          name: 'Sample book',
          imageUrl: '/targets/images/book.jpg',
        },
      ],
    })
  })

  it('drops fields it does not know', () => {
    expect(
      parseTargetManifest(manifestOf({ ...target('book'), id: 7 }))?.targets,
    ).toEqual([target('book')])
  })

  it('accepts the maximum number of targets', () => {
    expect(
      parseTargetManifest({ mindUrl: MIND_URL, targets: targets(MAX_TARGETS) })
        ?.targets,
    ).toHaveLength(MAX_TARGETS)
  })

  it.each([
    ['null', null],
    ['a string', 'manifest'],
    ['an array', []],
    ['no mindUrl', { targets: targets(1) }],
    ['no targets', { mindUrl: MIND_URL }],
    ['targets that are not a list', { mindUrl: MIND_URL, targets: 'book' }],
    ['zero targets', manifestOf()],
    ['too many targets', { mindUrl: MIND_URL, targets: targets(21) }],
    ['a target that is not an object', manifestOf('book')],
    ['a null target', manifestOf(null)],
    [
      'a target without a slug',
      manifestOf({ ...target('book'), slug: undefined }),
    ],
    ['an invalid slug', manifestOf({ ...target('book'), slug: '../etc' })],
    ['a numeric slug', manifestOf({ ...target('book'), slug: 7 })],
    [
      'a target without a name',
      manifestOf({ ...target('book'), name: undefined }),
    ],
    ['a blank name', manifestOf({ ...target('book'), name: '  ' })],
    ['a numeric name', manifestOf({ ...target('book'), name: 7 })],
    [
      'a name that is too long',
      manifestOf({ ...target('book'), name: 'a'.repeat(121) }),
    ],
    [
      'a target without an image',
      manifestOf({ ...target('book'), imageUrl: undefined }),
    ],
    [
      'one bad target after a good one',
      manifestOf(target('book'), { slug: 'box' }),
    ],
  ])('rejects %s', (_label, value) => {
    expect(parseTargetManifest(value)).toBeNull()
  })

  it.each([
    'https://evil.example/targets/targets-07a7ebdd.mind',
    '//evil.example/targets/targets-07a7ebdd.mind',
    '/targets/../secret/targets-07a7ebdd.mind',
    '/targets/targets-07a7ebdd.mind?x=1',
    '/targets/targets.mind',
    '/models/targets-07a7ebdd.mind',
    'javascript:alert(1)',
    '',
  ])('rejects the mind URL %j', (mindUrl) => {
    expect(parseTargetManifest({ mindUrl, targets: targets(1) })).toBeNull()
  })

  it.each([
    'https://evil.example/targets/images/book.jpg',
    '//evil.example/targets/images/book.jpg',
    '/targets/images/../../secret.jpg',
    '/targets/images/book.jpg?x=1',
    '/targets/images/book.svg',
    '/targets/images/Book.jpg',
    '/models/book.jpg',
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    '',
  ])('rejects the image URL %j', (imageUrl) => {
    expect(
      parseTargetManifest(manifestOf({ ...target('book'), imageUrl })),
    ).toBeNull()
  })

  it.each(['book.jpg', 'front-cover-2.jpeg', 'box.png'])(
    'accepts the image file %j',
    (file) => {
      const imageUrl = `/targets/images/${file}`

      expect(
        parseTargetManifest(manifestOf({ ...target('book'), imageUrl }))
          ?.targets[0]?.imageUrl,
      ).toBe(imageUrl)
    },
  )
})
