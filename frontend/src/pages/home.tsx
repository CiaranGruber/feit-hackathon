import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import sparkle from '../assets/feature-sparkle_1.svg'
import bookmarkIcon from '../assets/bookmark.svg'
import { UiIcon } from '../components/ui-icon.tsx'
import { ArrowRight } from '../components/onboarding/arrow-right.tsx'
import { focusClasses } from '../components/onboarding/styles.ts'
import { useHome } from '../components/home/home-context.ts'
import { CompanionArt } from '../components/home/companion-art.tsx'
import { CompanionChat } from '../components/home/companion-chat.tsx'
import { ActivityCard } from '../components/home/activity-card.tsx'
import { AdventureSummary } from '../components/home/adventure-summary.tsx'
import { BottomSheet } from '../components/home/bottom-sheet.tsx'
import type { Activity } from '../services/home-service.ts'

type HomeSheet = { type: 'ideas' } | { type: 'adventure' } | null
const actionClasses = `flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-md text-[12px] text-[#9B611B] hover:text-ink ${focusClasses}`

function SectionHeading({ title, bookmark = false, children }: { title: string; bookmark?: boolean; children: ReactNode }) {
  return <div className="mb-2 flex items-center justify-between gap-2">
    <h2 className="flex items-center gap-1.5 font-display text-[19px] leading-6 font-bold">
      {bookmark ? <UiIcon src={bookmarkIcon} className="size-5 text-primary-dark" /> : <img src={sparkle} alt="" className="size-5 shrink-0" />}{title}
    </h2>{children}
  </div>
}

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

export function Home() {
  const navigate = useNavigate()
  const { data, profile } = useHome()
  const [chatOpen, setChatOpen] = useState(false)
  const [sheet, setSheet] = useState<HomeSheet>(null)
  const firstName = profile.name.trim().split(/\s+/)[0] || 'friend'
  if (!data) return null
  const openActivity = (activity: Activity) => navigate(`/quests/${activity.id}`, { state: { backTo: '/home' } })

  return <section className="px-5 pt-[max(20px,env(safe-area-inset-top))] pb-6">
    <title>Home · nowIdea</title>
    <header>
      <div className="relative flex h-[88px] items-start justify-between">
        {/* TODO(asset): Add the nowIdea wordmark here when the designer supplies it. */}
        <div aria-hidden="true" className="mt-4 h-10 w-[150px]" />
        <button type="button" aria-label="Chat with your companion" aria-haspopup="dialog" onClick={() => setChatOpen(true)} className={`-mt-1 -mr-2 cursor-pointer rounded-3xl transition-transform hover:scale-105 motion-reduce:transform-none ${focusClasses}`}><CompanionArt className="size-[106px]" /></button>
      </div>
      <h1 className="mt-2 pr-1 font-display text-[24px] leading-[32px] font-bold [overflow-wrap:anywhere]">{greeting()}, {firstName}!</h1>
      <p className="mt-1 flex items-center gap-1 text-[15px] text-ink/80">What shall we discover today?<img src={sparkle} alt="" className="size-5" /></p>
    </header>

    <section aria-label="Ideas for you" className="mt-6">
      <SectionHeading title="Ideas for you"><button type="button" onClick={() => setSheet({ type: 'ideas' })} className={actionClasses}>See all<ArrowRight /></button></SectionHeading>
      <div className="-mx-5 flex snap-x snap-proximity scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 pt-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {data.ideas.map(activity => <ActivityCard key={activity.id} activity={activity} onOpen={openActivity} />)}
      </div>
    </section>

    <section aria-label="Your bookmarked quests" className="mt-4">
      <SectionHeading title="Your bookmarked quests" bookmark><Link to="/my-quests?tab=quests" className={actionClasses}>See all<ArrowRight /></Link></SectionHeading>
      {data.bookmarkedQuests.length ? <div className="-mx-5 flex snap-x snap-proximity scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 pt-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {data.bookmarkedQuests.map(activity => <ActivityCard key={activity.id} activity={activity} compact onOpen={openActivity} />)}
      </div> : <p className="rounded-2xl border border-dashed border-line px-5 py-6 text-[14px] text-muted">A little adventure starts with an idea. Save one above to keep it here.</p>}
    </section>

    <section aria-label="Your adventure so far" className="mt-4">
      <SectionHeading title="Your adventure so far"><button type="button" onClick={() => setSheet({ type: 'adventure' })} className={actionClasses}>See details<ArrowRight /></button></SectionHeading>
      <AdventureSummary adventure={data.adventure} />
    </section>
    {data.isStub && <p className="mt-5 text-center text-[11px] text-muted">Preview · sample ideas, your saved progress</p>}

    <CompanionChat open={chatOpen} onClose={() => setChatOpen(false)} />
    <BottomSheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet?.type === 'adventure' ? 'Your adventure so far' : 'Ideas for you'}>
      {sheet?.type === 'ideas' && <div className="min-h-0 overflow-y-auto overscroll-y-contain px-5 pb-6"><p className="mb-5 text-[14px] text-muted">A familiar favourite or something unexpected?</p><div className="grid grid-cols-2 items-stretch gap-3 [&>article]:w-full">{data.ideas.map(activity => <ActivityCard key={activity.id} activity={activity} onOpen={openActivity} />)}</div></div>}
      {sheet?.type === 'adventure' && <div className="min-h-0 overflow-y-auto px-5 pb-6"><p className="mb-5 text-[15px] leading-6">Every new experience adds a little colour to your story.</p><AdventureSummary adventure={data.adventure} /><p className="mt-5 text-[13px] leading-6 text-muted">{data.isStub ? 'Your completed quests update this chart. Progress is saved in this browser.' : 'Your completed activities, grouped by category.'}</p></div>}
    </BottomSheet>
  </section>
}
