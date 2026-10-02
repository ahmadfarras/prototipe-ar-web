import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { Pool } from 'pg'
import { cameraTrackStates, showImageToCamera } from './camera.ts'
import { collectErrors } from './console.ts'
import { E2E_DATABASE_URL } from './database.ts'

const CAMERA = { width: 480, height: 640 }
const DETECTION_TIMEOUT = 30_000
const OTHER_VISITOR = '99999999-9999-4999-8999-999999999999'

const db = new Pool({ connectionString: E2E_DATABASE_URL })
test.afterAll(() => db.end())

async function pointCameraAt(page: Page, imagePath: string) {
  const image = await readFile(imagePath)
  await showImageToCamera(
    page,
    `data:image/jpeg;base64,${image.toString('base64')}`,
    CAMERA,
  )
}

async function startScanning(page: Page) {
  await page.goto('/scan')
  await page.getByRole('button', { name: 'Start camera' }).click()
}

async function claimsOf(slug: string) {
  const { rows } = await db.query<{ code: string; claimed_count: number }>(
    `SELECT cl.code, c.claimed_count
     FROM products p
     JOIN coupon_campaigns c ON c.product_id = p.id
     JOIN coupon_claims cl ON cl.campaign_id = c.id
     WHERE p.slug = $1`,
    [slug],
  )
  return rows
}

test('a registered product shows its anchored card and explanation', async ({
  page,
  baseURL,
}) => {
  const errors = collectErrors(page)
  const foreignRequests: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (!url.startsWith(baseURL!) && !/^(data|blob):/.test(url)) {
      foreignRequests.push(url)
    }
  })
  await pointCameraAt(page, 'targets/images/peter-rabbit.jpg')

  await startScanning(page)

  const card = page.getByRole('region', { name: 'Product' })
  await expect(
    card.getByRole('heading', { name: 'The Tale of Peter Rabbit' }),
  ).toBeVisible({ timeout: DETECTION_TIMEOUT })
  await expect(page.getByRole('status')).toHaveText('Product recognised.')

  const about = card.getByRole('button', { name: 'About this product' })
  await about.click()

  const dialog = page.getByRole('dialog', { name: 'The Tale of Peter Rabbit' })
  await expect(dialog).toContainText("Mr. McGregor's garden")
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toBeHidden()
  await expect(about).toBeFocused()
  expect(errors).toEqual([])
  expect(foreignRequests).toEqual([])
})

test('claiming a coupon stores one claim and repeats the same code', async ({
  page,
}) => {
  await pointCameraAt(page, 'targets/images/wizard-of-oz.jpg')

  async function claimThroughTheCard() {
    await startScanning(page)
    await page
      .getByRole('region', { name: 'Product' })
      .getByRole('button', { name: 'Claim coupon' })
      .click({ timeout: DETECTION_TIMEOUT })
    const dialog = page.getByRole('dialog', {
      name: '15% off The Wonderful Wizard of Oz',
    })
    await dialog.getByRole('button', { name: 'Claim coupon' }).click()
    const code = await dialog.getByRole('status').innerText()
    expect(code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/)
    return code
  }

  const firstCode = await claimThroughTheCard()
  expect(await claimsOf('wizard-of-oz')).toEqual([
    { code: firstCode, claimed_count: 1 },
  ])

  await page.reload()
  const secondCode = await claimThroughTheCard()

  expect(secondCode).toBe(firstCode)
  expect(await claimsOf('wizard-of-oz')).toEqual([
    { code: firstCode, claimed_count: 1 },
  ])
})

test('a sold-out coupon is explained and nothing is stored', async ({
  page,
}) => {
  await db.query(
    `WITH campaign AS (
       UPDATE coupon_campaigns c SET total_quantity = 1, claimed_count = 1
       FROM products p
       WHERE p.id = c.product_id AND p.slug = 'peter-rabbit'
       RETURNING c.id
     )
     INSERT INTO coupon_claims (campaign_id, visitor_id, code)
     SELECT id, $1, 'TAKEN-BY-OTHER' FROM campaign
     ON CONFLICT DO NOTHING`,
    [OTHER_VISITOR],
  )
  await pointCameraAt(page, 'targets/images/peter-rabbit.jpg')

  await startScanning(page)
  await page
    .getByRole('region', { name: 'Product' })
    .getByRole('button', { name: 'Claim coupon' })
    .click({ timeout: DETECTION_TIMEOUT })

  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('All coupons have been claimed.')
  await dialog.getByRole('button', { name: 'Show my coupon' }).click()

  await expect(dialog.getByRole('alert')).toHaveText(
    'All coupons have been claimed.',
  )
  expect(await claimsOf('peter-rabbit')).toEqual([
    { code: 'TAKEN-BY-OTHER', claimed_count: 1 },
  ])
})

test('a product that is not registered gets no card, only a hint', async ({
  page,
}) => {
  await pointCameraAt(page, 'e2e/fixtures/unregistered-cover.jpg')

  await startScanning(page)

  await expect(page.getByText('Only registered products work')).toBeVisible({
    timeout: DETECTION_TIMEOUT,
  })
  await expect(page.getByRole('region', { name: 'Product' })).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveText(
    'Point the camera at a registered product.',
  )
})

test('a blocked camera is explained with a way out', async ({ page }) => {
  await startScanning(page)

  await expect(page.getByRole('alert')).toContainText(
    'Camera access was blocked',
  )
  await page
    .getByRole('link', { name: 'Browse products in AR instead' })
    .click()
  await expect(page).toHaveURL('/view-in-ar')
})

test('leaving the scanner releases the camera', async ({ page }) => {
  await pointCameraAt(page, 'targets/images/peter-rabbit.jpg')
  await startScanning(page)
  await expect(page.getByRole('region', { name: 'Product' })).toBeVisible({
    timeout: DETECTION_TIMEOUT,
  })
  expect(await cameraTrackStates(page)).toEqual(['live'])

  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'View product in AR' })
    .click()

  await expect(page).toHaveURL('/view-in-ar')
  await expect.poll(() => cameraTrackStates(page)).toEqual(['ended'])
  await expect(page.locator('video, canvas')).toHaveCount(0)
})
