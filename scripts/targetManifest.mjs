import { createHash } from 'node:crypto'

export const MAX_TARGETS = 20

// rows: [{ targetIndex, slug, imageFile }] ordered by targetIndex.
export function validateTargets(rows, imageFiles) {
  if (rows.length === 0) throw new Error('No registered targets found')
  if (rows.length > MAX_TARGETS) {
    throw new Error(
      `${rows.length} targets registered; the limit is ${MAX_TARGETS}`,
    )
  }
  rows.forEach((row, position) => {
    if (row.targetIndex !== position) {
      throw new Error(
        `Target indexes must be 0..${rows.length - 1} without gaps; found ${row.targetIndex} at position ${position}`,
      )
    }
    if (!imageFiles.has(row.imageFile)) {
      throw new Error(`Image not found in targets/images: ${row.imageFile}`)
    }
  })
}

export function mindFileName(mindData) {
  const hash = createHash('sha256').update(mindData).digest('hex').slice(0, 8)
  return `targets-${hash}.mind`
}

export function buildManifest(rows, fileName) {
  return {
    mindUrl: `/targets/${fileName}`,
    targets: rows.map(({ slug }) => ({ slug })),
  }
}
