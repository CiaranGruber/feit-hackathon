import { useCallback } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getActivityDetail } from '../services/explore-service.ts'
import { useAsyncResource } from '../hooks/use-async-resource.ts'
import { useHome } from '../components/home/home-context.ts'
import { useExplore } from '../components/explore/explore-context.ts'
import { activityIcon } from '../components/explore/catalog-art.ts'
import { BackLink, PreviewNote, ResourceState, SaveActivityButton, sectionTitleClasses } from '../components/explore/shared.tsx'
import { useParentPath } from '../components/explore/explore-utils.ts'
import { QuestList } from '../components/explore/quest-list.tsx'
import { focusClasses, primaryActionClasses } from '../components/onboarding/styles.ts'
import { ArrowRight } from '../components/onboarding/arrow-right.tsx'

export function ExploreActivity() {
  const { categoryId, activitySlug } = useParams()
  const activityId = `${categoryId}/${activitySlug}`
  // Remount only when the activity changes, keeping unrelated quest-sheet state local.
  return <ActivityScreen key={activityId} activityId={activityId} />
}

function ActivityScreen({ activityId }: { activityId: string }) {
  const navigate = useNavigate()
  const { profile } = useHome()
  const { notice, error: catalogError, loading: catalogLoading, reload } = useExplore()
  const request = useCallback((signal: AbortSignal) => getActivityDetail(profile.id, activityId, signal), [profile.id, activityId])
  const { data, loading, error, retry } = useAsyncResource(request)
  const [params, setParams] = useSearchParams()
  const related = params.get('tab') === 'quests'
  const categoryPath = `/explore/${activityId.split('/')[0]}`
  const backTo = useParentPath(categoryPath)
  if (loading || error || !data) return <ResourceState loading={loading} error={error} retry={retry} />
  const { activity, quests } = data
  const recordsPath = `/explore/${activity.categoryId}/${activity.slug}/records`

  function showRelated(value: boolean) {
    const next = new URLSearchParams(params)
    if (value) next.set('tab', 'quests')
    else next.delete('tab')
    setParams(next, { replace: true })
  }

  return <section className="pb-7">
    <title>{`${activity.title} · Explore`}</title>
    <div className="relative h-[202px] bg-[#F8EEDB]">
      {/* TODO(asset): Add the activity hero scene once its cover image is supplied. */}
      {activity.coverImageUrl && <img src={activity.coverImageUrl} alt="" className="h-full w-full object-cover" />}
      <div className="absolute inset-x-4 top-[max(16px,env(safe-area-inset-top))] flex items-center justify-between">
        <span className="rounded-full bg-canvas/95"><BackLink to={backTo} label="Back to activities" /></span>
        <SaveActivityButton activity={activity} />
      </div>
    </div>
    <div className="relative -mt-5 rounded-t-[26px] bg-canvas px-5 pt-5">
      <header className="flex items-center gap-4">
        <div className="flex size-[64px] shrink-0 items-center justify-center rounded-[14px] border border-line/80 bg-[#F3F7FA]"><img src={activityIcon(activity)} alt="" className="size-12 object-contain" /></div>
        <div className="min-w-0"><h1 className="font-display text-[25px] leading-8 font-bold">{activity.title}</h1><p className="mt-1 text-[13px] text-muted">{activity.completedQuestCount} {activity.completedQuestCount === 1 ? 'quest' : 'quests'} completed</p></div>
      </header>
      <p className="mt-4 text-[15px] leading-6 text-ink/80">{activity.description}</p>
      <p role="status" aria-live="polite" className="mt-2 text-[12px] leading-5 text-muted">{notice}</p>
      {catalogError && <div role="alert" className="mt-3 rounded-xl bg-cream p-3 text-[13px]">Saved activities couldn’t load. <button type="button" onClick={reload} className={`cursor-pointer rounded font-bold underline ${focusClasses}`}>Try again</button></div>}
      {catalogLoading && <p role="status" className="mt-2 text-[12px] text-muted">Loading saved activities…</p>}

      <nav aria-label="Activity sections" className="mt-5 mb-6 grid grid-cols-3 gap-1 rounded-full bg-[#F8F3EA] p-1 text-center text-[11px]">
        <button type="button" aria-current={!related ? 'page' : undefined} onClick={() => showRelated(false)} className={`min-h-10 cursor-pointer rounded-full px-1 ${!related ? 'bg-[#FFEBC3] font-bold' : 'hover:bg-cream'} ${focusClasses}`}>Overview</button>
        <Link to={recordsPath} state={{ backTo: `/explore/${activityId}${related ? '?tab=quests' : ''}`, parentBackTo: backTo }} className={`flex min-h-10 items-center justify-center rounded-full px-1 hover:bg-cream ${focusClasses}`}>My Records ({activity.completedQuestCount})</Link>
        <button type="button" aria-current={related ? 'page' : undefined} onClick={() => showRelated(true)} className={`min-h-10 cursor-pointer rounded-full px-1 ${related ? 'bg-[#FFEBC3] font-bold' : 'hover:bg-cream'} ${focusClasses}`}>Related Quests</button>
      </nav>

      {!related && <section aria-labelledby="activity-about" className="mb-5 border-b border-line/70 pb-5"><h2 id="activity-about" className={sectionTitleClasses}>About this activity</h2><p className="mt-3 text-[14px] leading-[22px] text-ink/80">{activity.about}</p></section>}
      <section aria-labelledby="activity-quests">
        <div className="mb-3 flex items-center justify-between gap-2"><h2 id="activity-quests" className={sectionTitleClasses}>{related ? `Related quests (${quests.length})` : 'Popular quests'}</h2>{!related && quests.length > 2 && <button type="button" onClick={() => showRelated(true)} className={`min-h-11 cursor-pointer rounded-md text-[12px] text-[#9B611B] ${focusClasses}`}>See all →</button>}</div>
        <QuestList quests={related ? quests : quests.slice(0, 2)} onOpen={quest => navigate(`/quests/${quest.id}`, { state: { backTo: `/explore/${activityId}${related ? '?tab=quests' : ''}` } })} />
      </section>
      {!related && quests.length > 0 && <button type="button" onClick={() => showRelated(true)} className={`mt-5 !text-[14px] ${primaryActionClasses}`}>Browse all {activity.title.toLowerCase()} quests<ArrowRight /></button>}
      {data.isStub && <PreviewNote />}
    </div>
  </section>
}
