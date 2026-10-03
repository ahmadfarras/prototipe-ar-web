import type { Group, PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import type { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js'

export type MindARAnchor = {
  group: Group
  targetIndex: number
  onTargetFound: (() => void) | null
  onTargetLost: (() => void) | null
}

type Overlay = 'yes' | 'no'

export class MindARThree {
  constructor(options: {
    container: HTMLElement
    imageTargetSrc: string
    maxTrack?: number
    uiLoading?: Overlay
    uiScanning?: Overlay
    uiError?: Overlay
  })

  renderer: WebGLRenderer
  cssRenderer: CSS3DRenderer
  scene: Scene
  cssScene: Scene
  camera: PerspectiveCamera
  /** Set once start() has asked for the camera. */
  video?: HTMLVideoElement
  /** Set once start() has the camera stream. */
  controller?: { dispose(): void; worker: Worker }
  /** Local patch, see README.md. */
  onResize: () => void

  start(): Promise<void>
  addCSSAnchor(targetIndex: number): MindARAnchor
}
