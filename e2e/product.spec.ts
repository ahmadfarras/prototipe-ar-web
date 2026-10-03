import { expect, test } from '@playwright/test'
import { collectErrors } from './console.ts'

test('the root opens the Scan product tab and the tabs switch sections', async ({
  page,
}) => {
  const nav = page.getByRole('navigation', { name: 'Main' })
  await page.goto('/')

  await expect(page).toHaveURL('/scan')
  await expect(nav.getByRole('link', { name: 'Scan product' })).toHaveAttribute(
    'aria-current',
    'page',
  )

  await nav.getByRole('link', { name: 'View product in AR' }).click()

  await expect(page).toHaveURL('/view-in-ar')
  await expect(
    nav.getByRole('link', { name: 'View product in AR' }),
  ).toHaveAttribute('aria-current', 'page')

  await nav.getByRole('link', { name: 'Scan product' }).click()

  await expect(page).toHaveURL('/scan')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Scan product' }),
  ).toBeVisible()
})

test('the tab lists the demo products and opens one', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/view-in-ar')

  await expect(page.getByRole('listitem')).toHaveCount(2)
  await page.getByRole('link', { name: /Sheen Chair/ }).click()

  await expect(page).toHaveURL('/view-in-ar/p/sheen-chair')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sheen Chair' }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('a product deep link loads its 3D model', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/view-in-ar/p/water-bottle')

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

for (const path of [
  '/view-in-ar/p/does-not-exist',
  '/view-in-ar/p/..%2F..%2Fetc',
  '/p/sheen-chair',
  '/nope',
]) {
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
