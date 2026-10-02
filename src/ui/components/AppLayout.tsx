import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { VIEW_IN_AR_PATH } from '../../domain/productLink'
import { SCAN_PRODUCT_PATH } from '../paths'

const TAB_CLASS =
  '-mb-px flex min-h-11 items-center border-b-2 border-transparent px-1 text-sm font-medium text-slate-600 aria-[current=page]:border-slate-900 aria-[current=page]:text-slate-900'

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
        <nav
          aria-label="Main"
          className="mt-3 flex gap-4 border-b border-slate-200"
        >
          <NavLink to={SCAN_PRODUCT_PATH} className={TAB_CLASS}>
            Scan product
          </NavLink>
          <NavLink to={VIEW_IN_AR_PATH} className={TAB_CLASS}>
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
