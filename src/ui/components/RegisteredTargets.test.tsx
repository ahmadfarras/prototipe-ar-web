import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { manifest } from '../../test/fixtures'
import { RegisteredTargets } from './RegisteredTargets'

describe('RegisteredTargets', () => {
  it('shows the image and the name of every registered target', () => {
    render(<RegisteredTargets targets={manifest.targets} />)

    const section = within(
      screen.getByRole('region', { name: 'Images you can scan' }),
    )
    expect(section.getAllByRole('listitem')).toHaveLength(2)
    expect(
      section.getByRole('img', { name: 'Scan target: Sample Book' }),
    ).toHaveAttribute('src', '/targets/images/book.jpg')
    expect(
      section.getByRole('img', { name: 'Scan target: Sample Box' }),
    ).toHaveAttribute('src', '/targets/images/box.jpg')
    expect(section.getByText('Sample Book')).toBeVisible()
    expect(section.getByText('Sample Box')).toBeVisible()
  })

  it('opens the full-size image in a new tab without leaving the scanner', () => {
    render(<RegisteredTargets targets={manifest.targets} />)

    const link = screen.getByRole('link', { name: /Sample Box/ })
    expect(link).toHaveAttribute('href', '/targets/images/box.jpg')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener')
  })
})
