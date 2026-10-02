import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { bookExperience } from '../../test/fixtures'
import { ProductCard, type ExperienceResult } from './ProductCard'

async function setup(result: Promise<ExperienceResult>) {
  const callbacks = { onAbout: vi.fn(), onClaim: vi.fn(), onRetry: vi.fn() }
  await act(async () => {
    render(<ProductCard result={result} {...callbacks} />)
  })
  return callbacks
}

const loaded = (experience = bookExperience) =>
  Promise.resolve<ExperienceResult>({ kind: 'loaded', experience })

describe('ProductCard', () => {
  it('shows the product name and summary', async () => {
    await setup(loaded())

    expect(screen.getByRole('heading', { name: 'Sample Book' })).toBeVisible()
    expect(screen.getByText('A short summary.')).toBeVisible()
  })

  it('opens the explanation and the coupon claim for the product', async () => {
    const { onAbout, onClaim } = await setup(loaded())

    await userEvent.click(
      screen.getByRole('button', { name: 'About this product' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Claim coupon' }))

    expect(onAbout).toHaveBeenCalledExactlyOnceWith(bookExperience)
    expect(onClaim).toHaveBeenCalledExactlyOnceWith(bookExperience)
  })

  it('has no claim button for a product without a coupon', async () => {
    await setup(loaded({ ...bookExperience, coupon: null }))

    expect(
      screen.getByRole('button', { name: 'About this product' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Claim coupon' }),
    ).not.toBeInTheDocument()
  })

  it('shows a loading status until the product has loaded', async () => {
    let finish = (_result: ExperienceResult) => {}
    const pending = new Promise<ExperienceResult>((resolve) => {
      finish = resolve
    })
    await setup(pending)

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')

    await act(async () =>
      finish({ kind: 'loaded', experience: bookExperience }),
    )

    expect(screen.getByRole('heading', { name: 'Sample Book' })).toBeVisible()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('says so when the product is not registered', async () => {
    await setup(Promise.resolve({ kind: 'not-registered' }))

    expect(screen.getByText('This product is not registered.')).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('offers a retry when loading failed', async () => {
    const { onRetry } = await setup(Promise.resolve({ kind: 'failed' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load the product information.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
