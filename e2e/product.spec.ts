import { expect, test } from '@playwright/test'
import { collectErrors } from './console.ts'

test('home lists the demo products and opens one', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')

  await expect(page.getByRole('listitem')).toHaveCount(2)
  await page.getByRole('link', { name: /Sheen Chair/ }).click()

  await expect(page).toHaveURL('/p/sheen-chair')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sheen Chair' }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('a product deep link loads its 3D model', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/p/water-bottle')

  const viewer = page.locator('model-viewer')
  await expect(viewer).toHaveJSProperty('src', '/models/water-bottle.glb')
  await expect(viewer).toHaveJSProperty('ar', true)
  await expect(viewer).toHaveJSProperty('cameraControls', true)
  await expect(viewer).toHaveJSProperty('arScale', 'fixed')
  await expect(viewer).toHaveJSProperty('loaded', true)
  await expect(page.getByText('Loading 3D model')).toBeHidden()
  await expect(page.getByRole('button', { name: 'View in AR' })).toBeVisible()
  expect(errors).toEqual([])
})

for (const path of ['/p/does-not-exist', '/p/..%2F..%2Fetc', '/nope']) {
  test(`${path} shows not found`, async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto(path)

    await expect(
      page.getByRole('heading', { level: 1, name: 'Not found' }),
    ).toBeVisible()
    await expect(page.locator('model-viewer')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
