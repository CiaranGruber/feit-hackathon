import type { ReactNode } from 'react'

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-start justify-center bg-canvas font-sans text-ink sm:bg-[#F8F4EC] sm:px-6 sm:py-8">
      {/* One shared frame keeps onboarding and the main app the same size. */}
      <div className="relative isolate flex h-svh w-full max-w-[390px] flex-col overflow-hidden bg-canvas sm:h-[844px] sm:max-h-[calc(100svh-64px)] sm:rounded-[32px] sm:border sm:border-line/70 sm:shadow-[0_8px_48px_#47372f08]">
        {children}
      </div>
    </div>
  )
}
