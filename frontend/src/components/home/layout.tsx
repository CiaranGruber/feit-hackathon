import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { PhoneFrame } from '../phone-frame.tsx'
import { focusClasses, primaryActionClasses } from '../onboarding/styles.ts'
import { HomeProvider } from './home-provider.tsx'
import { useHome } from './home-context.ts'
import { ExploreProvider } from '../explore/explore-provider.tsx'
import homeIcon from '../../assets/home_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg'
import exploreIcon from '../../assets/search_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg'
import questsIcon from '../../assets/flag_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg'
import profileIcon from '../../assets/person_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg'

const tabs = [
  { to: '/home', label: 'Home', icon: homeIcon },
  { to: '/explore', label: 'Explore', icon: exploreIcon },
  { to: '/my-quests', label: 'My Quests', icon: questsIcon },
  { to: '/profile', label: 'Profile', icon: profileIcon },
]

function AppFrame() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const { loading, error, reload, notice } = useHome()
  const homePage = pathname === '/home'
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <PhoneFrame>
      <main ref={mainRef} tabIndex={-1} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain outline-none [scrollbar-gutter:stable] [scrollbar-width:thin]">
        {homePage && loading ? <p role="status" className="px-6 py-24 text-center text-muted">Finding a little inspiration…</p>
          : homePage && error ? <div role="alert" className="px-6 py-24 text-center"><h1 className="font-display text-2xl font-bold">A little detour</h1><p className="my-5">{error}</p><button type="button" onClick={reload} className={primaryActionClasses}>Try again</button></div>
            : <Outlet />}
      </main>
      <div role="status" aria-live="polite" aria-atomic="true" className="shrink-0">
        {notice && <p className="border-t border-line bg-cream px-4 py-2 text-center text-xs">{notice}</p>}
      </div>
      {!pathname.startsWith('/quests/') && <nav aria-label="Main navigation" className="z-10 grid shrink-0 grid-cols-4 gap-1 border-t border-line/80 bg-canvas px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_#47372f03]">
        {tabs.map(tab => <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[12px] font-semibold transition-colors ${isActive ? 'bg-cream text-[#925A16]' : 'text-ink hover:bg-cream/60'} ${focusClasses}`}>
          {/* Mask the supplied SVG so the icon inherits the active link colour. */}
          <span
            aria-hidden="true"
            className="size-6 shrink-0 bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
            style={{ maskImage: `url("${tab.icon}")`, WebkitMaskImage: `url("${tab.icon}")` }}
          />
          {tab.label}
        </NavLink>)}
      </nav>}
    </PhoneFrame>
  )
}

export function MainLayout() {
  return <HomeProvider><ExploreProvider><AppFrame /></ExploreProvider></HomeProvider>
}
