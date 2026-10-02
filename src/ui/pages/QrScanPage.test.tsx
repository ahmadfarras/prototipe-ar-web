import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScanError } from '../components/QrScanner'
import { QrScanPage } from './QrScanPage'

const scanner = vi.hoisted(() => ({
  emitResult: (_text: string) => {},
  emitError: (_error: ScanError) => {},
}))

vi.mock('../components/QrScanner', () => ({
  QrScanner: (props: {
    onResult: (text: string) => void
    onError: (error: ScanError) => void
  }) => {
    scanner.emitResult = props.onResult
    scanner.emitError = props.onError
    return <video aria-label="Camera preview" muted />
  },
}))

function renderScanPage() {
  const router = createMemoryRouter(
    [
      { path: '/view-in-ar', element: <h1>Products</h1> },
      { path: '/view-in-ar/scan', element: <QrScanPage /> },
      { path: '/view-in-ar/p/:slug', element: <h1>Product page</h1> },
    ],
    { initialEntries: ['/view-in-ar/scan'] },
  )
  const navigate = vi.spyOn(router, 'navigate')
  render(<RouterProvider router={router} />)
  return { router, navigate }
}

beforeEach(() => {
  scanner.emitResult = () => {}
  scanner.emitError = () => {}
})

describe('QrScanPage', () => {
  it('shows the camera and a hint', () => {
    renderScanPage()

    expect(screen.getByLabelText('Camera preview')).toBeInTheDocument()
    expect(screen.getByText(/Point the camera at the QR code/)).toBeVisible()
  })

  it('navigates to the product once, even when the scanner keeps firing', async () => {
    const { router, navigate } = renderScanPage()

    await act(async () => {
      scanner.emitResult('https://ar.example.com/view-in-ar/p/chair')
      scanner.emitResult('https://ar.example.com/view-in-ar/p/chair')
      scanner.emitResult('https://ar.example.com/view-in-ar/p/wall-art')
    })

    expect(navigate).toHaveBeenCalledOnce()
    expect(router.state.location.pathname).toBe('/view-in-ar/p/chair')
  })

  it.each([
    ['plain text', 'hello world'],
    ['another site', 'https://evil.example/login'],
    ['javascript URL', 'javascript:alert(1)'],
  ])('ignores %s and keeps scanning', async (_label, text) => {
    const { router, navigate } = renderScanPage()

    await act(async () => scanner.emitResult(text))

    expect(navigate).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/view-in-ar/scan')
    expect(screen.getByRole('status')).toHaveTextContent(
      'That QR code is not a product code.',
    )
    expect(screen.getByLabelText('Camera preview')).toBeInTheDocument()
  })

  it('still accepts a product code after an unrecognised one', async () => {
    const { router } = renderScanPage()

    await act(async () => scanner.emitResult('hello world'))
    await act(async () => scanner.emitResult('chair'))

    expect(router.state.location.pathname).toBe('/view-in-ar/p/chair')
  })

  it.each([
    ['permission-denied', /Camera access was blocked/],
    ['no-camera', /No camera is available/],
  ] as const)(
    'explains the %s error and links home',
    async (error, message) => {
      renderScanPage()

      await act(async () => scanner.emitError(error))

      expect(screen.getByRole('alert')).toHaveTextContent(message)
      expect(screen.queryByLabelText('Camera preview')).not.toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'Browse products instead' }),
      ).toHaveAttribute('href', '/view-in-ar')
    },
  )
})
