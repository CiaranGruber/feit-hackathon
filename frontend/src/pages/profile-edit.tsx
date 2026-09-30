import { useState, type FormEvent } from 'react'
import { useHome } from '../components/home/home-context.ts'
import { useProfile, useProfileSave } from '../hooks/use-profile.ts'
import { updateProfileDetails } from '../services/profile-service.ts'
import type { ProfileDetails } from '../types/profile.ts'
import { primaryActionClasses } from '../components/onboarding/styles.ts'
import { ProfileHeader, ProfileLoading, SaveFeedback, profileInputClasses, profilePageClasses } from '../components/profile/shared.tsx'

function EditForm({ profile }: { profile: ProfileDetails }) {
  const { updateName } = useHome()
  const [values, setValues] = useState({ name: profile.name, handle: profile.handle, bio: profile.bio })
  const [confirmed, setConfirmed] = useState(values)
  const action = useProfileSave()
  const dirty = Object.keys(values).some(key => values[key as keyof typeof values] !== confirmed[key as keyof typeof values])
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!dirty) return
    void action.run(signal => updateProfileDetails(profile.id, values, signal), result => {
      const { name, handle, bio } = result.profile
      setValues({ name, handle, bio })
      setConfirmed({ name, handle, bio })
      updateName(name)
    })
  }
  return <form onSubmit={submit}>
    <fieldset disabled={action.pending} className="space-y-5">
      <div><label htmlFor="profile-name" className="text-[14px] font-semibold">Name</label><input id="profile-name" required maxLength={100} autoComplete="name" value={values.name} onChange={event => { setValues({ ...values, name: event.target.value }); action.clear() }} className={profileInputClasses} /></div>
      <div><label htmlFor="profile-handle" className="text-[14px] font-semibold">Username (optional)</label><input id="profile-handle" maxLength={30} autoCapitalize="none" spellCheck={false} aria-describedby="handle-hint" value={values.handle} onChange={event => { setValues({ ...values, handle: event.target.value }); action.clear() }} className={profileInputClasses} /><p id="handle-hint" className="mt-2 text-[12px] text-muted">Letters, numbers and underscores. No @ needed.</p></div>
      <div><label htmlFor="profile-bio" className="text-[14px] font-semibold">Bio (optional)</label><textarea id="profile-bio" maxLength={160} rows={3} value={values.bio} onChange={event => { setValues({ ...values, bio: event.target.value }); action.clear() }} className={`${profileInputClasses} resize-y`} /><p className="mt-1 text-right text-[12px] text-muted">{values.bio.length}/160</p></div>
    </fieldset>
    <button type="submit" disabled={action.pending || !values.name.trim() || !dirty} className={`mt-7 ${primaryActionClasses}`}>{action.pending ? 'Saving…' : 'Save Changes'}</button>
    <SaveFeedback {...action} />
  </form>
}

export function ProfileEdit() {
  const resource = useProfile()
  if (!resource.data) return <ProfileLoading {...resource} />
  return <section className={profilePageClasses}><title>Edit Profile · nowIdea</title><ProfileHeader title="Edit Profile" /><EditForm key={resource.data.profile.id} profile={resource.data.profile} /></section>
}
