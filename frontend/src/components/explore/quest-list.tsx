import { ActivityCover, ActivityMeta } from '../home/activity-card.tsx'
import { ArrowRight } from '../onboarding/arrow-right.tsx'
import { focusClasses } from '../onboarding/styles.ts'
import { EmptyState } from './shared.tsx'
import type { Quest } from '../../types/discovery.ts'

export function QuestList({ quests, onOpen }: { quests: Quest[]; onOpen: (quest: Quest) => void }) {
  if (!quests.length) return <EmptyState title="More ideas are on their way"><p>Save this activity to find it again while we gather quests for it.</p></EmptyState>
  return <ul className="space-y-3">
    {quests.map(quest => <li key={quest.id}>
      <button type="button" onClick={() => onOpen(quest)} className={`flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-[16px] border border-line/70 bg-canvas p-2 text-left shadow-[0_2px_5px_#47372f03] hover:bg-cream/35 ${focusClasses}`}>
        <ActivityCover activity={quest} className="h-[82px] w-[82px] shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1"><h3 className="mb-2 font-display text-[14px] leading-5 font-bold">{quest.title}</h3><ActivityMeta activity={quest} /></div>
        <span className="shrink-0 scale-75"><ArrowRight /></span>
      </button>
    </li>)}
  </ul>
}
