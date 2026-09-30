import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import clock from '../assets/clock_1.svg'
import locationPin from '../assets/location_on.svg'
import veryDissatisfied from '../assets/sentiment_very_dissatisfied.svg'
import dissatisfied from '../assets/sentiment_dissatisfied.svg'
import neutral from '../assets/sentiment_neutral.svg'
import satisfied from '../assets/sentiment_satisfied.svg'
import verySatisfied from '../assets/sentiment_very_satisfied.svg'
import { UiIcon } from '../components/ui-icon.tsx'
import { getActivityRecords } from '../services/explore-service.ts'
import { useAsyncResource } from '../hooks/use-async-resource.ts'
import { useHome } from '../components/home/home-context.ts'
import { BottomSheet } from '../components/home/bottom-sheet.tsx'
import { BackLink, EmptyState, PreviewNote, ResourceState, explorePageClasses } from '../components/explore/shared.tsx'
import { formatRecordDate, useParentPath } from '../components/explore/explore-utils.ts'
import { focusClasses } from '../components/onboarding/styles.ts'
import type { ActivityRecord, MemoryPhoto } from '../types/discovery.ts'

type Memory = MemoryPhoto & { completedOn: string; questTitle: string }

const ratingFaces = [veryDissatisfied, dissatisfied, neutral, satisfied, verySatisfied]

function RatingFace({ rating }: { rating: number }) {
  // Match the expression to the nearest score; keep the exact numeric rating beside it.
  const icon = rating >= 1 && rating <= 5 ? ratingFaces[Math.round(rating) - 1] : undefined
  return icon ? <UiIcon src={icon} className="size-6 text-[#A76A22]" /> : null
}

function PhotoSlot({ photo, className }: { photo?: MemoryPhoto; className: string }) {
  return <div aria-hidden="true" className={`overflow-hidden bg-[#F8EEDB] ${className}`}>
    {/* TODO(asset): Supply the completion/memory photo. Leave this slot empty until its image URL is available. */}
    {photo?.imageUrl && <img src={photo.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
  </div>
}

function RecordCard({ record, onMemory, highlighted }: { record: ActivityRecord; onMemory: (memory: Memory) => void; highlighted: boolean }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => { if (highlighted) ref.current?.scrollIntoView({ block: 'start' }) }, [highlighted])
  const photo = record.photos[0]
  return <article ref={ref} className={`scroll-mt-4 overflow-hidden rounded-[18px] border bg-canvas shadow-[0_3px_8px_#47372f03] ${highlighted ? 'border-primary-dark ring-2 ring-primary/30' : 'border-line/70'}`}>
    {highlighted && <p className="bg-cream px-4 py-2 text-[12px] font-semibold">Your new memory</p>}
    <div className="grid grid-cols-[1fr_100px]">
      {photo ? <button type="button" aria-label={`View memory: ${photo.caption}`} onClick={() => onMemory({ ...photo, completedOn: record.completedOn, questTitle: record.questTitle })} className={`cursor-pointer ${focusClasses}`}><PhotoSlot photo={photo} className="h-[112px]" /></button> : <PhotoSlot className="h-[112px]" />}
      <time dateTime={record.completedOn} className="px-3 py-4 text-right text-[11px] leading-5 text-muted">{formatRecordDate(record.completedOn)}</time>
      {/* Record editing/deletion is outside this read-only first version. */}
    </div>
    <div className="p-3.5">
      <h2 className="font-display text-[17px] leading-[23px] font-bold">{record.questTitle}</h2>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] leading-5 text-muted">
        <p className="flex min-w-0 max-w-full items-center gap-1.5 [overflow-wrap:anywhere]"><UiIcon src={locationPin} className="size-4" />{record.venue}</p>
        <p className="flex items-center gap-1"><img src={clock} alt="" className="size-5" />{record.duration}</p>
      </div>
      <dl className="my-4 grid grid-cols-2 gap-3 text-[12px]">
        <div className="flex items-center justify-between gap-1"><dt>Activity<br />rating</dt><dd className="flex items-center gap-1 text-[16px]"><RatingFace rating={record.activityRating} />{record.activityRating}/5</dd></div>
        <div className="flex items-center justify-between gap-1"><dt>Venue<br />rating</dt><dd className="flex items-center gap-1 text-[16px]"><RatingFace rating={record.venueRating} />{record.venueRating}/5</dd></div>
      </dl>
      {record.notes && <p className="rounded-xl border border-line/50 bg-cream/25 p-3 text-[12px] leading-5 whitespace-pre-wrap text-ink/80 [overflow-wrap:anywhere]">{record.notes}</p>}
      {record.photoComment && <p className="mt-3 text-[12px] leading-5 [overflow-wrap:anywhere]">{record.photoComment}</p>}
      {record.photos.length > 1 && <div className="mt-3 flex gap-2">{record.photos.slice(1).map(photo => <button key={photo.id} type="button" aria-label={`View memory: ${photo.caption}`} onClick={() => onMemory({ ...photo, completedOn: record.completedOn, questTitle: record.questTitle })} className={`w-20 cursor-pointer rounded-xl ${focusClasses}`}><PhotoSlot photo={photo} className="h-20 rounded-xl" /></button>)}</div>}
      {record.likedMost && <p className="mt-3 text-[12px] leading-5 [overflow-wrap:anywhere]"><strong>Favourite part:</strong> {record.likedMost}</p>}
      {record.tips && <p className="mt-3 text-[12px] leading-5 [overflow-wrap:anywhere]"><strong>Tips for next time:</strong> {record.tips}</p>}
      {(record.recommendation || record.expectations) && <p className="mt-3 text-[11px] leading-5 text-muted">{record.recommendation ? `Would recommend: ${record.recommendation}/5` : ''}{record.recommendation && record.expectations ? ' · ' : ''}{record.expectations ? `Met expectations: ${record.expectations}/5` : ''}</p>}
    </div>
  </article>
}

export function ExploreRecords() {
  const { categoryId, activitySlug } = useParams()
  const activityId = `${categoryId}/${activitySlug}`
  return <RecordsScreen key={activityId} activityId={activityId} />
}

function RecordsScreen({ activityId }: { activityId: string }) {
  const { profile } = useHome()
  const { state } = useLocation()
  const backTo = useParentPath(`/explore/${activityId}`)
  const request = useCallback((signal: AbortSignal) => getActivityRecords(profile.id, activityId, signal), [profile.id, activityId])
  const { data, loading, error, retry } = useAsyncResource(request)
  const [params, setParams] = useSearchParams()
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  if (loading || error || !data) return <ResourceState loading={loading} error={error} retry={retry} />
  const memories = data.records.flatMap(record => record.photos.map(photo => ({ ...photo, completedOn: record.completedOn, questTitle: record.questTitle })))
  const showingMemories = params.get('tab') === 'memories'

  function selectTab(memories: boolean) {
    const next = new URLSearchParams(params)
    if (memories) next.set('tab', 'memories')
    else next.delete('tab')
    setParams(next, { replace: true })
  }

  return <section className={explorePageClasses}>
    <title>{`My ${data.activity.title} Records · nowIdea`}</title>
    <header className="mb-5 flex items-center gap-2"><BackLink to={backTo} state={{ backTo: state?.parentBackTo }} label={`Back to ${data.activity.title}`} /><h1 className="flex-1 pr-4 text-center font-display text-[20px] leading-7 font-bold">My {data.activity.title} Records</h1></header>
    <div role="group" aria-label="Record views" className="mb-5 grid grid-cols-2 gap-1 rounded-[14px] bg-[#F8F3EA] p-1 text-[12px]">
      <button type="button" aria-pressed={!showingMemories} onClick={() => selectTab(false)} className={`min-h-11 cursor-pointer rounded-xl px-2 ${!showingMemories ? 'bg-[#FFEBC3] font-bold' : 'hover:bg-cream'} ${focusClasses}`}>Completed Quests ({data.records.length})</button>
      <button type="button" aria-pressed={showingMemories} onClick={() => selectTab(true)} className={`min-h-11 cursor-pointer rounded-xl px-2 ${showingMemories ? 'bg-[#FFEBC3] font-bold' : 'hover:bg-cream'} ${focusClasses}`}>Memories ({memories.length})</button>
    </div>
    {showingMemories ? memories.length ? <div className="grid grid-cols-2 gap-3">{memories.map(memory => <button key={memory.id} type="button" onClick={() => setSelectedMemory(memory)} className={`overflow-hidden rounded-2xl border border-line/70 text-left ${focusClasses}`}><PhotoSlot photo={memory} className="aspect-square" /><div className="p-3"><p className="text-[13px] leading-5 font-semibold">{memory.caption}</p><time dateTime={memory.completedOn} className="mt-1 block text-[11px] text-muted">{formatRecordDate(memory.completedOn)}</time></div></button>)}</div>
      : <EmptyState title="A little room for memories"><p>Photos from your completed quests will appear here.</p></EmptyState>
      : data.records.length ? <div className="space-y-5">{data.records.map(record => <RecordCard key={record.id} record={record} onMemory={setSelectedMemory} highlighted={params.get('record') === record.id} />)}</div>
        : <EmptyState title="Your story starts here"><p>You haven’t completed a quest for this activity yet. Explore its related quests to find an idea.</p></EmptyState>}
    {data.isStub && <PreviewNote />}
    <BottomSheet open={Boolean(selectedMemory)} onClose={() => setSelectedMemory(null)} title="A little memory">{selectedMemory && <div className="min-h-0 overflow-y-auto px-5 pb-7"><PhotoSlot photo={selectedMemory} className="aspect-square rounded-2xl" /><p className="mt-4 font-display text-[19px] font-bold">{selectedMemory.caption}</p><p className="mt-2 text-[14px]">{selectedMemory.questTitle}</p><p className="mt-1 text-[12px] text-muted">{formatRecordDate(selectedMemory.completedOn)}</p></div>}</BottomSheet>
  </section>
}
