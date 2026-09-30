import { createContext, useContext } from 'react'
import type { DisplayProfile } from '../../data/display-profile.ts'
import type { Activity, HomeResult } from '../../services/home-service.ts'

type HomeContextValue = {
  profile: DisplayProfile
  updateName: (name: string) => void
  data: HomeResult | null
  loading: boolean
  error: string
  notice: string
  pendingBookmarks: Set<string>
  reload: () => void
  toggleBookmark: (activity: Activity) => Promise<void>
}

export const HomeContext = createContext<HomeContextValue | null>(null)

export function useHome() {
  const context = useContext(HomeContext)
  if (!context) throw new Error('useHome must be used inside HomeProvider.')
  return context
}
