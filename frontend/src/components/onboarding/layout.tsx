import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

export function OnboardingLayout() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    mainRef.current?.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="flex min-h-svh items-start justify-center bg-canvas font-sans text-ink sm:bg-[#F8F4EC] sm:px-6 sm:py-8">
      {/* Keep the frame stable across routes; longer content scrolls inside it. */}
      <main
        ref={mainRef}
        tabIndex={-1}
        className="relative isolate flex h-svh w-full max-w-[390px] flex-col overflow-y-auto overscroll-y-contain bg-canvas outline-none [scrollbar-gutter:stable] [scrollbar-width:thin] sm:h-[844px] sm:max-h-[calc(100svh-64px)] sm:rounded-[32px] sm:border sm:border-line/70 sm:shadow-[0_8px_48px_#47372f08]"
      >
        <Outlet />
      </main>
    </div>
  )
}
