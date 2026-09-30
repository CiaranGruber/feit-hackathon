import grass from '../../assets/grass_1.png'
import { categoryArt } from './category-art.ts'
import type { HomeResult } from '../../services/home-service.ts'

export function AdventureSummary({ adventure }: { adventure: HomeResult['adventure'] }) {
  const total = adventure.totalActivities
  let cursor = 0
  const segments = adventure.categories.map(category => {
    const start = cursor
    cursor += total > 0 ? category.count / total * 100 : 0
    return `${categoryArt[category.id].color} ${start}% ${cursor}%`
  })
  const maxCount = Math.max(1, ...adventure.categories.map(category => category.count))
  return <figure aria-label={`${total} activities tried, by category`} className="relative flex items-center gap-2 rounded-[20px] border border-line/80 bg-canvas px-3 py-5 shadow-[0_2px_5px_#47372f03] min-[360px]:gap-4">
    <div className="relative w-[88px] shrink-0 self-stretch min-[360px]:w-[104px]">
      <div className="relative mt-3 flex size-[88px] items-center justify-center rounded-full min-[360px]:size-[104px]" style={{ background: total ? `conic-gradient(${segments.join(', ')})` : '#ede3d5' }}>
        <div className="flex size-[68px] flex-col items-center justify-center rounded-full bg-canvas text-center min-[360px]:size-[80px]"><strong className="font-display text-[27px] leading-8">{total}</strong><span className="text-[11px] leading-[15px]">activities<br />tried</span></div>
      </div>
      <img src={grass} alt="" loading="lazy" className="absolute -bottom-5 -left-3 h-14 w-16 object-contain" />
    </div>
    <ul className="min-w-0 flex-1 space-y-2.5">
      {adventure.categories.map(category => <li key={category.id} className="flex items-center gap-1.5 text-[11px] leading-4">
        <img src={categoryArt[category.id].image} alt="" width="20" height="20" className="size-5 shrink-0 object-contain" />
        <span className="w-[74px] shrink-0">{category.label}</span>
        <span aria-hidden="true" className="h-2.5 min-w-3 flex-1 overflow-hidden rounded-full bg-cream"><span className="block h-full rounded-full" style={{ width: `${category.count / maxCount * 100}%`, backgroundColor: categoryArt[category.id].color }} /></span>
        <span className="w-3 shrink-0 text-right tabular-nums">{category.count}</span>
      </li>)}
    </ul>
  </figure>
}
