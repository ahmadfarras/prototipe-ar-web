import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { VIEW_IN_AR_PATH } from '../../domain/productLink'

export function AppLayout() {
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    mainRef.current?.focus()
  }, [pathname])

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4">
      <header className="pt-4">
        <Link to="/" className="font-semibold text-slate-900">
          AR Product Prototype
        </Link>
        <nav aria-label="Main" className="mt-3 flex border-b border-slate-200">
          <NavLink
            to={VIEW_IN_AR_PATH}
            className="-mb-px flex min-h-11 items-center border-b-2 border-transparent px-1 text-sm font-medium text-slate-600 aria-[current=page]:border-slate-900 aria-[current=page]:text-slate-900"
          >
            View product in AR
          </NavLink>
        </nav>
      </header>
      <main
        ref={mainRef}
        tabIndex={-1}
        className="flex-1 pt-4 pb-8 outline-none"
      >
        <Outlet />
      </main>
    </div>
  )
}
