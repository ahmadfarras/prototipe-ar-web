import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { ProductExperience } from '../../domain/experience'
import { VIEW_IN_AR_PATH } from '../../domain/productLink'
import type { TargetManifest } from '../../domain/targetManifest'
import type { ProductExperiences } from '../../usecase/productExperience'
import {
  ExperienceDialog,
  type DialogView,
} from '../components/ExperienceDialog'
import { ProductCard, type ExperienceResult } from '../components/ProductCard'
import { TargetTracker, type TrackerError } from '../components/TargetTracker'

type Props = {
  experiences: ProductExperiences
}

type Phase = 'idle' | 'starting' | 'searching' | 'locked' | 'lost'
type Problem = TrackerError | 'manifest'
type LockedProduct = { slug: string; result: Promise<ExperienceResult> }
type OpenDialog = { experience: ProductExperience; view: DialogView }

const HINT_DELAY_MS = 10_000

const STATUS_TEXT: Record<Exclude<Phase, 'idle'>, string> = {
  starting: 'Starting camera…',
  searching: 'Point the camera at a registered product.',
  locked: 'Product recognised.',
  lost: 'Product lost — point the camera at it again.',
}

const PROBLEM_MESSAGES: Record<Problem, string> = {
  'permission-denied':
    'Camera access was blocked. Allow camera access for this site and reload.',
  'no-camera':
    'No camera is available. Scanning needs a camera and a secure (HTTPS) connection.',
  unsupported: 'This browser cannot run the product scanner.',
  manifest:
    'Could not load the registered products. Check your connection and reload.',
}

export function ScanProductPage({ experiences }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [manifest, setManifest] = useState<TargetManifest | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [locked, setLocked] = useState<LockedProduct | null>(null)
  const [dialog, setDialog] = useState<OpenDialog | null>(null)
  const [isHintDue, setIsHintDue] = useState(false)

  useEffect(() => {
    if (phase !== 'searching') return
    const timer = setTimeout(() => setIsHintDue(true), HINT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [phase])

  async function handleStart() {
    setPhase('starting')
    try {
      setManifest(await experiences.loadManifest())
    } catch {
      setProblem('manifest')
    }
  }

  function loadExperience(slug: string): Promise<ExperienceResult> {
    return experiences.getExperience(slug).then(
      (experience): ExperienceResult =>
        experience
          ? { kind: 'loaded', experience }
          : { kind: 'not-registered' },
      (): ExperienceResult => ({ kind: 'failed' }),
    )
  }

  function lock(slug: string) {
    setLocked({ slug, result: loadExperience(slug) })
    setPhase('locked')
  }

  function handleFound(targetIndex: number) {
    const slug = manifest?.slugs[targetIndex]
    if (slug) lock(slug)
  }

  function handleLost() {
    setLocked(null)
    setPhase('lost')
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Scan product</h1>
      {problem ? (
        <>
          <p role="alert" className="mt-2 text-red-700">
            {PROBLEM_MESSAGES[problem]}
          </p>
          <Link
            to={VIEW_IN_AR_PATH}
            className="mt-4 inline-block font-semibold underline"
          >
            Browse products in AR instead
          </Link>
        </>
      ) : phase === 'idle' ? (
        <>
          <p className="mt-2 text-slate-600">
            Point your camera at a registered product to see its details and
            claim its coupon.
          </p>
          <button
            type="button"
            onClick={handleStart}
            className="mt-4 flex min-h-11 w-full items-center justify-center rounded-full bg-slate-900 px-6 font-semibold text-white"
          >
            Start camera
          </button>
        </>
      ) : (
        <>
          <output className="mt-2 mb-4 block text-slate-600">
            {STATUS_TEXT[phase]}
          </output>
          {manifest && (
            <TargetTracker
              mindUrl={manifest.mindUrl}
              targetCount={manifest.slugs.length}
              onReady={() => setPhase('searching')}
              onFound={handleFound}
              onLost={handleLost}
              onError={setProblem}
            >
              {locked && (
                <ProductCard
                  result={locked.result}
                  onAbout={(experience) =>
                    setDialog({ experience, view: 'about' })
                  }
                  onClaim={(experience) =>
                    setDialog({ experience, view: 'claim' })
                  }
                  onRetry={() => lock(locked.slug)}
                />
              )}
            </TargetTracker>
          )}
          {isHintDue && phase === 'searching' && (
            <p className="mt-3 text-sm text-slate-600">
              Not recognised? Only registered products work. Fit the whole cover
              in view, in good light.
            </p>
          )}
        </>
      )}
      {dialog && (
        <ExperienceDialog
          experience={dialog.experience}
          view={dialog.view}
          claimCoupon={experiences.claimCoupon}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
