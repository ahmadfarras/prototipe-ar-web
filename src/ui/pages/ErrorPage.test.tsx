import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { expect, it, vi } from 'vitest'
import { ErrorPage } from './ErrorPage'

function Broken(): never {
  throw new Error('boom')
}

it('replaces a crashed route with the error page', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const router = createMemoryRouter([
    { path: '/', element: <Broken />, errorElement: <ErrorPage /> },
  ])

  render(<RouterProvider router={router} />)

  expect(
    screen.getByRole('heading', { level: 1, name: 'Something went wrong' }),
  ).toBeVisible()
  expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute(
    'href',
    '/',
  )
  expect(screen.queryByText('boom')).not.toBeInTheDocument()
})
