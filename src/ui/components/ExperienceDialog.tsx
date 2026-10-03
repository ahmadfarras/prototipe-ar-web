import { useActionState, useEffect, useRef } from 'react'
import type {
  ClaimedCoupon,
  ClaimOutcome,
  CouponOffer,
  CouponStatus,
  ProductExperience,
} from '../../domain/experience'

export type DialogView = 'about' | 'claim'

type Props = {
  experience: ProductExperience
  view: DialogView
  claimCoupon: (slug: string) => Promise<ClaimOutcome>
  onClose: () => void
}

const UNAVAILABLE_MESSAGES = {
  sold_out: 'All coupons have been claimed.',
  not_active: 'This offer is not active.',
  not_found: 'This product has no coupon.',
}

const STATUS_MESSAGES: Record<Exclude<CouponStatus, 'available'>, string> = {
  sold_out: 'All coupons have been claimed.',
  not_started: 'This offer has not started yet.',
  ended: 'This offer has ended.',
}

const BUTTON_CLASS =
  'flex min-h-11 w-full items-center justify-center rounded-full px-6 font-semibold disabled:opacity-60'

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

export function ExperienceDialog({
  experience,
  view,
  claimCoupon,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="experience-dialog-title"
      className="m-auto mb-0 w-full max-w-xl rounded-t-2xl p-6 text-slate-900 backdrop:bg-black/50"
    >
      <h2 id="experience-dialog-title" className="text-xl font-bold">
        {view === 'about' ? experience.name : experience.coupon?.title}
      </h2>
      {view === 'about' ? (
        <p className="mt-3 whitespace-pre-line text-slate-700">
          {experience.description}
        </p>
      ) : (
        experience.coupon && (
          <CouponClaim
            offer={experience.coupon}
            claim={() => claimCoupon(experience.slug)}
          />
        )
      )}
      <button
        type="button"
        onClick={() => dialogRef.current?.close()}
        className={`${BUTTON_CLASS} mt-6 border border-slate-300`}
      >
        Close
      </button>
    </dialog>
  )
}

type CouponClaimProps = {
  offer: CouponOffer
  claim: () => Promise<ClaimOutcome>
}

function CouponClaim({ offer, claim }: CouponClaimProps) {
  const [outcome, claimAction, isPending] = useActionState<ClaimOutcome | null>(
    claim,
    null,
  )

  if (outcome?.kind === 'claimed')
    return <ClaimedCode coupon={outcome.coupon} />
  if (outcome?.kind === 'unavailable') {
    return (
      <p role="alert" className="mt-3 text-slate-700">
        {UNAVAILABLE_MESSAGES[outcome.reason]}
      </p>
    )
  }

  const notice =
    offer.status === 'available' ? null : STATUS_MESSAGES[offer.status]
  return (
    <form action={claimAction} className="mt-3">
      <p className="text-slate-700">{notice ?? offer.terms}</p>
      {!notice && (
        <p className="mt-1 text-sm text-slate-600">
          Valid until {dateFormat.format(new Date(offer.endsAt))}
        </p>
      )}
      {outcome?.kind === 'failed' && (
        <p role="alert" className="mt-3 text-red-700">
          Could not claim the coupon. Try again.
        </p>
      )}
      <button
        disabled={isPending}
        className={`${BUTTON_CLASS} mt-4 bg-slate-900 text-white`}
      >
        {isPending ? 'Claiming…' : notice ? 'Show my coupon' : 'Claim coupon'}
      </button>
    </form>
  )
}

function ClaimedCode({ coupon }: { coupon: ClaimedCoupon }) {
  return (
    <div className="mt-3">
      <p className="text-slate-700">Your coupon code</p>
      <output className="mt-1 block rounded-lg bg-slate-100 p-4 text-center font-mono text-2xl font-bold tracking-widest select-all">
        {coupon.code}
      </output>
      <p className="mt-3 text-slate-700">{coupon.terms}</p>
      <p className="mt-1 text-sm text-slate-600">
        Valid until {dateFormat.format(new Date(coupon.endsAt))}
      </p>
    </div>
  )
}
