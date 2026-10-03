import { act, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TargetTracker } from './TargetTracker'

const mindar = vi.hoisted(() => {
  type Anchor = {
    group: { visible: boolean; add: (object: { element: HTMLElement }) => void }
    element?: HTMLElement
    onTargetFound: (() => void) | null
    onTargetLost: (() => void) | null
  }

  class FakeTracker {
    static instances: FakeTracker[] = []
    static shouldThrow = false

    anchors: Anchor[] = []
    track = { stop: vi.fn() }
    video = Object.assign(document.createElement('video'), {
      srcObject: { getTracks: () => [this.track] },
    })
    controller = { dispose: vi.fn(), worker: { terminate: vi.fn() } }
    renderer = {
      setAnimationLoop: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: document.createElement('canvas'),
    }
    cssRenderer = { render: vi.fn(), domElement: document.createElement('div') }
    scene = {}
    cssScene = {}
    camera = {}
    onResize = vi.fn()
    finishStart = () => {}
    failStart = () => {}
    start = vi.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          this.finishStart = resolve
          this.failStart = reject
        }),
    )
    options: { container: HTMLElement }

    constructor(options: { container: HTMLElement }) {
      if (FakeTracker.shouldThrow) throw new Error('WebGL is not available')
      this.options = options
      options.container.append(
        this.video,
        this.renderer.domElement,
        this.cssRenderer.domElement,
      )
      FakeTracker.instances.push(this)
    }

    addCSSAnchor() {
      const anchor: Anchor = {
        group: {
          visible: false,
          add: (object) => {
            anchor.element = object.element
            this.cssRenderer.domElement.append(object.element)
          },
        },
        onTargetFound: null,
        onTargetLost: null,
      }
      this.anchors.push(anchor)
      return anchor
    }

    // The real tracker shows the anchored element before it reports the target.
    find(index: number) {
      const anchor = this.anchors[index]!
      anchor.element!.style.visibility = 'visible'
      anchor.onTargetFound!()
    }

    lose(index: number) {
      const anchor = this.anchors[index]!
      anchor.element!.style.visibility = 'hidden'
      anchor.onTargetLost!()
    }

    isReleased() {
      return this.renderer.dispose.mock.calls.length === 1
    }
  }

  return { FakeTracker }
})

vi.mock('../../vendor/mind-ar/mindar-image-three.prod.js', () => ({
  MindARThree: mindar.FakeTracker,
}))
vi.mock('three/addons/renderers/CSS3DRenderer.js', () => ({
  CSS3DObject: class {
    element: HTMLElement
    constructor(element: HTMLElement) {
      this.element = element
    }
  },
}))

const { FakeTracker } = mindar

function stubMediaDevices(value: unknown) {
  Object.defineProperty(navigator, 'mediaDevices', {
    value,
    configurable: true,
  })
}

function setup(props: Partial<Parameters<typeof TargetTracker>[0]> = {}) {
  const callbacks = {
    onReady: vi.fn(),
    onFound: vi.fn(),
    onLost: vi.fn(),
    onError: vi.fn(),
  }
  const element = (extra = {}) => (
    <TargetTracker
      mindUrl="/targets/targets-07a7ebdd.mind"
      targetCount={2}
      {...callbacks}
      {...props}
      {...extra}
    >
      <button>Anchored</button>
    </TargetTracker>
  )
  const view = render(element())
  return { ...callbacks, ...view, element }
}

const tracker = (index = 0) => FakeTracker.instances[index]!
const finishStart = (index = 0) => act(async () => tracker(index).finishStart())

beforeEach(() => {
  FakeTracker.instances = []
  FakeTracker.shouldThrow = false
  stubMediaDevices({
    enumerateDevices: async () => [{ kind: 'videoinput' }],
  })
})

afterEach(() => stubMediaDevices(undefined))

describe('TargetTracker', () => {
  it('starts one tracker for the target file without the library overlays', () => {
    const { container } = setup()

    expect(FakeTracker.instances).toHaveLength(1)
    expect(tracker().options).toEqual({
      container: container.firstElementChild,
      imageTargetSrc: '/targets/targets-07a7ebdd.mind',
      maxTrack: 1,
      uiLoading: 'no',
      uiScanning: 'no',
      uiError: 'no',
    })
    expect(tracker().start).toHaveBeenCalledTimes(1)
  })

  it('adds a hidden anchor in a visible group for every target', () => {
    setup({ targetCount: 3 })

    expect(tracker().anchors).toHaveLength(3)
    for (const anchor of tracker().anchors) {
      expect(anchor.group.visible).toBe(true)
      expect(anchor.element!.style.visibility).toBe('hidden')
    }
  })

  it('reports ready and renders both layers once the camera runs', async () => {
    const { onReady } = setup()
    expect(onReady).not.toHaveBeenCalled()

    await finishStart()

    expect(onReady).toHaveBeenCalledTimes(1)
    const loop = tracker().renderer.setAnimationLoop.mock.calls[0]![0]
    loop()
    expect(tracker().renderer.render).toHaveBeenCalledTimes(1)
    expect(tracker().cssRenderer.render).toHaveBeenCalledTimes(1)
  })

  it('reports the found and lost target and anchors the children to it', async () => {
    const { onFound, onLost } = setup()
    await finishStart()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()

    act(() => tracker().find(1))

    expect(onFound).toHaveBeenCalledExactlyOnceWith(1)
    expect(tracker().anchors[1]!.element).toContainElement(
      screen.getByRole('button', { name: 'Anchored' }),
    )

    act(() => tracker().lose(1))

    expect(onLost).toHaveBeenCalledExactlyOnceWith(1)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('releases everything on unmount', async () => {
    const removeListener = vi.spyOn(window, 'removeEventListener')
    const { unmount, container } = setup()
    await finishStart()
    const cameraView = container.firstElementChild!

    unmount()
    await act(async () => {})

    const released = tracker()
    expect(released.renderer.setAnimationLoop).toHaveBeenLastCalledWith(null)
    expect(released.controller.dispose).toHaveBeenCalledTimes(1)
    expect(released.controller.worker.terminate).toHaveBeenCalledTimes(1)
    expect(released.track.stop).toHaveBeenCalledTimes(1)
    expect(released.renderer.dispose).toHaveBeenCalledTimes(1)
    expect(cameraView).toBeEmptyDOMElement()
    expect(removeListener).toHaveBeenCalledWith('resize', released.onResize)
  })

  it('waits for a pending start before releasing, and never reports ready', async () => {
    const { unmount, onReady } = setup()

    unmount()
    await act(async () => {})
    expect(tracker().isReleased()).toBe(false)

    await finishStart()

    expect(tracker().isReleased()).toBe(true)
    expect(tracker().track.stop).toHaveBeenCalledTimes(1)
    expect(onReady).not.toHaveBeenCalled()
  })

  it('ignores a target found after unmount', async () => {
    const { unmount, onFound } = setup()
    await finishStart()
    unmount()

    tracker().find(0)

    expect(onFound).not.toHaveBeenCalled()
  })

  it('keeps exactly one live tracker under StrictMode', async () => {
    render(
      <StrictMode>
        <TargetTracker
          mindUrl="/targets/targets-07a7ebdd.mind"
          targetCount={1}
          onReady={() => {}}
          onFound={() => {}}
          onLost={() => {}}
          onError={() => {}}
        >
          {null}
        </TargetTracker>
      </StrictMode>,
    )
    await finishStart(0)
    await finishStart(1)

    expect(FakeTracker.instances).toHaveLength(2)
    expect(tracker(0).isReleased()).toBe(true)
    expect(tracker(1).isReleased()).toBe(false)
  })

  it('does not restart when the callbacks change', async () => {
    const { rerender, element } = setup()
    await finishStart()
    const onFound = vi.fn()

    rerender(element({ onFound }))
    act(() => tracker().find(0))

    expect(FakeTracker.instances).toHaveLength(1)
    expect(onFound).toHaveBeenCalledWith(0)
  })

  it('reports a blocked camera and still releases the tracker on unmount', async () => {
    const { onError, onReady, unmount } = setup()

    await act(async () => tracker().failStart())

    expect(onError).toHaveBeenCalledExactlyOnceWith('permission-denied')
    expect(onReady).not.toHaveBeenCalled()

    unmount()
    await act(async () => {})
    expect(tracker().isReleased()).toBe(true)
  })

  it('reports a missing camera', async () => {
    stubMediaDevices({ enumerateDevices: async () => [] })
    const { onError } = setup()

    await act(async () => tracker().failStart())

    expect(onError).toHaveBeenCalledExactlyOnceWith('no-camera')
  })

  it('reports an unsupported browser when the tracker cannot be created', () => {
    FakeTracker.shouldThrow = true

    const { onError } = setup()

    expect(onError).toHaveBeenCalledExactlyOnceWith('unsupported')
  })

  it('reports an unsupported browser when there is no camera API', () => {
    stubMediaDevices(undefined)

    const { onError } = setup()

    expect(onError).toHaveBeenCalledExactlyOnceWith('unsupported')
    expect(FakeTracker.instances).toHaveLength(0)
  })
})
