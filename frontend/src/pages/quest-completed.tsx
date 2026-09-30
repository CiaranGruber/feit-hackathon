import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getQuestCompletion } from '../services/quest-service.ts'
import { getProfile } from '../services/profile-service.ts'
import { useAsyncResource } from '../hooks/use-async-resource.ts'
import { useHome } from '../components/home/home-context.ts'
import { ResourceState } from '../components/explore/shared.tsx'
import { primaryActionClasses } from '../components/onboarding/styles.ts'
import { secondaryActionClasses } from '../components/quest/shared.tsx'
import companion from '../assets/companion-standing-1.png'

export function QuestCompleted() {
  const { questId = '', recordId = '' } = useParams()
  const { profile } = useHome()
  const request = useCallback(async (signal: AbortSignal) => {
    const [completion, result] = await Promise.all([getQuestCompletion(profile.id, questId, recordId, signal), getProfile(profile.id, signal)])
    return { record: completion.record, stats: result.stats }
  }, [profile.id, questId, recordId])
  const resource = useAsyncResource(request)
  if (!resource.data) return <ResourceState {...resource} />
  const { record, stats } = resource.data
  return <section className="px-6 pt-10 pb-8 text-center">
    <title>Quest Completed · nowIdea</title>
    <img src={companion} alt="" className="mx-auto h-40 w-40 object-contain" />
    {/* TODO(asset): Add the designer's celebration/confetti artwork when supplied. */}
    <p className="mt-3 text-[12px] font-semibold tracking-[0.12em] text-[#9B611B] uppercase">A new memory made</p>
    <h1 className="mt-2 font-display text-[29px] leading-10 font-bold">Quest Completed!</h1><h2 className="mt-3 font-display text-[22px] font-bold">Thank you!</h2>
    <p role="status" className="mt-3 text-[15px] leading-6">Your experience has been saved.<br />Your records and progress are up to date.</p>
    <p className="mt-4 rounded-2xl bg-cream/60 px-4 py-4 text-[14px] leading-6">{record.questTitle}</p>
    <dl className="my-6 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line py-4">{[{ label: 'Quests completed', value: stats.completedQuests }, { label: 'Activities tried', value: stats.activitiesTried }, { label: 'Categories explored', value: stats.categoriesExplored }].map(item => <div key={item.label} className="flex flex-col px-2"><dt className="order-2 mt-1 text-[11px] leading-4">{item.label}</dt><dd className="font-display text-[26px] font-bold">{item.value}</dd></div>)}</dl>
    <Link to={`/explore/${record.activityTypeId}/records?record=${encodeURIComponent(record.id)}`} className={primaryActionClasses}>View my record</Link><Link to="/home" className={`mt-3 ${secondaryActionClasses}`}>Done</Link>
    <p className="mt-5 text-[11px] leading-5 text-muted">Preview · your progress is saved in this browser.</p>
  </section>
}
