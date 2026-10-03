import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'
import { MindARThree } from '../../vendor/mind-ar/mindar-image-three.prod.js'
import { cameraFailureReason, type CameraError } from '../camera'

export type TrackerError = CameraError | 'unsupported'

type Props = {
  mindUrl: string
  targetCount: number
  onReady: () => void
  onFound: (targetIndex: number) => void
  onLost: (targetIndex: number) => void
  onError: (error: TrackerError) => void
  /** Rendered on the tracked product. 1000 CSS px span the product's width. */
  children: ReactNode
}

function createTracker(container: HTMLElement, mindUrl: string) {
  try {
    return new MindARThree({
      container,
      imageTargetSrc: mindUrl,
      maxTrack: 1,
      uiLoading: 'no',
      uiScanning: 'no',
      uiError: 'no',
    })
  } catch {
    return null
  }
}

// MindAR's own stop() only ends the camera and throws before start() finishes.
function releaseTracker(tracker: MindARThree) {
  tracker.renderer.setAnimationLoop(null)
  tracker.controller?.dispose()
  tracker.controller?.worker.terminate()
  const stream = tracker.video?.srcObject
  if (stream && 'getTracks' in stream) {
    for (const track of stream.getTracks()) track.stop()
  }
  tracker.video?.remove()
  tracker.renderer.dispose()
  tracker.renderer.domElement.remove()
  tracker.cssRenderer.domElement.remove()
  window.removeEventListener('resize', tracker.onResize)
}

export function TargetTracker({
  mindUrl,
  targetCount,
  onReady,
  onFound,
  onLost,
  onError,
  children,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null)
  const handleReady = useEffectEvent(onReady)
  const handleFound = useEffectEvent(onFound)
  const handleLost = useEffectEvent(onLost)
  const handleError = useEffectEvent(onError)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const tracker = navigator.mediaDevices
      ? createTracker(container, mindUrl)
      : null
    if (!tracker) {
      handleError('unsupported')
      return
    }

    let isActive = true
    for (let index = 0; index < targetCount; index += 1) {
      const element = document.createElement('div')
      // MindAR only sets visibility once a target has been seen.
      element.style.visibility = 'hidden'
      const anchor = tracker.addCSSAnchor(index)
      // three.js skips children of an invisible group; MindAR never shows it.
      anchor.group.visible = true
      anchor.group.add(new CSS3DObject(element))
      anchor.onTargetFound = () => {
        if (!isActive) return
        setAnchorElement(element)
        handleFound(index)
      }
      anchor.onTargetLost = () => {
        if (!isActive) return
        setAnchorElement(null)
        handleLost(index)
      }
    }

    const started = tracker.start().then(
      () => {
        if (!isActive) return
        const { renderer, cssRenderer, scene, cssScene, camera } = tracker
        renderer.setAnimationLoop(() => {
          renderer.render(scene, camera)
          cssRenderer.render(cssScene, camera)
        })
        handleReady()
      },
      async () => {
        const reason = await cameraFailureReason()
        if (isActive) handleError(reason)
      },
    )

    return () => {
      isActive = false
      setAnchorElement(null)
      void started.then(() => releaseTracker(tracker))
    }
  }, [mindUrl, targetCount])

  return (
    <>
      <div
        ref={containerRef}
        className="relative isolate aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-900"
      />
      {anchorElement && createPortal(children, anchorElement)}
    </>
  )
}
