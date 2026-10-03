import type { Page } from '@playwright/test'

type CameraSize = { width: number; height: number }

const MARGIN = 40

// Headless Chromium has no usable fake camera, so getUserMedia is replaced by
// a canvas stream that shows the image centred on a white background.
export async function showImageToCamera(
  page: Page,
  imageUrl: string,
  size: CameraSize,
) {
  await page.addInitScript(
    ({ imageUrl, width, height, margin }) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')!
      const image = new Image()
      image.src = imageUrl
      const draw = () => {
        context.fillStyle = '#fff'
        context.fillRect(0, 0, width, height)
        if (image.complete && image.naturalWidth > 0) {
          const scale = Math.min(
            1,
            (width - 2 * margin) / image.naturalWidth,
            (height - 2 * margin) / image.naturalHeight,
          )
          const drawnWidth = image.naturalWidth * scale
          const drawnHeight = image.naturalHeight * scale
          context.drawImage(
            image,
            (width - drawnWidth) / 2,
            (height - drawnHeight) / 2,
            drawnWidth,
            drawnHeight,
          )
        }
        requestAnimationFrame(draw)
      }
      draw()

      const tracks: MediaStreamTrack[] = []
      Object.assign(window, { cameraTracks: tracks })
      navigator.mediaDevices.getUserMedia = async () => {
        const stream = canvas.captureStream(15)
        tracks.push(...stream.getTracks())
        return stream
      }
    },
    { imageUrl, ...size, margin: MARGIN },
  )
}

export function cameraTrackStates(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    (
      window as unknown as { cameraTracks: MediaStreamTrack[] }
    ).cameraTracks.map((track) => track.readyState),
  )
}
