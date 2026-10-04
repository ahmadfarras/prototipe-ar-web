import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { VIEW_IN_AR_PATH } from '../../domain/productLink'
import { SCAN_PRODUCT_PATH } from '../paths'

const AUTHOR_URL =
  'https://ahmadfarrassyafrin.com/?utm_source=prototype-ar-web&utm_medium=trademark'

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
      <footer className="pb-4 text-center text-xs text-slate-500">
        © 2026{' '}
        <a
          href={AUTHOR_URL}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center font-medium text-slate-700 underline"
        >
          Ahmad Farras Syafrin
        </a>
      </footer>
    </div>
  )
}
