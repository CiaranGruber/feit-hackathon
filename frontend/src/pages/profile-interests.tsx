import { useState, type FormEvent } from 'react'
import { useProfile, useProfileSave } from '../hooks/use-profile.ts'
import { updateProfileInterests } from '../services/profile-service.ts'
import type { ProfileDetails } from '../types/profile.ts'
import { InterestPicker } from '../components/onboarding/interest-picker.tsx'
import { primaryActionClasses } from '../components/onboarding/styles.ts'
import { ProfileHeader, ProfileLoading, SaveFeedback, profilePageClasses } from '../components/profile/shared.tsx'

function InterestsForm({ profile }: { profile: ProfileDetails }) {
  const [selected, setSelected] = useState(profile.interestIds)
  const [confirmed, setConfirmed] = useState(profile.interestIds)
  const action = useProfileSave()
  const dirty = selected.length !== confirmed.length || selected.some(id => !confirmed.includes(id))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected.length || !dirty) return
    void action.run(signal => updateProfileInterests(profile.id, selected, signal), result => {
      setSelected(result.profile.interestIds)
      setConfirmed(result.profile.interestIds)
    })
  }

  return <form onSubmit={submit}>
    <h2 className="font-display text-[19px] font-bold">Choose your interested categories</h2>
    <p id="profile-interests-hint" className="mt-2 mb-6 text-[14px] leading-6 text-ink/75">Select the categories you enjoy or want to explore.</p>
    {/* Category-only preferences intentionally match the onboarding questionnaire. */}
    <InterestPicker selected={selected} disabled={action.pending} hintId="profile-interests-hint" onToggle={id => {
      action.clear()
      setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
    }} />
    <p role="status" className="mt-5 text-center text-[13px] text-muted">{selected.length ? `${selected.length} ${selected.length === 1 ? 'interest' : 'interests'} selected` : 'Choose at least one interest.'}</p>
    <button type="submit" disabled={action.pending || !selected.length || !dirty} className={`mt-4 ${primaryActionClasses}`}>{action.pending ? 'Saving…' : 'Save'}</button>
    <SaveFeedback {...action} />
  </form>
}

export function ProfileInterests() {
  const resource = useProfile()
  if (!resource.data) return <ProfileLoading {...resource} />
  return <section className={profilePageClasses}><title>My Interests · nowIdea</title><ProfileHeader title="My Interests" /><InterestsForm key={resource.data.profile.id} profile={resource.data.profile} /></section>
}
