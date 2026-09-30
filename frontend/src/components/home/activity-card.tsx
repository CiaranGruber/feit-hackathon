import heart from '../../assets/feature-heart_1.svg'
import clock from '../../assets/clock_1.svg'
import { ArrowRight } from '../onboarding/arrow-right.tsx'
import { focusClasses } from '../onboarding/styles.ts'
import type { Activity, QuestKind } from '../../services/home-service.ts'
import { useHome } from './home-context.ts'

const badgeClasses: Record<QuestKind, string> = {
  Familiar: 'bg-[#FFF0BD] text-[#765614]',
  Explore: 'bg-[#D8EAF7] text-[#345D7F]',
  Wildcard: 'bg-[#EDDFFC] text-[#654282]',
}

export function ActivityCover({ activity, className = '' }: { activity: Activity; className?: string }) {
  return <div aria-hidden="true" className={`overflow-hidden bg-[#FBF3E5] ${className}`}>
    {/* TODO(asset): Add this activity's scene illustration once coverImageUrl is supplied. Keep the reserved cover empty until then. */}
    {activity.coverImageUrl && <img src={activity.coverImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
  </div>
}

export function ActivityMeta({ activity }: { activity: Activity }) {
  return <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-5 text-ink/85">
    <span className="flex items-center gap-1"><img src={clock} alt="" width="20" height="20" className="size-5" /><span>{activity.duration}</span></span>
    <span aria-label={`Cost: ${activity.cost}`}>{activity.cost}</span>
  </p>
}

export function ActivityCard({ activity, compact = false, onOpen }: { activity: Activity; compact?: boolean; onOpen: (activity: Activity) => void }) {
  const { data, toggleBookmark, pendingBookmarks } = useHome()
  const saved = Boolean(data?.bookmarkedQuests.some(quest => quest.id === activity.id))
  const pending = pendingBookmarks.has(activity.id)
  if (compact) return <article className="w-[126px] shrink-0 snap-start overflow-hidden rounded-2xl border border-line/70 bg-canvas shadow-[0_2px_5px_#47372f04]">
    <button type="button" onClick={() => onOpen(activity)} className={`block w-full cursor-pointer text-left ${focusClasses}`}>
      <ActivityCover activity={activity} className="h-[94px]" />
      <div className="px-2.5 pt-2.5 pb-3"><h3 className="mb-1.5 min-h-9 text-[13px] leading-[18px] font-bold">{activity.title}</h3><ActivityMeta activity={activity} /></div>
    </button>
  </article>

  return <article className="relative flex w-[184px] shrink-0 snap-start flex-col overflow-hidden rounded-[18px] border border-line/70 bg-canvas shadow-[0_2px_6px_#47372f05]">
    <button type="button" aria-label={`View ${activity.title}`} onClick={() => onOpen(activity)} className={`cursor-pointer ${focusClasses}`}><ActivityCover activity={activity} className="h-[116px]" /></button>
    <button type="button" aria-label={`${saved ? 'Unsave' : 'Save'} ${activity.title}`} aria-pressed={saved} aria-busy={pending} disabled={pending} onClick={() => void toggleBookmark(activity)} className={`absolute top-2 right-2 flex size-10 cursor-pointer items-center justify-center rounded-full border bg-canvas shadow-sm transition-colors disabled:cursor-wait disabled:opacity-50 ${saved ? 'border-[#EDB5A3] bg-[#FFF0E8]' : 'border-line'} ${focusClasses}`}>
      <img src={heart} alt="" className={`size-6 ${saved ? '' : 'opacity-40 grayscale'}`} />
    </button>
    <div className="relative flex flex-1 flex-col px-3 pb-3">
      <span className={`-mt-3 mb-2 w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClasses[activity.kind]}`}>{activity.kind}</span>
      <h3 className="font-display text-[18px] leading-6 font-bold"><button type="button" onClick={() => onOpen(activity)} className={`cursor-pointer rounded-sm text-left ${focusClasses}`}>{activity.title}</button></h3>
      <p className="mt-1.5 mb-3 flex-1 text-[13px] leading-[19px] text-ink/80">{activity.description}</p>
      <div className="flex items-center justify-between gap-1"><ActivityMeta activity={activity} /><button type="button" aria-label={`View details for ${activity.title}`} onClick={() => onOpen(activity)} className={`flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#FFDC94] hover:bg-primary ${focusClasses}`}><ArrowRight /></button></div>
    </div>
  </article>
}
