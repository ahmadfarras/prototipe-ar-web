import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Not found</h1>
      <p className="mt-2 text-slate-600">
        We could not find that product or page.
      </p>
      <Link to="/" className="mt-4 inline-block font-semibold underline">
        Back to home
      </Link>
    </>
  )
}
