import { createContext, useContext } from 'react'
import type { CatalogResult } from '../../services/explore-service.ts'

type ExploreContextValue = {
  catalog: CatalogResult | null
  loading: boolean
  error: string
  reload: () => void
  bookmarkedActivityIds: string[]
  pendingIds: Set<string>
  notice: string
  toggleActivity: (activityId: string) => Promise<void>
}
export const ExploreContext = createContext<ExploreContextValue | null>(null)
export function useExplore() {
  const context = useContext(ExploreContext)
  if (!context) throw new Error('useExplore must be used inside ExploreProvider.')
  return context
}
