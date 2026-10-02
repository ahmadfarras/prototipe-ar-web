import { expect, test, type Page } from '@playwright/test'
import QRCode from 'qrcode'
import { collectErrors } from './console.ts'

async function showQrToCamera(page: Page, text: string) {
  const qr = await QRCode.toDataURL(text, { width: 320, margin: 2 })
  await page.addInitScript((qrDataUrl) => {
    const size = 480
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')!
    const image = new Image()
    image.src = qrDataUrl
    const draw = () => {
      context.fillStyle = '#fff'
      context.fillRect(0, 0, size, size)
      if (image.complete) context.drawImage(image, 80, 80)
      requestAnimationFrame(draw)
    }
    draw()
    navigator.mediaDevices.getUserMedia = async () => canvas.captureStream(15)
  }, qr)
}

test('explains a blocked camera and links back to the products', async ({
  page,
}) => {
  await page.goto('/view-in-ar/scan')

  await expect(page.getByRole('alert')).toContainText(
    'Camera access was blocked',
  )
  await page.getByRole('link', { name: 'Browse products instead' }).click()
  await expect(page).toHaveURL('/view-in-ar')
})

test('scanning a product QR code opens that product', async ({ page }) => {
  const errors = collectErrors(page)
  await showQrToCamera(page, 'https://ar.example.com/view-in-ar/p/sheen-chair')

  await page.goto('/view-in-ar/scan')

  await expect(page).toHaveURL('/view-in-ar/p/sheen-chair')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sheen Chair' }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('a QR code for another site keeps the user on the scanner', async ({
  page,
}) => {
  await showQrToCamera(page, 'https://evil.example/login')

  await page.goto('/view-in-ar/scan')

  await expect(page.getByRole('status')).toContainText(
    'That QR code is not a product code',
  )
  await expect(page).toHaveURL('/view-in-ar/scan')
})

test('releases the camera when leaving the scanner', async ({ page }) => {
  await showQrToCamera(page, 'not a product code')
  await page.goto('/view-in-ar/scan')
  const video = page.getByLabel('Camera preview')
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.srcObject !== null))
    .toBe(true)
  const tracks = await video.evaluateHandle((el: HTMLVideoElement) =>
    (el.srcObject as MediaStream).getTracks(),
  )

  await page.getByRole('link', { name: 'AR Product Prototype' }).click()

  await expect(page).toHaveURL('/view-in-ar')
  expect(
    await tracks.evaluate((list) => list.map((track) => track.readyState)),
  ).toEqual(['ended'])
})
