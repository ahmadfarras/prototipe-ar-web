import { chromium } from '@playwright/test'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import {
  buildManifest,
  mindFileName,
  validateTargets,
} from './targetManifest.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const IMAGE_DIR = path.join(ROOT, 'targets/images')
const LIBRARY_DIR = path.join(ROOT, 'src/vendor/mind-ar')
const OUTPUT_DIR = path.join(ROOT, 'public/targets')
const MANIFEST_FILE = 'targets.manifest.json'
// Never contacted: every request to it is answered from disk.
const ORIGIN = 'http://targets.local'

async function readRegisteredTargets(databaseUrl) {
  const pool = new pg.Pool({ connectionString: databaseUrl })
  try {
    const { rows } = await pool.query(
      `SELECT t.target_index AS "targetIndex", p.slug, t.image_file AS "imageFile"
       FROM ar_targets t JOIN products p ON p.id = t.product_id
       ORDER BY t.target_index`,
    )
    return rows
  } finally {
    await pool.end()
  }
}

// MindAR's compiler needs a browser (canvas and WebGL), so it runs in headless Chromium.
async function compileTargets(imageFiles) {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.route(`${ORIGIN}/**`, (route) => {
      const { pathname } = new URL(route.request().url())
      if (pathname === '/') {
        return route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html>',
        })
      }
      const [, folder, file] = pathname.split('/')
      const directory = folder === 'library' ? LIBRARY_DIR : IMAGE_DIR
      return route.fulfill({ path: path.join(directory, path.basename(file)) })
    })
    await page.goto(ORIGIN)

    const base64 = await page.evaluate(async (files) => {
      const { Compiler } = await import('/library/mindar-image.prod.js')
      const images = await Promise.all(
        files.map(
          (file) =>
            new Promise((resolve, reject) => {
              const image = new Image()
              image.onload = () => resolve(image)
              image.onerror = () => reject(new Error(`Cannot load ${file}`))
              image.src = `/images/${encodeURIComponent(file)}`
            }),
        ),
      )
      const compiler = new Compiler()
      await compiler.compileImageTargets(images, () => {})
      const bytes = new Uint8Array(compiler.exportData())
      let binary = ''
      for (const byte of bytes) binary += String.fromCharCode(byte)
      return btoa(binary)
    }, imageFiles)

    return Buffer.from(base64, 'base64')
  } finally {
    await browser.close()
  }
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const targets = await readRegisteredTargets(databaseUrl)
validateTargets(targets, new Set(await readdir(IMAGE_DIR)))

console.log(`Compiling ${targets.length} targets…`)
const mindData = await compileTargets(targets.map((target) => target.imageFile))
const fileName = mindFileName(mindData)
const manifest = buildManifest(targets, fileName)

await mkdir(OUTPUT_DIR, { recursive: true })
await writeFile(path.join(OUTPUT_DIR, fileName), mindData)
await writeFile(
  path.join(OUTPUT_DIR, MANIFEST_FILE),
  `${JSON.stringify(manifest, null, 2)}\n`,
)
for (const file of await readdir(OUTPUT_DIR)) {
  if (file.endsWith('.mind') && file !== fileName) {
    await rm(path.join(OUTPUT_DIR, file))
  }
}

console.log(`public/targets/${fileName} (${mindData.length} bytes)`)
for (const [index, { slug }] of manifest.targets.entries()) {
  console.log(`  ${index} -> ${slug}`)
}
