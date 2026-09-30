import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { readDisplayProfile, updateDisplayName } from '../../data/display-profile.ts'
import { getHome, setQuestBookmarked, type Activity, type HomeResult } from '../../services/home-service.ts'
import { HomeContext } from './home-context.ts'

export function HomeProvider({ children }: { children: ReactNode }) {
  const { key: locationKey } = useLocation()
  const [profile, setProfile] = useState(readDisplayProfile)
  const [data, setData] = useState<HomeResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [noticeKey, setNoticeKey] = useState('')
  const [version, setVersion] = useState(0)
  const [pendingBookmarks, setPendingBookmarks] = useState(new Set<string>())
  const bookmarkLocks = useRef(new Set<string>())

  useEffect(() => {
    const controller = new AbortController()
    getHome(profile.id, controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result)
    }).catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load your ideas.')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [profile.id, version])

  async function toggleBookmark(activity: Activity) {
    if (!data || bookmarkLocks.current.has(activity.id)) return
    bookmarkLocks.current.add(activity.id)
    setPendingBookmarks(new Set(bookmarkLocks.current))
    setNotice('')
    setNoticeKey(locationKey)
    const desired = !data.bookmarkedQuests.some(quest => quest.id === activity.id)
    try {
      const result = await setQuestBookmarked(profile.id, activity.id, desired)
      setData(current => current && ({
        ...current,
        bookmarkedQuests: result.bookmarked
          ? [...current.bookmarkedQuests.filter(quest => quest.id !== activity.id), activity]
          : current.bookmarkedQuests.filter(quest => quest.id !== activity.id),
      }))
      setNotice(result.bookmarked ? `${activity.title} saved to My Quests.` : `${activity.title} removed from bookmarks.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save this activity. Please try again.')
    } finally {
      bookmarkLocks.current.delete(activity.id)
      setPendingBookmarks(new Set(bookmarkLocks.current))
    }
  }

  function reload() {
    setLoading(true)
    setError('')
    setVersion(current => current + 1)
  }

  return <HomeContext.Provider value={{ profile, updateName: name => setProfile(updateDisplayName(name)), data, loading, error, notice: noticeKey === locationKey ? notice : '', pendingBookmarks, reload, toggleBookmark }}>{children}</HomeContext.Provider>
}
