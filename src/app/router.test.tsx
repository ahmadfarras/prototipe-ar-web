import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it, vi } from 'vitest'
import { chair, wallArt } from '../test/fixtures'
import type { ProductCatalog } from '../usecase/productCatalog'
import { createRoutes } from './router'

vi.mock('@google/model-viewer', () => ({}))
vi.mock('../ui/components/QrScanner', () => ({
  QrScanner: () => <video aria-label="Camera preview" muted />,
}))

const catalog: ProductCatalog = {
  findProduct: (slug) => [chair, wallArt].find((p) => p.slug === slug),
  listProducts: () => [chair, wallArt],
}

function renderAt(path: string) {
  const router = createMemoryRouter(createRoutes(catalog), {
    initialEntries: [path],
  })
  render(<RouterProvider router={router} />)
  return router
}

describe('routes', () => {
  it('opens the View product in AR tab from the root', async () => {
    const router = renderAt('/')

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'View product in AR',
      }),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe('/view-in-ar')
  })

  it.each(['/view-in-ar', '/view-in-ar/scan', '/view-in-ar/p/chair'])(
    'marks the View product in AR tab as current on %s',
    async (path) => {
      renderAt(path)

      const nav = screen.getByRole('navigation', { name: 'Main' })
      expect(
        await within(nav).findByRole('link', { name: 'View product in AR' }),
      ).toHaveAttribute('aria-current', 'page')
    },
  )

  it('does not mark the tab as current outside the section', () => {
    renderAt('/nope')

    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(
      within(nav).getByRole('link', { name: 'View product in AR' }),
    ).not.toHaveAttribute('aria-current')
  })

  it('lists every product on the home page', () => {
    renderAt('/')

    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(
      within(list).getByRole('link', { name: /Lounge Chair/ }),
    ).toHaveAttribute('href', '/view-in-ar/p/chair')
    expect(
      within(list).getByRole('link', { name: /Wall Art/ }),
    ).toHaveAttribute('href', '/view-in-ar/p/wall-art')
  })

  it('opens the scanner from the home page', async () => {
    renderAt('/')

    await userEvent.click(screen.getByRole('link', { name: 'Scan QR code' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Scan QR code' }),
    ).toBeVisible()
    expect(screen.getByLabelText('Camera preview')).toBeInTheDocument()
  })

  it('opens a product from the home page', async () => {
    renderAt('/')

    await userEvent.click(screen.getByRole('link', { name: /Lounge Chair/ }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lounge Chair' }),
    ).toBeVisible()
  })

  it('shows the product and its 3D viewer', async () => {
    renderAt('/view-in-ar/p/wall-art')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Wall Art' }),
    ).toBeVisible()
    expect(screen.getByText(wallArt.description)).toBeVisible()
    expect(document.querySelector('model-viewer')).toHaveAttribute(
      'src',
      wallArt.modelUrl,
    )
  })

  it.each([
    '/view-in-ar/p/unknown',
    '/view-in-ar/p/Not_A_Slug',
    '/view-in-ar/p/..%2F..%2Fetc',
    '/view-in-ar/p',
    '/p/chair',
    '/scan',
    '/nope',
  ])('shows not found for %s', async (path) => {
    renderAt(path)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Not found' }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(document.querySelector('model-viewer')).not.toBeInTheDocument()
  })

  it('moves focus to the main content after navigation', async () => {
    renderAt('/')

    await userEvent.click(screen.getByRole('link', { name: 'Scan QR code' }))

    expect(screen.getByRole('main')).toHaveFocus()
  })
})
