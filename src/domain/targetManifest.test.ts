import { describe, expect, it } from 'vitest'
import { MAX_TARGETS, parseTargetManifest } from './targetManifest'

const MIND_URL = '/targets/targets-07a7ebdd.mind'
const targets = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ slug: `book-${index}` }))

describe('parseTargetManifest', () => {
  it('returns the mind URL and the slugs in target order', () => {
    expect(
      parseTargetManifest({
        mindUrl: MIND_URL,
        targets: [{ slug: 'book' }, { slug: 'box' }, { slug: 'book' }],
      }),
    ).toEqual({ mindUrl: MIND_URL, slugs: ['book', 'box', 'book'] })
  })

  it('accepts the maximum number of targets', () => {
    expect(
      parseTargetManifest({ mindUrl: MIND_URL, targets: targets(MAX_TARGETS) })
        ?.slugs,
    ).toHaveLength(MAX_TARGETS)
  })

  it.each([
    ['null', null],
    ['a string', 'manifest'],
    ['an array', []],
    ['no mindUrl', { targets: targets(1) }],
    ['no targets', { mindUrl: MIND_URL }],
    ['targets that are not a list', { mindUrl: MIND_URL, targets: 'book' }],
    ['zero targets', { mindUrl: MIND_URL, targets: [] }],
    ['too many targets', { mindUrl: MIND_URL, targets: targets(21) }],
    [
      'a target that is not an object',
      { mindUrl: MIND_URL, targets: ['book'] },
    ],
    ['a null target', { mindUrl: MIND_URL, targets: [null] }],
    ['a target without a slug', { mindUrl: MIND_URL, targets: [{}] }],
    ['an invalid slug', { mindUrl: MIND_URL, targets: [{ slug: '../etc' }] }],
    ['a numeric slug', { mindUrl: MIND_URL, targets: [{ slug: 7 }] }],
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
})
