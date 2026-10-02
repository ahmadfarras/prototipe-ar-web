import { Suspense, use } from 'react'
import type { ProductExperience } from '../../domain/experience'

export type ExperienceResult =
  | { kind: 'loaded'; experience: ProductExperience }
  | { kind: 'not-registered' }
  | { kind: 'failed' }

type Props = {
  /** Must never reject and must keep its identity between renders. */
  result: Promise<ExperienceResult>
  onAbout: (experience: ProductExperience) => void
  onClaim: (experience: ProductExperience) => void
  onRetry: () => void
}

// Sizes are in tracker units: 1000 px is the width of the tracked product,
// so the card scales with the product on screen.
const BUTTON_CLASS =
  'flex min-h-[180px] w-full items-center justify-center rounded-[48px] px-10 text-[56px] font-semibold'

export function ProductCard(props: Props) {
  return (
    <section
      aria-label="Product"
      className="w-[900px] rounded-[64px] bg-white/90 p-12 text-slate-900 shadow-2xl"
    >
      <Suspense fallback={<output className="text-[56px]">Loading…</output>}>
        <CardContent {...props} />
      </Suspense>
    </section>
  )
}

function CardContent({ result, onAbout, onClaim, onRetry }: Props) {
  const loaded = use(result)

  if (loaded.kind === 'not-registered') {
    return <p className="text-[56px]">This product is not registered.</p>
  }
  if (loaded.kind === 'failed') {
    return (
      <>
        <p role="alert" className="mb-8 text-[56px] text-red-700">
          Could not load the product information.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className={`${BUTTON_CLASS} bg-slate-900 text-white`}
        >
          Try again
        </button>
      </>
    )
  }

  const { experience } = loaded
  return (
    <>
      <h2 className="text-[72px] leading-tight font-bold">{experience.name}</h2>
      <p className="mt-4 mb-10 text-[48px] text-slate-700">
        {experience.summary}
      </p>
      <div className="flex flex-col gap-8">
        <button
          type="button"
          onClick={() => onAbout(experience)}
          className={`${BUTTON_CLASS} border-4 border-slate-900`}
        >
          About this product
        </button>
        {experience.coupon && (
          <button
            type="button"
            onClick={() => onClaim(experience)}
            className={`${BUTTON_CLASS} bg-slate-900 text-white`}
          >
            Claim coupon
          </button>
        )}
      </div>
    </>
  )
}
