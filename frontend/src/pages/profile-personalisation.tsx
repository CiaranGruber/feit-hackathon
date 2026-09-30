import { useState, type FormEvent } from 'react'
import { useProfile, useProfileSave } from '../hooks/use-profile.ts'
import { updatePersonalisation } from '../services/profile-service.ts'
import type { ProfileDetails } from '../types/profile.ts'
import { interestOptions } from '../data/interests.ts'
import { focusClasses, primaryActionClasses } from '../components/onboarding/styles.ts'
import { ProfileHeader, ProfileLoading, SaveFeedback, profileCardClasses, profileInputClasses, profilePageClasses } from '../components/profile/shared.tsx'

const examples = [
  'I want to try more outdoor activities', 'I’m looking for relaxing weekend ideas',
  'I prefer indoor activities', 'I want to meet new people', 'I’m curious about creative hobbies',
]

function PersonalisationForm({ profile }: { profile: ProfileDetails }) {
  const [text, setText] = useState(profile.personalisation)
  const [confirmed, setConfirmed] = useState(profile.personalisation)
  const action = useProfileSave()
  const interests = interestOptions.filter(option => profile.interestIds.includes(option.id))
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (text === confirmed) return
    void action.run(signal => updatePersonalisation(profile.id, text, signal), result => {
      setText(result.profile.personalisation)
      setConfirmed(result.profile.personalisation)
    })
  }

  return <form onSubmit={submit}>
    <div className="relative mb-5 flex min-h-[180px] items-center gap-3 rounded-[24px] bg-[#FFF0E7] p-4">
      {/* TODO(asset): Add the companion writing in a journal illustration. */}
      <div aria-hidden="true" data-asset-slot="personalisation-art" className="h-36 w-[94px] shrink-0" />
      <div><h2 className="font-display text-[21px] leading-7 font-bold">Tell nowIdea<br />about you</h2><p className="mt-2 text-[13px] leading-5 text-ink/75">Share your interests, lifestyle, preferences or goals to help shape your next adventure.</p></div>
    </div>
    <label htmlFor="personalisation-note" className="sr-only">About your interests and preferences</label>
    <textarea id="personalisation-note" value={text} disabled={action.pending} maxLength={500} rows={5} aria-describedby="personalisation-count" placeholder="I like trying new food and outdoor activities…" onChange={event => { setText(event.target.value); action.clear() }} className={`${profileInputClasses} mt-0 resize-y`} />
    <p id="personalisation-count" className="mt-1 text-right text-[12px] text-muted">{text.length}/500</p>
    <fieldset disabled={action.pending} className="mt-6 rounded-2xl bg-cream/45 p-4 disabled:opacity-60">
      <legend className="sr-only">Examples to get started</legend>
      <h2 className="mb-3 font-display text-[17px] font-bold">Examples to get started</h2>
      <div className="space-y-2">{examples.map(example => {
        const next = text.trim() ? `${text.trim()}\n${example}` : example
        return <button key={example} type="button" disabled={next.length > 500 || text.includes(example)} onClick={() => { setText(next); action.clear() }} className={`block min-h-11 w-full cursor-pointer rounded-full border border-line/60 bg-canvas px-3 py-2 text-left text-[12px] leading-4 hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40 ${focusClasses}`}>{example}</button>
      })}</div>
    </fieldset>
    <section className={`mt-5 p-4 ${profileCardClasses}`}>
      <h2 className="font-display text-[17px] font-bold">What nowIdea has learned</h2>
      <p className="mt-1 mb-3 text-[12px] leading-5 text-muted">From the interests you’ve selected.</p>
      {/* These summaries reflect explicit choices only; the preview performs no AI inference. */}
      {interests.length ? <ul className="space-y-2">{interests.map(interest => <li key={interest.id} className="flex items-center gap-2 rounded-full bg-cream/40 px-3 py-2 text-[12px]"><img src={interest.icon} alt="" className="size-6 object-contain" />Interested in {interest.label.toLowerCase()}</li>)}</ul> : <p className="text-[13px] text-muted">Choose your interests to start building your profile.</p>}
    </section>
    <button type="submit" disabled={action.pending || text === confirmed} className={`mt-6 ${primaryActionClasses}`}>{action.pending ? 'Saving…' : 'Save Changes'}</button>
    <SaveFeedback {...action} />
  </form>
}

export function ProfilePersonalisation() {
  const resource = useProfile()
  if (!resource.data) return <ProfileLoading {...resource} />
  return <section className={profilePageClasses}><title>Personalisation · nowIdea</title><ProfileHeader title="Personalisation" /><PersonalisationForm key={resource.data.profile.id} profile={resource.data.profile} /></section>
}
