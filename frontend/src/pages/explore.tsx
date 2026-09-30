import { Link, useSearchParams } from 'react-router-dom'
import searchIcon from '../assets/search_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg'
import closeIcon from '../assets/close_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg'
import { UiIcon } from '../components/ui-icon.tsx'
import { filterCatalog } from '../data/catalog.ts'
import { categoryArt } from '../components/home/category-art.ts'
import { categorySurfaces } from '../components/explore/catalog-art.ts'
import { useExplore } from '../components/explore/explore-context.ts'
import { ActivityTile, EmptyState, ResourceState, explorePageClasses, exploreTitleClasses } from '../components/explore/shared.tsx'
import { ArrowRight } from '../components/onboarding/arrow-right.tsx'
import { focusClasses } from '../components/onboarding/styles.ts'

export function Explore() {
  const { catalog, loading, error, reload } = useExplore()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const searchOpen = params.has('q')
  const results = catalog ? filterCatalog(catalog.activities, query) : []

  function updateSearch(value: string | null) {
    const next = new URLSearchParams(params)
    if (value === null) next.delete('q')
    else next.set('q', value)
    setParams(next, { replace: true })
  }

  return <section className={explorePageClasses}>
    <title>Explore · nowIdea</title>
    <header className="mt-3 flex items-start justify-between gap-2">
      <h1 className={exploreTitleClasses}>Activity Catalog</h1>
      <button type="button" aria-label={searchOpen ? 'Close search' : 'Search activities'} aria-expanded={searchOpen} aria-controls="catalog-search" onClick={() => updateSearch(searchOpen ? null : '')} className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-cream ${focusClasses}`}>
        <UiIcon src={searchOpen ? closeIcon : searchIcon} />
      </button>
    </header>
    <p className="mt-2 mb-6 max-w-[280px] text-[15px] leading-6 text-ink/75">Explore by category and find new experiences.</p>

    {searchOpen && <div id="catalog-search" className="mb-6">
      <label htmlFor="activity-search" className="sr-only">Search activities</label>
      <input autoFocus id="activity-search" type="search" value={query} onChange={event => updateSearch(event.target.value)} placeholder="Try swimming, café, or art…" maxLength={100} className="h-12 w-full rounded-2xl border border-line bg-white/50 px-4 text-[16px] outline-none placeholder:text-muted focus:border-primary-dark focus:ring-2 focus:ring-primary/20" />
    </div>}

    {loading || error ? <ResourceState loading={loading} error={error} retry={reload} /> : catalog && <>
      {query.trim() ? <>
        <p role="status" className="mb-4 text-[13px] text-muted">{results.length} {results.length === 1 ? 'activity' : 'activities'} found</p>
        {results.length ? <div className="grid grid-cols-3 gap-2.5">{results.map(activity => <ActivityTile key={activity.id} activity={activity} />)}</div>
          : <EmptyState title="No discoveries just yet"><p>Try another activity or category name.</p><button type="button" onClick={() => updateSearch('')} className={`mt-3 min-h-11 cursor-pointer rounded-md font-bold text-ink underline underline-offset-4 ${focusClasses}`}>Clear search</button></EmptyState>}
      </> : <div className="grid grid-cols-2 gap-3">
        {catalog.categories.map(category => <Link key={category.id} to={`/explore/${category.id}`} state={{ backTo: `/explore${searchOpen ? '?q=' : ''}` }} className={`relative flex min-h-[148px] flex-col items-center justify-center rounded-[16px] border border-transparent px-3 py-4 text-center transition-colors ${categorySurfaces[category.id]} ${focusClasses}`}>
          <img src={categoryArt[category.id].image} alt="" width="58" height="58" className="mb-1.5 size-[58px] object-contain" />
          <h2 className="text-[15px] leading-5 font-bold">{category.title}</h2>
          <div className="mt-2 flex items-center gap-2 text-[12px] text-ink/75"><span>{category.activityCount} activities</span><span className="scale-75"><ArrowRight /></span></div>
        </Link>)}
      </div>}
    </>}
  </section>
}
