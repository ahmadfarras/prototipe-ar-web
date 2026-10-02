import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductExperience } from '../../domain/experience'
import { bookCoupon, bookExperience, manifest } from '../../test/fixtures'
import type { ProductExperiences } from '../../usecase/productExperience'
import type { TrackerError } from '../components/TargetTracker'
import { ScanProductPage } from './ScanProductPage'

type TrackerProps = {
  mindUrl: string
  targetCount: number
  onReady: () => void
  onFound: (targetIndex: number) => void
  onLost: (targetIndex: number) => void
  onError: (error: TrackerError) => void
  children: ReactNode
}

const tracker = vi.hoisted(() => ({ props: null as TrackerProps | null }))

vi.mock('../components/TargetTracker', () => ({
  TargetTracker: (props: TrackerProps) => {
    tracker.props = props
    return <div data-testid="tracker">{props.children}</div>
  },
}))

const boxExperience: ProductExperience = {
  ...bookExperience,
  slug: 'box',
  name: 'Sample Box',
  coupon: null,
}

function setup(overrides: Partial<ProductExperiences> = {}) {
  const experiences = {
    loadManifest: vi.fn(async () => manifest),
    getExperience: vi.fn(async (slug: string) =>
      slug === 'book' ? bookExperience : boxExperience,
    ),
    claimCoupon: vi.fn(async () => ({
      kind: 'claimed' as const,
      coupon: bookCoupon,
    })),
    ...overrides,
  }
  const router = createMemoryRouter(
    [
      { path: '/scan', element: <ScanProductPage experiences={experiences} /> },
      { path: '/view-in-ar', element: <h1>Products in AR</h1> },
    ],
    { initialEntries: ['/scan'] },
  )
  render(<RouterProvider router={router} />)
  return experiences
}

async function startCamera() {
  await userEvent.click(screen.getByRole('button', { name: 'Start camera' }))
}

async function startSearching(overrides?: Partial<ProductExperiences>) {
  const experiences = setup(overrides)
  await startCamera()
  act(() => tracker.props!.onReady())
  return experiences
}

const find = (targetIndex: number) =>
  act(async () => tracker.props!.onFound(targetIndex))
const lose = (targetIndex: number) =>
  act(async () => tracker.props!.onLost(targetIndex))

beforeEach(() => {
  tracker.props = null
})

describe('ScanProductPage', () => {
  it('waits for a tap before using the camera', () => {
    const experiences = setup()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Scan product' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Start camera' })).toBeVisible()
    expect(screen.queryByTestId('tracker')).not.toBeInTheDocument()
    expect(experiences.loadManifest).not.toHaveBeenCalled()
  })

  it('starts the tracker with the registered targets', async () => {
    setup()

    await startCamera()

    expect(screen.getByRole('status')).toHaveTextContent('Starting camera…')
    expect(tracker.props).toMatchObject({
      mindUrl: manifest.mindUrl,
      targetCount: 2,
    })
    expect(
      screen.queryByRole('button', { name: 'Start camera' }),
    ).not.toBeInTheDocument()
  })

  it('asks for a registered product once the camera runs', async () => {
    await startSearching()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Point the camera at a registered product.',
    )
  })

  it('shows the card of the product that was found', async () => {
    const experiences = await startSearching()

    await find(1)

    expect(screen.getByRole('status')).toHaveTextContent('Product recognised.')
    expect(screen.getByRole('heading', { name: 'Sample Box' })).toBeVisible()
    expect(experiences.getExperience).toHaveBeenCalledExactlyOnceWith('box')
  })

  it('resolves two targets of one product to the same product', async () => {
    const experiences = await startSearching({
      loadManifest: async () => ({
        ...manifest,
        slugs: ['book', 'box', 'book'],
      }),
    })

    await find(2)

    expect(screen.getByRole('heading', { name: 'Sample Book' })).toBeVisible()
    expect(experiences.getExperience).toHaveBeenCalledWith('book')
  })

  it('ignores a target index that is not in the manifest', async () => {
    const experiences = await startSearching()

    await find(7)

    expect(experiences.getExperience).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Point the camera at a registered product.',
    )
  })

  it('hides the card when the product is lost and shows the next one found', async () => {
    await startSearching()
    await find(0)

    await lose(0)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Product lost — point the camera at it again.',
    )
    expect(
      screen.queryByRole('heading', { name: 'Sample Book' }),
    ).not.toBeInTheDocument()

    await find(1)

    expect(screen.getByRole('heading', { name: 'Sample Box' })).toBeVisible()
  })

  it('opens the explanation and keeps it open when the product is lost', async () => {
    await startSearching()
    await find(0)

    await userEvent.click(
      screen.getByRole('button', { name: 'About this product' }),
    )
    await lose(0)

    const dialog = screen.getByRole('dialog', { name: 'Sample Book' })
    expect(within(dialog).getByText('A longer description.')).toBeVisible()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('claims the coupon of the found product', async () => {
    const experiences = await startSearching()
    await find(0)

    await userEvent.click(screen.getByRole('button', { name: 'Claim coupon' }))
    const dialog = within(screen.getByRole('dialog', { name: '10% off' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Claim coupon' }))

    expect(await dialog.findByText('AAAA-BBBB-CCCC')).toBeVisible()
    expect(experiences.claimCoupon).toHaveBeenCalledExactlyOnceWith('book')
  })

  it('says so when the found product is not registered', async () => {
    await startSearching({ getExperience: async () => null })

    await find(0)

    expect(screen.getByText('This product is not registered.')).toBeVisible()
  })

  it('retries loading the product information', async () => {
    const getExperience = vi
      .fn<ProductExperiences['getExperience']>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(bookExperience)
    await startSearching({ getExperience })
    await find(0)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load the product information.',
    )
    // The click suspends the card again; React only resumes inside an awaited act.
    await act(() =>
      userEvent.click(screen.getByRole('button', { name: 'Try again' })),
    )

    expect(screen.getByRole('heading', { name: 'Sample Book' })).toBeVisible()
    expect(getExperience).toHaveBeenCalledTimes(2)
  })

  it.each<[TrackerError, string]>([
    ['permission-denied', 'Camera access was blocked'],
    ['no-camera', 'No camera is available'],
    ['unsupported', 'This browser cannot run the product scanner'],
  ])('explains the tracker error %s', async (error, message) => {
    setup()
    await startCamera()

    act(() => tracker.props!.onError(error))

    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByTestId('tracker')).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('link', { name: 'Browse products in AR instead' }),
    )
    expect(
      screen.getByRole('heading', { name: 'Products in AR' }),
    ).toBeVisible()
  })

  it('explains a failure to load the registered products', async () => {
    setup({ loadManifest: () => Promise.reject(new Error('offline')) })

    await startCamera()

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load the registered products.',
    )
    expect(screen.queryByTestId('tracker')).not.toBeInTheDocument()
  })

  describe('hint', () => {
    afterEach(() => vi.useRealTimers())

    it('appears after ten seconds of searching and goes away on a find', async () => {
      await startSearching()
      vi.useFakeTimers()
      // The timer above was started with real timers: restart the search phase.
      await find(0)
      await lose(0)
      act(() => tracker.props!.onReady())

      act(() => vi.advanceTimersByTime(9_999))
      expect(screen.queryByText(/Not recognised\?/)).not.toBeInTheDocument()

      act(() => vi.advanceTimersByTime(1))
      expect(screen.getByText(/Only registered products work/)).toBeVisible()

      await find(0)
      expect(screen.queryByText(/Not recognised\?/)).not.toBeInTheDocument()
    })
  })
})
