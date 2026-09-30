import { ActivityCover, ActivityMeta } from './activity-card.tsx'
import { categoryArt } from './category-art.ts'
import { useHome } from './home-context.ts'
import { primaryActionClasses } from '../onboarding/styles.ts'
import type { Activity } from '../../services/home-service.ts'

export function ActivityDetail({ activity }: { activity: Activity }) {
  const { data, pendingBookmarks, toggleBookmark, notice, loading, error, reload } = useHome()
  const saved = data?.bookmarkedQuests.some(quest => quest.id === activity.id)
  const pending = pendingBookmarks.has(activity.id)
  return <div className="min-h-0 overflow-y-auto overscroll-y-contain px-6 pb-8">
    <ActivityCover activity={activity} className="mb-5 h-[180px] rounded-2xl" />
    <p className="mb-3 flex items-center gap-2 text-[13px]"><img src={categoryArt[activity.categoryId].image} alt="" className="size-7 object-contain" />{categoryArt[activity.categoryId].label}<span className="ml-auto rounded-full bg-cream px-3 py-1">{activity.kind}</span></p>
    <p className="mb-4 text-[15px] leading-6">{activity.description}</p>
    <ActivityMeta activity={activity} />
    {error && <p role="alert" className="mt-5 text-[13px]">Saved quests couldn’t load. <button type="button" onClick={reload} className="cursor-pointer font-bold underline">Try again</button></p>}
    <button type="button" disabled={pending || loading || Boolean(error)} onClick={() => void toggleBookmark(activity)} className={`mt-6 ${primaryActionClasses}`}>{loading ? 'Loading saved quests…' : pending ? 'Saving…' : saved ? 'Remove bookmark' : 'Save to My Quests'}</button>
    <p role="status" aria-live="polite" className="mt-3 text-center text-[13px]">{notice}</p>
    {data?.isStub && <p className="mt-5 text-center text-[12px] leading-5 text-muted">A sample idea. Duration and cost are estimates.</p>}
  </div>
}
