import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { completeQuest, getQuestAttempt, localDate, saveQuestDraft, validateQuestStep } from '../services/quest-service.ts'
import { useHome } from '../components/home/home-context.ts'
import { useExplore } from '../components/explore/explore-context.ts'
import { useAsyncResource } from '../hooks/use-async-resource.ts'
import { useProfileSave } from '../hooks/use-profile.ts'
import { ResourceState } from '../components/explore/shared.tsx'
import { OptionContent, QuestHeader, questInputClasses, questPageClasses, secondaryActionClasses } from '../components/quest/shared.tsx'
import { PhotoPicker } from '../components/quest/photo-picker.tsx'
import { RatingPicker } from '../components/quest/rating-picker.tsx'
import { primaryActionClasses, focusClasses } from '../components/onboarding/styles.ts'
import { ArrowRight } from '../components/onboarding/arrow-right.tsx'
import type { QuestAttemptResult, QuestDraft } from '../types/quest.ts'

const steps = ['Choose option', 'Add details', 'Add photos', 'Your experience']

export function QuestComplete() {
  const { questId = '', attemptId = '' } = useParams()
  const { profile } = useHome()
  const request = useCallback((signal: AbortSignal) => getQuestAttempt(profile.id, questId, attemptId, signal), [profile.id, questId, attemptId])
  const resource = useAsyncResource(request)
  if (!resource.data) return <ResourceState {...resource} />
  if (resource.data.attempt.status === 'completed') return <Navigate replace to={`/quests/${questId}/completed/${resource.data.attempt.recordId}`} />
  return <CompletionForm key={attemptId} initial={resource.data} />
}

function CompletionForm({ initial: { quest, attempt } }: { initial: QuestAttemptResult }) {
  const home = useHome()
  const explore = useExplore()
  const navigate = useNavigate()
  const { search } = useLocation()
  const [step, setStep] = useState(attempt.step)
  const [draft, setDraft] = useState(attempt.draft)
  const [validation, setValidation] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const action = useProfileSave()
  const heading = useRef<HTMLHeadingElement>(null)
  const alert = useRef<HTMLParagraphElement>(null)
  const error = validation || action.error
  const option = quest.options.find(item => item.id === draft.optionId)
  const venue = draft.optionId === 'manual' ? draft.manualVenue : option?.title
  const busy = action.pending || photoBusy
  useEffect(() => {
    heading.current?.closest('main')?.scrollTo({ top: 0 })
    heading.current?.focus({ preventScroll: true })
  }, [step])
  useEffect(() => { if (error) alert.current?.focus() }, [error])

  function update<K extends keyof QuestDraft>(key: K, value: QuestDraft[K]) {
    setDraft(current => ({ ...current, [key]: value })); setValidation(''); action.clear()
  }
  function back() { setStep(value => Math.max(0, value - 1)); setValidation(''); action.clear() }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const message = validateQuestStep(quest.id, draft, step)
    if (message) { setValidation(message); return }
    if (step < 3) {
      void action.run(signal => saveQuestDraft(home.profile.id, quest.id, attempt.id, draft, step + 1, signal), () => setStep(value => value + 1))
    } else {
      void action.run(signal => completeQuest(home.profile.id, quest.id, attempt.id, draft, signal), result => {
        home.reload(); explore.reload()
        navigate(`/quests/${quest.id}/completed/${result.record.id}`, { replace: true })
      })
    }
  }
  function textArea(key: 'notes' | 'photoComment' | 'likedMost' | 'tips', label: string, placeholder: string) {
    return <label className="mt-5 block text-[14px]">{label}<textarea value={draft[key]} onChange={event => update(key, event.target.value)} maxLength={300} rows={3} placeholder={placeholder} className={`${questInputClasses} resize-y`} /><span className="mt-1 block text-right text-[11px] text-muted">{draft[key].length}/300</span></label>
  }
  return <section className={questPageClasses}>
    <title>{`${steps[step]} · Complete Quest`}</title><QuestHeader title="Complete Quest" backTo={`/quests/${quest.id}${search}`} />
    <ol aria-label="Completion progress" className="mb-7 grid grid-cols-4 gap-1 border-b border-line pb-5">{steps.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined} className="flex flex-col items-center gap-2 text-center"><span className={`flex size-7 items-center justify-center rounded-full text-[12px] font-bold ${index <= step ? 'bg-primary text-ink' : 'bg-line/60 text-muted'}`}>{index < step ? '✓' : index + 1}</span><span className="text-[10px] leading-[14px]">{label}</span></li>)}</ol>
    <h2 ref={heading} tabIndex={-1} className="font-display text-[24px] leading-8 font-bold outline-none">{['How did you complete this quest?', 'Your visit / completion details', 'Add a photo', 'Tell us about your experience'][step]}</h2>
    <p className="mt-2 mb-5 text-[14px] leading-6 text-muted">{['Select the option you used, or add your own if it isn’t listed.', 'Confirm your details or enter your own.', 'Keep a little memory of your adventure. You can also continue without a photo.', `How did “${quest.title}” go? Your quest will be saved when you submit.`][step]}</p>
    <form onSubmit={submit} noValidate>
      <fieldset disabled={busy} className="min-w-0 disabled:opacity-70">
        <legend className="sr-only">{steps[step]}</legend>
        {step === 0 && <div className="space-y-3">
          {quest.options.map(item => <label key={item.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-2 has-focus-visible:outline-2 has-focus-visible:outline-primary-dark ${draft.optionId === item.id ? 'border-primary-dark bg-cream/50' : 'border-line/70'}`}><OptionContent option={item} /><input type="radio" name="quest-option" aria-label={item.title} value={item.id} checked={draft.optionId === item.id} onChange={() => update('optionId', item.id)} className="mr-1 size-5 shrink-0 accent-primary-dark" /></label>)}
          <label className={`flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${draft.optionId === 'manual' ? 'border-primary-dark bg-cream/50' : 'border-line'}`}><span className="text-[14px] font-semibold">Add my own (manual input)</span><input type="radio" name="quest-option" checked={draft.optionId === 'manual'} onChange={() => update('optionId', 'manual')} className="size-5 accent-primary-dark" /></label>
          {draft.optionId === 'manual' && <label className="block text-[14px]">Place or resource name<input value={draft.manualVenue} maxLength={120} onChange={event => update('manualVenue', event.target.value)} placeholder="e.g. My local park or an online lesson" className={questInputClasses} /></label>}
        </div>}
        {step === 1 && <>
          {/* Native date/time editors may emit input before change; keep both in sync. */}
          <div className="flex items-center gap-3 rounded-2xl border border-line p-3">{option ? <OptionContent option={option} /> : <p className="flex-1 text-[14px] font-semibold [overflow-wrap:anywhere]">{venue}</p>}<button type="button" onClick={() => setStep(0)} className={`min-h-11 cursor-pointer rounded px-1 text-[12px] text-[#407499] underline ${focusClasses}`}>Change</button></div>
          <label className="mt-5 block text-[14px]">Date<input type="date" value={draft.completedOn} max={localDate()} onChange={event => update('completedOn', event.target.value)} onInput={event => update('completedOn', event.currentTarget.value)} className={questInputClasses} /></label>
          <fieldset className="mt-5"><legend className="text-[14px]">Time (optional)</legend><div className="mt-2 grid grid-cols-2 gap-3"><label className="min-w-0 text-[12px]">Start time<input type="time" value={draft.startTime} onChange={event => update('startTime', event.target.value)} onInput={event => update('startTime', event.currentTarget.value)} className={questInputClasses} /></label><label className="min-w-0 text-[12px]">End time<input type="time" value={draft.endTime} onChange={event => update('endTime', event.target.value)} onInput={event => update('endTime', event.currentTarget.value)} className={questInputClasses} /></label></div>{(draft.startTime || draft.endTime) && <button type="button" onClick={() => { update('startTime', ''); update('endTime', '') }} className={`min-h-11 cursor-pointer rounded text-[12px] underline ${focusClasses}`}>Clear times</button>}</fieldset>
          {textArea('notes', 'Notes (optional)', 'Who did you go with? What did you try?')}
        </>}
        {step === 2 && <><PhotoPicker photos={draft.photos} onChange={photos => update('photos', photos)} onBusy={setPhotoBusy} />{textArea('photoComment', 'Add a comment (optional)', 'A little memory from today…')}</>}
        {step === 3 && <>
          <RatingPicker label="How was the activity?" name="activity-rating" value={draft.activityRating} onChange={value => update('activityRating', value)} />
          <p className="text-[13px] text-muted [overflow-wrap:anywhere]">Your experience with {venue}.</p>
          <RatingPicker label="How was the venue / resource?" name="venue-rating" value={draft.venueRating} onChange={value => update('venueRating', value)} />
          <div className="mt-6 border-t border-line pt-5"><h3 className="font-display text-[19px] font-bold">A little more feedback <span className="font-sans text-[12px] font-normal text-muted">(optional)</span></h3>
            <RatingPicker label="Would you recommend this activity to a friend?" name="recommendation" value={draft.recommendation} onChange={value => update('recommendation', value)} optional />
            <RatingPicker label="Did it meet your expectations?" name="expectations" value={draft.expectations} onChange={value => update('expectations', value)} optional />
            {textArea('likedMost', 'What did you like most? (optional)', 'Tell us about your favourite part…')}{textArea('tips', 'Any tips for others? (optional)', 'Anything you’d suggest for next time?')}
          </div>
        </>}
      </fieldset>
      {error && <p ref={alert} tabIndex={-1} role="alert" className="mt-5 rounded-xl border border-error/20 bg-[#FFF1E9] p-3 text-[14px] text-error outline-none">{error}</p>}
      <div className={`mt-7 grid items-center gap-3 ${step > 0 ? 'grid-cols-[1fr_2fr]' : ''}`}>{step > 0 && <button type="button" disabled={busy} onClick={back} className={secondaryActionClasses}>Back</button>}<button type="submit" disabled={busy} className={`${primaryActionClasses} !min-h-[54px] !text-[16px]`}>{photoBusy ? 'Preparing photos…' : action.pending ? step === 3 ? 'Saving your quest…' : 'Saving step…' : step === 3 ? 'Submit' : step === 2 && !draft.photos.length ? 'Skip photos' : 'Next'}<ArrowRight /></button></div>
      <p className="mt-3 text-center text-[11px] leading-5 text-muted">Steps are saved when you continue. Your quest counts after submission.</p>
    </form>
  </section>
}
