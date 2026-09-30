import { useParams } from 'react-router-dom'
import { useExplore } from '../components/explore/explore-context.ts'
import { ActivityTile, BackLink, MissingActivity, ResourceState, explorePageClasses, exploreTitleClasses } from '../components/explore/shared.tsx'
import { useParentPath } from '../components/explore/explore-utils.ts'
import { categoryArt } from '../components/home/category-art.ts'

export function ExploreCategory() {
  const { categoryId } = useParams()
  const { catalog, loading, error, reload } = useExplore()
  const backTo = useParentPath('/explore')
  if (loading || error) return <ResourceState loading={loading} error={error} retry={reload} />
  const category = catalog?.categories.find(item => item.id === categoryId)
  if (!category) return <MissingActivity />
  const activities = catalog!.activities.filter(activity => activity.categoryId === category.id)

  return <section className={explorePageClasses}>
    <title>{`${category.title} · Explore`}</title>
    <BackLink to={backTo} label={backTo === '/profile' ? 'Back to profile' : backTo.startsWith('/my-quests') ? 'Back to My Quests' : 'Back to the catalog'} />
    <header className="mt-3 mb-7 flex items-start gap-4">
      <img src={categoryArt[category.id].image} alt="" width="68" height="68" className="size-[68px] shrink-0 object-contain" />
      <div><h1 className={exploreTitleClasses}>{category.title}</h1><p className="mt-2 text-[14px] leading-[22px] text-ink/75">{category.description}</p></div>
    </header>
    <div className="grid grid-cols-3 gap-2.5">{activities.map(activity => <ActivityTile key={activity.id} activity={activity} />)}</div>
    <p className="mt-5 text-center text-[11px] leading-5 text-muted">Colour marks activities you’ve tried.<br />Every activity is open to explore.</p>
    {catalog?.isStub && <p className="mt-2 text-center text-[11px] text-muted">Preview · completion history saved in this browser</p>}
  </section>
}
