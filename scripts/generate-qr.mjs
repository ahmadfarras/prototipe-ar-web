import { mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import { buildProductQrUrl } from './productQrUrl.mjs'

const CATALOG_URL = new URL('../src/adapter/products.json', import.meta.url)
const OUTPUT_DIR = new URL('../qr/', import.meta.url)

const baseUrl = process.argv[2]
if (!baseUrl) {
  console.error('Usage: npm run qr -- <base-url>   e.g. https://ar.example.com')
  process.exit(1)
}

const products = JSON.parse(await readFile(CATALOG_URL, 'utf8'))
await mkdir(OUTPUT_DIR, { recursive: true })

for (const { slug } of products) {
  const url = buildProductQrUrl(baseUrl, slug)
  const file = new URL(`${slug}.svg`, OUTPUT_DIR)
  await QRCode.toFile(fileURLToPath(file), url, { type: 'svg', margin: 2 })
  console.log(`qr/${slug}.svg -> ${url}`)
}
