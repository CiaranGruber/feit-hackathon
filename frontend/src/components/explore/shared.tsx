import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import heart from '../../assets/feature-heart_1.svg'
import { ArrowRight } from '../onboarding/arrow-right.tsx'
import { focusClasses, primaryActionClasses } from '../onboarding/styles.ts'
import { useExplore } from './explore-context.ts'
import { activityIcon } from './catalog-art.ts'
import type { ActivitySummary, ActivityType } from '../../types/discovery.ts'

export const explorePageClasses = 'px-5 pt-[max(20px,env(safe-area-inset-top))] pb-7'
export const exploreTitleClasses = 'font-display text-[28px] leading-9 font-bold tracking-[-0.6px]'
export const sectionTitleClasses = 'font-display text-[19px] leading-6 font-bold'

export function BackLink({ to, label = 'Back', state }: { to: string; label?: string; state?: unknown }) {
  return <Link to={to} state={state} aria-label={label} className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-cream ${focusClasses}`}><span className="rotate-180"><ArrowRight /></span></Link>
}

export function ResourceState({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (loading) return <p role="status" className="px-6 py-16 text-center text-muted">Finding a little inspiration…</p>
  return <div role="alert" className="px-6 py-12 text-center"><h2 className="font-display text-2xl font-bold">A little detour</h2><p className="my-5 text-[14px]">{error}</p><button type="button" onClick={retry} className={primaryActionClasses}>Try again</button><Link to="/explore" className={`mt-5 inline-block rounded-md text-[14px] underline ${focusClasses}`}>Back to the catalog</Link></div>
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-[20px] border border-dashed border-line bg-cream/25 px-5 py-8 text-center"><h2 className={sectionTitleClasses}>{title}</h2><div className="mt-3 text-[14px] leading-6 text-muted">{children}</div></div>
}

export function MissingActivity() {
  return <div className={explorePageClasses}><BackLink to="/explore" label="Back to the catalog" /><EmptyState title="We couldn’t find that page"><p>Head back to the catalog and choose an activity to explore.</p><Link to="/explore" className={`mt-5 ${primaryActionClasses}`}>Explore activities</Link></EmptyState></div>
}

export function ActivityTile({ activity }: { activity: ActivitySummary }) {
  const { pathname, search } = useLocation()
  return <Link to={`/explore/${activity.categoryId}/${activity.slug}`} state={{ backTo: pathname + search }} className={`flex min-h-[116px] flex-col items-center justify-center rounded-[16px] border px-2 py-3 text-center shadow-[0_2px_5px_#47372f03] transition-colors hover:border-primary/60 ${activity.completedQuestCount > 0 ? 'border-[#D9E6ED] bg-[#F6F9F4]' : 'border-line/60 bg-canvas'} ${focusClasses}`}>
    <img src={activityIcon(activity)} alt="" width="44" height="44" loading="lazy" className={`mb-2 size-11 object-contain ${activity.completedQuestCount > 0 ? '' : 'opacity-55 grayscale'}`} />
    <span className="text-[12px] leading-[17px]">{activity.title}</span>
    {activity.completedQuestCount > 0 ? <span className="mt-1 text-[11px] font-semibold text-[#407499]">{activity.completedQuestCount} {activity.completedQuestCount === 1 ? 'quest' : 'quests'}<span className="sr-only"> completed</span></span> : <span className="sr-only">Not tried yet</span>}
  </Link>
}

export function SaveActivityButton({ activity }: { activity: ActivityType }) {
  const { bookmarkedActivityIds, pendingIds, toggleActivity, loading, error } = useExplore()
  const saved = bookmarkedActivityIds.includes(activity.id)
  const pending = pendingIds.has(activity.id)
  return <button type="button" aria-label={`${saved ? 'Unsave' : 'Save'} activity: ${activity.title}`} aria-pressed={saved} aria-busy={pending} disabled={pending || loading || Boolean(error)} onClick={() => void toggleActivity(activity.id)} className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-canvas shadow-sm disabled:cursor-wait disabled:opacity-50 ${focusClasses}`}>
    <img src={heart} alt="" className={`size-7 ${saved ? '' : 'opacity-40 grayscale'}`} />
  </button>
}

export function PreviewNote() {
  return <p className="mt-5 text-center text-[11px] text-muted">Preview · sample quests, your saved records</p>
}
