import { chromium } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { usdzUrlFor } from './usdzPath.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const CATALOG_FILE = path.join(ROOT, 'src/adapter/products.json')
const PUBLIC_DIR = path.join(ROOT, 'public')

// The same conversion Safari runs on a tap of "View in AR". Browsers such as
// Chrome on iOS cannot hand that in-memory result to AR Quick Look, so it is
// saved as a file they can link to.
async function exportUsdz(page, origin, slug) {
  await page.goto(`${origin}/view-in-ar/p/${slug}`)
  const viewer = page.locator('model-viewer')
  await viewer.evaluate(
    (element) =>
      element.loaded ||
      new Promise((resolve, reject) => {
        element.addEventListener('load', resolve, { once: true })
        element.addEventListener('error', reject, { once: true })
      }),
  )
  const dataUrl = await viewer.evaluate(async (element) => {
    const blob = await (await fetch(await element.prepareUSDZ())).blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener('load', () => resolve(reader.result))
      reader.addEventListener('error', () => reject(reader.error))
      reader.readAsDataURL(blob)
    })
  })
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')
}

const products = JSON.parse(await readFile(CATALOG_FILE, 'utf8'))
const server = await createServer({ root: ROOT, logLevel: 'error' })
await server.listen(0)
const browser = await chromium.launch()
try {
  const { port } = server.httpServer.address()
  const page = await browser.newPage()
  for (const { slug, modelUrl } of products) {
    const usdzUrl = usdzUrlFor(modelUrl)
    const usdz = await exportUsdz(page, `http://localhost:${port}`, slug)
    await writeFile(path.join(PUBLIC_DIR, usdzUrl), usdz)
    console.log(`${modelUrl} -> ${usdzUrl} (${usdz.length} bytes)`)
  }
} finally {
  await browser.close()
  await server.close()
}
