import { useState } from 'react'
import { Link } from 'react-router-dom'
import heart from '../assets/feature-heart_1.svg'
import sparkle from '../assets/feature-sparkle_1.svg'
import flag from '../assets/flag_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg'
import settings from '../assets/settings.svg'
import { UiIcon } from '../components/ui-icon.tsx'
import leaves from '../assets/feature-leaves_1.png'
import star from '../assets/star_1.png'
import { useProfile } from '../hooks/use-profile.ts'
import { ProfileLoading, ProfileMenuRow, profileCardClasses } from '../components/profile/shared.tsx'
import { focusClasses } from '../components/onboarding/styles.ts'
import { ArrowRight } from '../components/onboarding/arrow-right.tsx'
import { categoryArt } from '../components/home/category-art.ts'
import { BottomSheet } from '../components/home/bottom-sheet.tsx'
import { AdventureSummary } from '../components/home/adventure-summary.tsx'

export function Profile() {
  const resource = useProfile()
  const [journeyOpen, setJourneyOpen] = useState(false)
  if (!resource.data) return <ProfileLoading {...resource} />
  const { profile, stats } = resource.data
  const explored = stats.categories.filter(category => category.count > 0)
  const counters = [
    { label: 'Quests completed', value: stats.completedQuests, icon: flag },
    { label: 'Activities tried', value: stats.activitiesTried, icon: leaves },
    { label: 'Categories explored', value: stats.categoriesExplored, icon: star },
  ]

  return <section className="pb-6">
    <title>Profile · nowIdea</title>
    <header className="relative bg-linear-to-b from-cream to-canvas px-6 pt-[max(20px,env(safe-area-inset-top))] pb-5 text-center">
      {/* TODO(asset): Add the illustrated profile banner and the user's avatar. */}
      <div className="absolute top-4 right-4"><Link to="/profile/settings" aria-label="Open settings" className={`flex size-11 items-center justify-center rounded-full hover:bg-cream ${focusClasses}`}><UiIcon src={settings} /></Link></div>
      <div className="relative mx-auto mt-5 mb-4 w-28">
        <div aria-hidden="true" data-asset-slot="profile-avatar" className="size-28 rounded-full border border-line/60 bg-cream/70" />
        <Link to="/profile/edit" aria-label="Edit profile" className={`absolute -right-5 -bottom-1 flex min-h-11 items-center rounded-full border border-line bg-canvas px-4 text-[12px] font-semibold shadow-sm ${focusClasses}`}>Edit</Link>
      </div>
      <h1 className="font-display text-[27px] leading-9 font-bold [overflow-wrap:anywhere]">{profile.name}</h1>
      {profile.handle && <p className="mt-1 text-[13px] text-muted [overflow-wrap:anywhere]">@{profile.handle}</p>}
      {profile.bio && <p className="mx-auto mt-3 max-w-[300px] text-[13px] leading-5 text-ink/75 [overflow-wrap:anywhere]">{profile.bio}</p>}
    </header>

    <div className="space-y-4 px-5">
      <dl className={`grid grid-cols-3 divide-x divide-line/70 py-4 ${profileCardClasses}`}>
        {counters.map(counter => <div key={counter.label} className="flex flex-col items-center px-2 text-center">
          <img src={counter.icon} alt="" className="size-6 object-contain" />
          <dt className="order-2 mt-1 max-w-[75px] text-[11px] leading-4 text-ink/80">{counter.label}</dt>
          <dd className="mt-1 font-display text-[25px] leading-8 font-bold tabular-nums">{counter.value}</dd>
        </div>)}
      </dl>

      <section className={`p-4 ${profileCardClasses}`}>
        <button type="button" onClick={() => setJourneyOpen(true)} aria-haspopup="dialog" className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-lg text-left font-display text-[18px] font-bold ${focusClasses}`}>Your discovery journey<ArrowRight /></button>
        <div className="relative mt-2 min-h-[106px] rounded-2xl bg-cream/50 p-3 pr-[90px]">
          <p className="text-[13px] leading-5">You’ve explored {stats.activitiesTried} {stats.activitiesTried === 1 ? 'activity' : 'activities'} across {stats.categoriesExplored} {stats.categoriesExplored === 1 ? 'category' : 'categories'}.<br />Keep going, there’s more to discover!</p>
          {/* TODO(asset): Add the companion reading a map illustration. */}
          <div aria-hidden="true" data-asset-slot="discovery-journey-art" className="absolute right-0 bottom-0 h-28 w-[86px]" />
        </div>
        <h2 className="mt-5 font-display text-[17px] font-bold">Categories you’ve tried</h2>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {explored.map(category => <Link key={category.id} to={`/explore/${category.id}`} state={{ backTo: '/profile' }} className={`flex min-h-[86px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center text-[10px] leading-[14px] hover:bg-cream ${focusClasses}`} style={{ backgroundColor: `${categoryArt[category.id].color}18` }}>
            <img src={categoryArt[category.id].image} alt="" className="size-9 object-contain" />{categoryArt[category.id].label}
          </Link>)}
        </div>
      </section>

      <nav aria-label="Profile options" className={`divide-y divide-line/60 ${profileCardClasses}`}>
        <ProfileMenuRow label="My Interests" to="/profile/interests" icon={heart} />
        <ProfileMenuRow label="Personalisation" to="/profile/personalisation" icon={sparkle} />
        <ProfileMenuRow label="Settings" to="/profile/settings" icon={settings} />
      </nav>
      <p className="text-center text-[11px] text-muted">Preview · progress saved in this browser</p>
    </div>
    <BottomSheet open={journeyOpen} onClose={() => setJourneyOpen(false)} title="Your discovery journey">
      <div className="overflow-y-auto px-5 pb-6"><p className="mb-5 text-[14px] leading-6">{stats.completedQuests} quests completed · {stats.activitiesTried} activities tried · {stats.categoriesExplored} categories explored</p><AdventureSummary adventure={{ totalActivities: stats.activitiesTried, categories: stats.categories.map(category => ({ ...category, label: categoryArt[category.id].label })) }} /><p className="mt-4 text-[12px] text-muted">Preview · based on example completed quests</p></div>
    </BottomSheet>
  </section>
}
