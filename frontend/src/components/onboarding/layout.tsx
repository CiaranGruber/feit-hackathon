import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PhoneFrame } from '../phone-frame.tsx'

export function OnboardingLayout() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    mainRef.current?.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <PhoneFrame>
      {/* Keep the frame stable across routes; longer content scrolls inside it. */}
      <main
        ref={mainRef}
        tabIndex={-1}
        className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain outline-none [scrollbar-gutter:stable] [scrollbar-width:thin]"
      >
        <Outlet />
      </main>
    </PhoneFrame>
  )
}
