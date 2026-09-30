import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ActivityCard } from '../components/home/activity-card.tsx'
import { useHome } from '../components/home/home-context.ts'
import { useExplore } from '../components/explore/explore-context.ts'
import { activityIcon } from '../components/explore/catalog-art.ts'
import { EmptyState, ResourceState, SaveActivityButton } from '../components/explore/shared.tsx'
import { categoryArt } from '../components/home/category-art.ts'
import { focusClasses, headingClasses, primaryActionClasses } from '../components/onboarding/styles.ts'

// Activities and quests remain independent bookmarks. Quest cards open the
// detail/completion flow without automatically saving their parent activity.
export function MyQuests() {
  const navigate = useNavigate()
  const home = useHome()
  const explore = useExplore()
  const [params, setParams] = useSearchParams()
  const showingQuests = params.get('tab') === 'quests'
  const activities = explore.catalog?.activities.filter(activity => explore.bookmarkedActivityIds.includes(activity.id)) ?? []

  function selectTab(quests: boolean) {
    const next = new URLSearchParams(params)
    if (quests) next.set('tab', 'quests')
    else next.delete('tab')
    setParams(next, { replace: true })
  }

  return <section className="px-5 pt-8 pb-6">
    <title>My Quests · nowIdea</title>
    <h1 className={headingClasses}>My Quests</h1>
    <p className="mt-3 mb-5 text-[15px] text-muted">Your saved discoveries, ready when you are.</p>
    <div role="group" aria-label="Saved discoveries" className="mb-6 grid grid-cols-2 gap-1 rounded-[14px] bg-[#F8F3EA] p-1 text-[13px]">
      <button type="button" aria-pressed={!showingQuests} onClick={() => selectTab(false)} className={`min-h-11 cursor-pointer rounded-xl ${!showingQuests ? 'bg-[#FFEBC3] font-bold' : 'hover:bg-cream'} ${focusClasses}`}>Activities ({explore.loading ? '…' : activities.length})</button>
      <button type="button" aria-pressed={showingQuests} onClick={() => selectTab(true)} className={`min-h-11 cursor-pointer rounded-xl ${showingQuests ? 'bg-[#FFEBC3] font-bold' : 'hover:bg-cream'} ${focusClasses}`}>Quests ({home.loading ? '…' : home.data?.bookmarkedQuests.length ?? 0})</button>
    </div>
    {showingQuests ? home.loading || home.error ? <ResourceState loading={home.loading} error={home.error} retry={home.reload} />
      : home.data?.bookmarkedQuests.length ? <div className="grid grid-cols-2 items-stretch gap-3 [&>article]:w-full">{home.data.bookmarkedQuests.map(quest => <ActivityCard key={quest.id} activity={quest} onOpen={item => navigate(`/quests/${item.id}`, { state: { backTo: '/my-quests?tab=quests' } })} />)}</div>
        : <EmptyState title="A quest for another day"><p>Save a specific quest from Home or an activity page to keep it here.</p><Link to="/home" className={`mt-5 ${primaryActionClasses}`}>Find an idea</Link></EmptyState>
      : explore.loading || explore.error ? <ResourceState loading={explore.loading} error={explore.error} retry={explore.reload} />
        : activities.length ? <ul className="space-y-3">{activities.map(activity => <li key={activity.id} className="flex items-center gap-3 rounded-2xl border border-line/70 bg-canvas p-3">
          <Link to={`/explore/${activity.categoryId}/${activity.slug}`} state={{ backTo: '/my-quests' }} className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg ${focusClasses}`}>
            <img src={activityIcon(activity)} alt="" className="size-12 shrink-0 object-contain" />
            <div className="min-w-0"><h2 className="font-display text-[17px] leading-6 font-bold">{activity.title}</h2><p className="mt-1 text-[12px] text-muted">{categoryArt[activity.categoryId].label}</p></div>
          </Link><SaveActivityButton activity={activity} />
        </li>)}</ul>
          : <EmptyState title="Keep a little inspiration"><p>Save an activity you’d like to try. You can choose its specific quests later.</p><Link to="/explore" className={`mt-5 ${primaryActionClasses}`}>Explore activities</Link></EmptyState>}
    {!showingQuests && <p role="status" aria-live="polite" className="mt-4 text-center text-[12px] leading-5 text-muted">{explore.notice}</p>}
    <p className="mt-5 text-center text-[11px] text-muted">Preview · saves reset when you reload</p>
  </section>
}
