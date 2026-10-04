import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it, vi } from 'vitest'
import { chair, manifest, wallArt } from '../test/fixtures'
import type { ProductCatalog } from '../usecase/productCatalog'
import type { ProductExperiences } from '../usecase/productExperience'
import { createRoutes } from './router'

vi.mock('@google/model-viewer', () => ({}))
vi.mock('../ui/components/TargetTracker', () => ({
  TargetTracker: () => <div>Camera view</div>,
}))
vi.mock('../ui/components/QrScanner', () => ({
  QrScanner: () => <video aria-label="Camera preview" muted />,
}))

const catalog: ProductCatalog = {
  findProduct: (slug) => [chair, wallArt].find((p) => p.slug === slug),
  listProducts: () => [chair, wallArt],
}

const experiences: ProductExperiences = {
  loadManifest: async () => manifest,
  getExperience: async () => null,
  claimCoupon: async () => ({ kind: 'failed' }),
}

function renderAt(path: string) {
  const router = createMemoryRouter(createRoutes(catalog, experiences), {
    initialEntries: [path],
  })
  render(<RouterProvider router={router} />)
  return router
}

describe('routes', () => {
  it('opens the Scan product tab from the root', async () => {
    const router = renderAt('/')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Scan product' }),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe('/scan')
  })

  it('marks only the Scan product tab as current on /scan', async () => {
    renderAt('/scan')

    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(
      await within(nav).findByRole('link', { name: 'Scan product' }),
    ).toHaveAttribute('aria-current', 'page')
    expect(
      within(nav).getByRole('link', { name: 'View product in AR' }),
    ).not.toHaveAttribute('aria-current')
  })

  it('switches between the two tabs', async () => {
    const router = renderAt('/scan')
    const nav = screen.getByRole('navigation', { name: 'Main' })

    await userEvent.click(
      within(nav).getByRole('link', { name: 'View product in AR' }),
    )
    expect(router.state.location.pathname).toBe('/view-in-ar')

    await userEvent.click(
      within(nav).getByRole('link', { name: 'Scan product' }),
    )
    expect(router.state.location.pathname).toBe('/scan')
  })

  it('starts the product scanner from the Scan product tab', async () => {
    renderAt('/scan')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Start camera' }),
    )

    expect(await screen.findByText('Camera view')).toBeVisible()
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

  it('does not mark the Scan product tab as current in the other section', () => {
    renderAt('/view-in-ar')

    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(
      within(nav).getByRole('link', { name: 'Scan product' }),
    ).not.toHaveAttribute('aria-current')
  })

  it('does not mark the tab as current outside the section', () => {
    renderAt('/nope')

    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(
      within(nav).getByRole('link', { name: 'View product in AR' }),
    ).not.toHaveAttribute('aria-current')
  })

  it('lists every product on the home page', () => {
    renderAt('/view-in-ar')

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
    renderAt('/view-in-ar')

    await userEvent.click(screen.getByRole('link', { name: 'Scan QR code' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Scan QR code' }),
    ).toBeVisible()
    expect(screen.getByLabelText('Camera preview')).toBeInTheDocument()
  })

  it('opens a product from the home page', async () => {
    renderAt('/view-in-ar')

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
    '/scan/extra',
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

  it.each(['/scan', '/view-in-ar', '/nope'])(
    'credits the author with a tagged link on %s',
    async (path) => {
      renderAt(path)

      const footer = await screen.findByRole('contentinfo')
      const link = within(footer).getByRole('link', {
        name: 'Ahmad Farras Syafrin',
      })
      expect(footer).toHaveTextContent('© 2026 Ahmad Farras Syafrin')
      expect(link).toHaveAttribute(
        'href',
        'https://ahmadfarrassyafrin.com/?utm_source=prototype-ar-web&utm_medium=trademark',
      )
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener')
    },
  )

  it('moves focus to the main content after navigation', async () => {
    renderAt('/view-in-ar')

    await userEvent.click(screen.getByRole('link', { name: 'Scan QR code' }))

    expect(screen.getByRole('main')).toHaveFocus()
  })
})
