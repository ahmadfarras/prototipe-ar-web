import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type {
  ClaimOutcome,
  CouponStatus,
  ProductExperience,
} from '../../domain/experience'
import { bookCoupon, bookExperience } from '../../test/fixtures'
import { ExperienceDialog, type DialogView } from './ExperienceDialog'

const claimed: ClaimOutcome = { kind: 'claimed', coupon: bookCoupon }

function setup(
  view: DialogView,
  outcome: ClaimOutcome | Promise<ClaimOutcome> = claimed,
  experience: ProductExperience = bookExperience,
) {
  const claimCoupon = vi.fn(async () => outcome)
  const onClose = vi.fn()
  render(
    <StrictMode>
      <ExperienceDialog
        experience={experience}
        view={view}
        claimCoupon={claimCoupon}
        onClose={onClose}
      />
    </StrictMode>,
  )
  return { claimCoupon, onClose, dialog: within(screen.getByRole('dialog')) }
}

const withStatus = (status: CouponStatus): ProductExperience => ({
  ...bookExperience,
  coupon: { ...bookExperience.coupon!, status },
})

describe('ExperienceDialog', () => {
  it('opens as a modal dialog named after the product', () => {
    setup('about')

    expect(screen.getByRole('dialog', { name: 'Sample Book' })).toBeVisible()
    expect(screen.getByText('A longer description.')).toBeVisible()
  })

  it('reports closing', async () => {
    const { dialog, onClose } = setup('about')

    await userEvent.click(dialog.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows the offer before claiming', () => {
    const { dialog, claimCoupon } = setup('claim')

    expect(screen.getByRole('dialog', { name: '10% off' })).toBeVisible()
    expect(dialog.getByText('One per visitor.')).toBeVisible()
    expect(dialog.getByText('Valid until 1 Jan 2030')).toBeVisible()
    expect(claimCoupon).not.toHaveBeenCalled()
  })

  it('claims the coupon and shows the code', async () => {
    const { dialog, claimCoupon } = setup('claim')

    await userEvent.click(dialog.getByRole('button', { name: 'Claim coupon' }))

    expect(await dialog.findByRole('status')).toHaveTextContent(
      'AAAA-BBBB-CCCC',
    )
    expect(claimCoupon).toHaveBeenCalledExactlyOnceWith('book')
    expect(
      dialog.queryByRole('button', { name: 'Claim coupon' }),
    ).not.toBeInTheDocument()
  })

  it('disables the button while the claim is pending', async () => {
    let finish = (_outcome: ClaimOutcome) => {}
    const pending = new Promise<ClaimOutcome>((resolve) => {
      finish = resolve
    })
    const { dialog } = setup('claim', pending)

    await userEvent.click(dialog.getByRole('button', { name: 'Claim coupon' }))

    expect(dialog.getByRole('button', { name: 'Claiming…' })).toBeDisabled()

    await act(async () => finish(claimed))

    expect(await dialog.findByText('AAAA-BBBB-CCCC')).toBeVisible()
  })

  it.each([
    ['sold_out', 'All coupons have been claimed.'],
    ['not_active', 'This offer is not active.'],
    ['not_found', 'This product has no coupon.'],
  ] as const)('explains the outcome %s', async (reason, message) => {
    const { dialog } = setup('claim', { kind: 'unavailable', reason })

    await userEvent.click(dialog.getByRole('button', { name: 'Claim coupon' }))

    expect(await dialog.findByRole('alert')).toHaveTextContent(message)
    expect(
      dialog.queryByRole('button', { name: 'Claim coupon' }),
    ).not.toBeInTheDocument()
  })

  it('lets the visitor try again after a failure', async () => {
    const { dialog, claimCoupon } = setup('claim', { kind: 'failed' })

    await userEvent.click(dialog.getByRole('button', { name: 'Claim coupon' }))

    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'Could not claim the coupon. Try again.',
    )
    claimCoupon.mockResolvedValue(claimed)
    await userEvent.click(dialog.getByRole('button', { name: 'Claim coupon' }))

    expect(await dialog.findByText('AAAA-BBBB-CCCC')).toBeVisible()
    expect(claimCoupon).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['sold_out', 'All coupons have been claimed.'],
    ['not_started', 'This offer has not started yet.'],
    ['ended', 'This offer has ended.'],
  ] as const)(
    'explains the status %s and still returns an earlier claim',
    async (status, message) => {
      const { dialog } = setup('claim', claimed, withStatus(status))

      expect(dialog.getByText(message)).toBeVisible()
      expect(
        dialog.queryByRole('button', { name: 'Claim coupon' }),
      ).not.toBeInTheDocument()

      await userEvent.click(
        dialog.getByRole('button', { name: 'Show my coupon' }),
      )

      expect(await dialog.findByText('AAAA-BBBB-CCCC')).toBeVisible()
    },
  )
})
