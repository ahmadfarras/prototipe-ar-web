export function ErrorPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">
        Something went wrong
      </h1>
      <p className="mt-2 text-slate-600">Please reload and try again.</p>
      <a href="/" className="mt-4 inline-block font-semibold underline">
        Back to home
      </a>
    </main>
  )
}
