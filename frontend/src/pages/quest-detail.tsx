import { useCallback, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getQuestDetail, startQuest } from '../services/quest-service.ts'
import { useAsyncResource } from '../hooks/use-async-resource.ts'
import { useProfileSave } from '../hooks/use-profile.ts'
import { useHome } from '../components/home/home-context.ts'
import { ActivityCover, ActivityMeta } from '../components/home/activity-card.tsx'
import { categoryArt } from '../components/home/category-art.ts'
import { BottomSheet } from '../components/home/bottom-sheet.tsx'
import { BackLink, ResourceState } from '../components/explore/shared.tsx'
import { OptionContent } from '../components/quest/shared.tsx'
import { ArrowRight } from '../components/onboarding/arrow-right.tsx'
import { focusClasses, primaryActionClasses } from '../components/onboarding/styles.ts'
import bookmark from '../assets/bookmark.svg'
import { UiIcon } from '../components/ui-icon.tsx'
import type { QuestOption } from '../types/quest.ts'

export function QuestDetailPage() {
  const { questId = '' } = useParams()
  return <QuestScreen key={questId} questId={questId} />
}

function QuestScreen({ questId }: { questId: string }) {
  const home = useHome()
  const navigate = useNavigate()
  const { state, search } = useLocation()
  const request = useCallback((signal: AbortSignal) => getQuestDetail(home.profile.id, questId, signal), [home.profile.id, questId])
  const resource = useAsyncResource(request)
  const action = useProfileSave()
  const [kind, setKind] = useState<QuestOption['kind']>('in-person')
  const [selected, setSelected] = useState<QuestOption | null>(null)
  if (!resource.data) return <ResourceState {...resource} />
  const { quest } = resource.data
  const backTo = typeof state?.backTo === 'string' && /^\/(home|explore|my-quests)([/?]|$)/.test(state.backTo) ? state.backTo : `/explore/${quest.activityTypeId}`
  const saved = Boolean(home.data?.bookmarkedQuests.some(item => item.id === quest.id))
  const pending = home.pendingBookmarks.has(quest.id)
  const options = quest.options.filter(option => option.kind === kind)
  const begin = () => void action.run(signal => startQuest(home.profile.id, quest.id, signal), result => navigate(`/quests/${quest.id}/complete/${result.attempt.id}${search}`))
  return <section className="pb-6">
    <title>{`${quest.title} · nowIdea`}</title>
    <div className="relative"><ActivityCover activity={quest} className="h-[240px]" /><div className="absolute inset-x-4 top-4 flex justify-between"><span className="rounded-full bg-canvas"><BackLink to={backTo} label="Back to discoveries" /></span><button type="button" disabled={pending || home.loading || Boolean(home.error)} aria-label={`${saved ? 'Unsave' : 'Save'} ${quest.title}`} aria-pressed={saved} onClick={() => void home.toggleBookmark(quest)} className={`flex size-11 cursor-pointer items-center justify-center rounded-full bg-canvas disabled:opacity-40 ${saved ? 'text-primary-dark' : 'text-ink'} ${focusClasses}`}><UiIcon src={bookmark} /></button></div></div>
    <div className="relative -mt-5 rounded-t-[26px] bg-canvas px-5 pt-5">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]"><span className="rounded-full bg-[#D8EAF7] px-3 py-1.5">{quest.kind}</span><span className="flex items-center gap-1 rounded-full bg-cream px-3 py-1"><img src={categoryArt[quest.categoryId].image} alt="" className="size-5 object-contain" />{categoryArt[quest.categoryId].label}</span></div>
      <h1 className="font-display text-[27px] leading-9 font-bold">{quest.title}</h1><p className="mt-3 mb-4 text-[15px] leading-6 text-ink/80">{quest.description}</p>
      <div className="flex flex-wrap items-center gap-4"><ActivityMeta activity={quest} /><span className="rounded-full bg-[#FCE4CF] px-3 py-1 text-[12px]">{quest.difficulty}</span></div>
      <section className="mt-6 rounded-2xl border border-line/60 bg-cream/60 p-4"><h2 className="font-display text-[19px] font-bold">Your quest goal</h2><p className="mt-2 text-[14px] leading-6">{quest.goal}</p></section>
      <section className="mt-6 border-b border-line pb-5"><h2 className="font-display text-[19px] font-bold">About this quest</h2><p className="mt-2 text-[14px] leading-6 text-ink/80">{quest.about}</p></section>
      <section className="mt-5 border-b border-line pb-5"><h2 className="font-display text-[19px] font-bold">Difficulty · {quest.difficulty}</h2><p className="mt-2 text-[14px] leading-6 text-ink/80">{quest.difficultyDescription}</p></section>
      <section className="mt-5"><h2 className="font-display text-[20px] font-bold">Where / How can I try this?</h2><div role="group" aria-label="Quest options" className="my-4 grid grid-cols-3 gap-1 rounded-full bg-cream/60 p-1">{(['in-person', 'online', 'idea'] as const).map((value, index) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={`min-h-11 cursor-pointer rounded-full px-1 text-[11px] ${kind === value ? 'bg-[#FFE4A2] font-bold' : ''} ${focusClasses}`}>{['In-person', 'Online', 'More ideas'][index]} ({quest.options.filter(option => option.kind === value).length})</button>)}</div>
        <ul className="space-y-3">{options.map(option => <li key={option.id}><button type="button" onClick={() => setSelected(option)} className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-line/70 p-2 text-left ${focusClasses}`}><OptionContent option={option} /><ArrowRight /></button></li>)}</ul>
        <p className="mt-3 text-[11px] leading-5 text-muted">Preview options · locations and resources have not been verified.</p>
      </section>
      {home.error && <p role="alert" className="mt-4 text-[13px]">Bookmarks couldn’t load. <button type="button" onClick={home.reload} className="cursor-pointer underline">Try again</button></p>}
      {action.error && <p role="alert" className="mt-4 rounded-xl bg-[#FFF1E9] p-3 text-[14px] text-error">{action.error}</p>}
      <button type="button" disabled={action.pending} onClick={begin} className={`mt-6 ${primaryActionClasses}`}>{action.pending ? 'Opening your quest…' : 'Start Quest'}<ArrowRight /></button>
      <p className="mt-3 text-center text-[11px] leading-5 text-muted">Already started? We’ll resume your saved steps.</p>
    </div>
    <BottomSheet open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title ?? 'Quest option'}>{selected && <div className="overflow-y-auto px-5 pb-8"><div className="mb-5 flex gap-3"><OptionContent option={selected} /></div><p className="text-[15px] leading-7">{selected.description}</p><button type="button" onClick={() => setSelected(null)} className={`mt-6 ${primaryActionClasses}`}>Back to quest</button></div>}</BottomSheet>
  </section>
}
