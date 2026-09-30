import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import person from '../assets/person_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg'
import image from '../assets/image.svg'
import mail from '../assets/mail.svg'
import lock from '../assets/lock.svg'
import notifications from '../assets/notifications.svg'
import verifiedUser from '../assets/verified_user.svg'
import language from '../assets/language.svg'
import darkMode from '../assets/dark_mode.svg'
import help from '../assets/help.svg'
import info from '../assets/info.svg'
import description from '../assets/description.svg'
import shield from '../assets/shield.svg'
import logout from '../assets/logout.svg'
import { UiIcon } from '../components/ui-icon.tsx'
import { signOut } from '../services/auth-service.ts'
import { useProfileSave } from '../hooks/use-profile.ts'
import { BottomSheet } from '../components/home/bottom-sheet.tsx'
import { focusClasses } from '../components/onboarding/styles.ts'
import { ProfileHeader, ProfileMenuRow, SaveFeedback, profileCardClasses, profilePageClasses } from '../components/profile/shared.tsx'

// TODO(backend): Connect account management and settings as their APIs are agreed.
// Unimplemented settings open an explanation instead of reporting a fake save.
const settingsInfo = {
  'Change Avatar': 'Avatar uploads aren’t available in this preview yet.',
  Email: 'Email changes will be available when account management is connected.',
  Password: 'Password changes will be available when account management is connected.',
  Notifications: 'Notification preferences aren’t available in this preview yet.',
  'Privacy & Data': 'Profile edits, interests and personalisation notes are saved in this browser tab for the preview. They are not sent to a server. Data management options will be added with account support.',
  Language: 'This preview is available in English. More language options can be added later.',
  Appearance: 'This preview uses the light appearance shown in the design.',
  'Help Centre': 'Browse categories in Explore, save activities and quests to My Quests, and update your interests from Profile. Your companion can offer sample ideas from Home.',
  'About nowIdea': 'Discover new experiences and make everyday life more interesting. This is the nowIdea hackathon preview.',
  'Terms of Service': 'The Terms of Service will be available before registration opens.',
  'Privacy Policy': 'The Privacy Policy will be available before registration opens.',
} as const
type SettingName = keyof typeof settingsInfo
const settingsIcons: Record<SettingName, string> = {
  'Change Avatar': image,
  Email: mail,
  Password: lock,
  Notifications: notifications,
  'Privacy & Data': verifiedUser,
  Language: language,
  Appearance: darkMode,
  'Help Centre': help,
  'About nowIdea': info,
  'Terms of Service': description,
  'Privacy Policy': shield,
}
const groups: { title: string; items: SettingName[] }[] = [
  { title: 'Account', items: ['Email', 'Password'] },
  { title: 'App Preferences', items: ['Notifications', 'Privacy & Data', 'Language', 'Appearance'] },
  { title: 'Help & About', items: ['Help Centre', 'About nowIdea', 'Terms of Service', 'Privacy Policy'] },
]

export function ProfileSettings() {
  const [sheet, setSheet] = useState<SettingName | null>(null)
  const navigate = useNavigate()
  const action = useProfileSave()
  return <section className={profilePageClasses}>
    <title>Settings · nowIdea</title><ProfileHeader title="Settings" />
    <h2 className="mb-3 font-display text-[19px] font-bold">Profile</h2>
    <div className={`divide-y divide-line/60 ${profileCardClasses}`}><ProfileMenuRow label="Edit Profile" to="/profile/edit" icon={person} /><ProfileMenuRow label="Change Avatar" icon={settingsIcons['Change Avatar']} onClick={() => setSheet('Change Avatar')} /></div>
    {groups.map(group => <section key={group.title} className="mt-6"><h2 className="mb-3 font-display text-[19px] font-bold">{group.title}</h2><div className={`divide-y divide-line/60 ${profileCardClasses}`}>{group.items.map(label => <ProfileMenuRow key={label} label={label} icon={settingsIcons[label]} onClick={() => setSheet(label)} />)}</div></section>)}
    <button type="button" disabled={action.pending} onClick={() => void action.run(signOut, () => navigate('/', { replace: true }))} className={`mt-6 flex min-h-[54px] w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-[#FDE6DF] px-5 py-3 text-[15px] font-semibold text-[#934A36] hover:bg-[#FBD9CE] disabled:cursor-wait disabled:opacity-50 ${focusClasses}`}>
      <UiIcon src={logout} />{action.pending ? 'Logging out…' : 'Log Out'}
    </button>
    <SaveFeedback error={action.error} saved={false} />
    <BottomSheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet ?? 'Settings'}>
      <div className="overflow-y-auto px-6 pb-8">{sheet === 'Change Avatar' && <div aria-hidden="true" data-asset-slot="avatar-upload" className="mx-auto mb-6 size-28 rounded-full border border-dashed border-line bg-cream/50">{/* TODO(asset): Add avatar artwork when supplied; upload support is not connected. */}</div>}<p className="text-[15px] leading-7">{sheet && settingsInfo[sheet]}</p></div>
    </BottomSheet>
  </section>
}
