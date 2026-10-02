import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

export function AppLayout() {
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    mainRef.current?.focus()
  }, [pathname])

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4">
      <header className="py-4">
        <Link to="/" className="font-semibold text-slate-900">
          AR Product Prototype
        </Link>
      </header>
      <main ref={mainRef} tabIndex={-1} className="flex-1 pb-8 outline-none">
        <Outlet />
      </main>
    </div>
  )
}
