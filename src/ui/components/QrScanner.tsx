import QrScannerLib from 'qr-scanner'
import { useEffect, useEffectEvent, useRef } from 'react'

export type ScanError = 'permission-denied' | 'no-camera'

type Props = {
  onResult: (text: string) => void
  onError: (error: ScanError) => void
}

export function QrScanner({ onResult, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const handleResult = useEffectEvent(onResult)
  const handleError = useEffectEvent(onError)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let isActive = true
    const scanner = new QrScannerLib(
      video,
      (result) => handleResult(result.data),
      { preferredCamera: 'environment', returnDetailedScanResult: true },
    )

    scanner.start().catch(async () => {
      const hasCamera = await QrScannerLib.hasCamera()
      if (isActive) handleError(hasCamera ? 'permission-denied' : 'no-camera')
    })

    return () => {
      isActive = false
      // destroy() alone keeps the camera on for another 300 ms.
      void scanner.pause(true)
      scanner.destroy()
    }
  }, [])

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      aria-label="Camera preview"
      className="aspect-square w-full rounded-xl bg-slate-900 object-cover"
    />
  )
}
