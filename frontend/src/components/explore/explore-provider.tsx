import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { getCatalog, getActivityBookmarks, setActivityBookmarked, type CatalogResult } from '../../services/explore-service.ts'
import { useHome } from '../home/home-context.ts'
import { ExploreContext } from './explore-context.ts'

export function ExploreProvider({ children }: { children: ReactNode }) {
  const { key: locationKey } = useLocation()
  const { profile } = useHome()
  const [catalog, setCatalog] = useState<CatalogResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [bookmarkedActivityIds, setBookmarkedActivityIds] = useState<string[]>([])
  const [pendingIds, setPendingIds] = useState(new Set<string>())
  const [notice, setNotice] = useState('')
  const [noticeKey, setNoticeKey] = useState('')
  const locks = useRef(new Set<string>())

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getCatalog(profile.id, controller.signal), getActivityBookmarks(profile.id, controller.signal)])
      .then(([data, bookmarks]) => {
        if (!controller.signal.aborted) { setCatalog(data); setBookmarkedActivityIds(bookmarks.activityIds) }
      }).catch(error => {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load the catalog.')
      }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [profile.id, version])

  function reload() { setLoading(true); setError(''); setVersion(value => value + 1) }

  async function toggleActivity(activityId: string) {
    if (locks.current.has(activityId) || !catalog) return
    locks.current.add(activityId)
    setPendingIds(new Set(locks.current))
    setNotice('')
    setNoticeKey(locationKey)
    try {
      const result = await setActivityBookmarked(profile.id, activityId, !bookmarkedActivityIds.includes(activityId))
      setBookmarkedActivityIds(current => result.bookmarked ? [...new Set([...current, activityId])] : current.filter(id => id !== activityId))
      const title = catalog.activities.find(activity => activity.id === activityId)?.title ?? 'Activity'
      setNotice(result.bookmarked ? `${title} saved to Activities in My Quests.` : `${title} removed from saved activities.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save this activity. Please try again.')
    } finally {
      locks.current.delete(activityId)
      setPendingIds(new Set(locks.current))
    }
  }

  return <ExploreContext.Provider value={{ catalog, loading, error, reload, bookmarkedActivityIds, pendingIds, notice: noticeKey === locationKey ? notice : '', toggleActivity }}>{children}</ExploreContext.Provider>
}
