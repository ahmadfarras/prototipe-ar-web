import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { chair, wallArt } from '../../test/fixtures'
import { ModelViewer } from './ModelViewer'

vi.mock('@google/model-viewer', () => ({}))

function getViewer(): HTMLElement {
  const viewer = document.querySelector<HTMLElement>('model-viewer')
  if (!viewer) throw new Error('model-viewer element not rendered')
  return viewer
}

function finishLoading(canActivateAR: boolean) {
  const viewer = getViewer()
  Object.defineProperty(viewer, 'canActivateAR', { value: canActivateAR })
  fireEvent(viewer, new Event('load'))
}

describe('ModelViewer', () => {
  it('configures the viewer from the product', () => {
    render(<ModelViewer product={chair} />)

    const viewer = getViewer()
    expect(viewer).toHaveAttribute('src', chair.modelUrl)
    expect(viewer).toHaveAttribute('alt', chair.alt)
    expect(viewer).toHaveAttribute('ar')
    expect(viewer).toHaveAttribute('camera-controls')
    expect(viewer).toHaveAttribute('ar-scale', 'fixed')
    expect(viewer).toHaveAttribute('ar-placement', 'floor')
    expect(viewer).not.toHaveAttribute('ios-src')
    expect(viewer).not.toHaveAttribute('poster')
    expect(screen.getByRole('button', { name: 'View in AR' })).toBeVisible()
  })

  it('passes the optional iOS model and poster', () => {
    render(<ModelViewer product={wallArt} />)

    const viewer = getViewer()
    expect(viewer).toHaveAttribute('ios-src', wallArt.iosModelUrl)
    expect(viewer).toHaveAttribute('poster', wallArt.posterUrl)
    expect(viewer).toHaveAttribute('ar-placement', 'wall')
  })

  it('shows a loading status until the model loads', () => {
    render(<ModelViewer product={chair} />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading 3D model')

    finishLoading(true)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText(/AR is not available/)).not.toBeInTheDocument()
  })

  it('explains when AR is not available on the device', () => {
    render(<ModelViewer product={chair} />)

    finishLoading(false)

    expect(screen.getByText(/AR is not available/)).toBeVisible()
  })

  it('shows an error when the model fails to load', () => {
    render(<ModelViewer product={chair} />)

    fireEvent(getViewer(), new Event('error'))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The 3D model could not be loaded.',
    )
  })
})
