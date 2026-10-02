import { render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QrScanner } from './QrScanner'

type Decode = (result: { data: string }) => void

const lib = vi.hoisted(() => ({
  instances: [] as {
    decode: Decode
    pause: ReturnType<typeof vi.fn>
    destroy: ReturnType<typeof vi.fn>
    options: unknown
  }[],
  start: vi.fn<() => Promise<void>>(),
  hasCamera: vi.fn<() => Promise<boolean>>(),
}))

vi.mock('qr-scanner', () => ({
  default: class {
    static hasCamera = lib.hasCamera
    pause = vi.fn().mockResolvedValue(true)
    destroy = vi.fn()
    start = lib.start
    constructor(_video: HTMLVideoElement, decode: Decode, options: unknown) {
      lib.instances.push({
        decode,
        pause: this.pause,
        destroy: this.destroy,
        options,
      })
    }
  },
}))

function liveScanners() {
  return lib.instances.filter((scanner) => !scanner.destroy.mock.calls.length)
}

beforeEach(() => {
  lib.instances.length = 0
  lib.start.mockReset().mockResolvedValue()
  lib.hasCamera.mockReset().mockResolvedValue(true)
})

describe('QrScanner', () => {
  it('starts scanning with the back camera on mount', () => {
    render(<QrScanner onResult={vi.fn()} onError={vi.fn()} />)

    expect(screen.getByLabelText('Camera preview')).toBeInTheDocument()
    expect(lib.start).toHaveBeenCalledOnce()
    expect(lib.instances[0]?.options).toMatchObject({
      preferredCamera: 'environment',
    })
  })

  it('reports decoded text', () => {
    const onResult = vi.fn()
    render(<QrScanner onResult={onResult} onError={vi.fn()} />)

    lib.instances[0]?.decode({ data: 'https://ar.example.com/p/chair' })

    expect(onResult).toHaveBeenCalledExactlyOnceWith(
      'https://ar.example.com/p/chair',
    )
  })

  it('releases the camera immediately on unmount', () => {
    const { unmount } = render(
      <QrScanner onResult={vi.fn()} onError={vi.fn()} />,
    )

    unmount()

    expect(lib.instances[0]?.pause).toHaveBeenCalledExactlyOnceWith(true)
    expect(liveScanners()).toHaveLength(0)
  })

  it('keeps exactly one live scanner under StrictMode', () => {
    render(
      <StrictMode>
        <QrScanner onResult={vi.fn()} onError={vi.fn()} />
      </StrictMode>,
    )

    expect(lib.instances).toHaveLength(2)
    expect(liveScanners()).toHaveLength(1)
  })

  it('does not restart the camera when the callbacks change', () => {
    const { rerender } = render(
      <QrScanner onResult={vi.fn()} onError={vi.fn()} />,
    )

    rerender(<QrScanner onResult={vi.fn()} onError={vi.fn()} />)

    expect(lib.instances).toHaveLength(1)
  })

  it('reports permission-denied when a camera exists but cannot start', async () => {
    lib.start.mockRejectedValue('Camera not found.')
    const onError = vi.fn()

    render(<QrScanner onResult={vi.fn()} onError={onError} />)

    await waitFor(() =>
      expect(onError).toHaveBeenCalledExactlyOnceWith('permission-denied'),
    )
  })

  it('reports no-camera when the device has none', async () => {
    lib.start.mockRejectedValue('Camera not found.')
    lib.hasCamera.mockResolvedValue(false)
    const onError = vi.fn()

    render(<QrScanner onResult={vi.fn()} onError={onError} />)

    await waitFor(() =>
      expect(onError).toHaveBeenCalledExactlyOnceWith('no-camera'),
    )
  })

  it('stays silent when start fails after unmount', async () => {
    lib.start.mockRejectedValue('Camera not found.')
    const onError = vi.fn()

    const { unmount } = render(
      <QrScanner onResult={vi.fn()} onError={onError} />,
    )
    unmount()

    await waitFor(() => expect(lib.hasCamera).toHaveBeenCalled())
    expect(onError).not.toHaveBeenCalled()
  })
})
