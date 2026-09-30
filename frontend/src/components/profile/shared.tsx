import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ArrowRight } from '../onboarding/arrow-right.tsx'
import { focusClasses, primaryActionClasses } from '../onboarding/styles.ts'

export const profilePageClasses = 'px-5 pt-[max(16px,env(safe-area-inset-top))] pb-7'
export const profileCardClasses = 'rounded-[20px] border border-line/65 bg-canvas shadow-[0_2px_8px_#47372f03]'
export const profileInputClasses = 'mt-2 w-full rounded-xl border border-line bg-canvas px-4 py-3 text-[16px] leading-6 outline-none focus:border-primary-dark focus:ring-2 focus:ring-primary/20 disabled:opacity-60'

export function ProfileHeader({ title, backTo = '/profile' }: { title: string; backTo?: string }) {
  return <header className="mb-5 grid min-h-11 grid-cols-[44px_1fr_44px] items-center gap-2">
    <Link to={backTo} aria-label={backTo === '/profile' ? 'Back to profile' : 'Back to settings'} className={`flex size-11 items-center justify-center rounded-full hover:bg-cream ${focusClasses}`}><span className="rotate-180"><ArrowRight /></span></Link>
    <h1 className="text-center font-display text-[21px] leading-7 font-bold">{title}</h1>
  </header>
}

export function ProfileLoading({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  return <section className={profilePageClasses}><ProfileHeader title="Your profile" />{loading
    ? <p role="status" className="py-16 text-center text-muted">Loading your profile…</p>
    : <div role="alert" className="py-10 text-center"><p className="mb-5">{error}</p><button type="button" onClick={retry} className={primaryActionClasses}>Try again</button></div>}</section>
}

export function SaveFeedback({ error, saved }: { error: string; saved: boolean }) {
  return <>
    {error && <p role="alert" className="mt-4 rounded-xl border border-error/20 bg-[#FFF1E9] px-4 py-3 text-[14px] text-error">{error}</p>}
    <p role="status" aria-live="polite" className="mt-3 min-h-5 text-center text-[13px] text-muted">{saved ? 'Changes saved.' : ''}</p>
  </>
}

export function ProfileMenuRow({ label, icon, to, onClick }: { label: string; icon: string; to?: string; onClick?: () => void }) {
  const content: ReactNode = <>
    <img src={icon} alt="" width="24" height="24" className="size-6 shrink-0 object-contain" />
    <span className="flex-1 text-left">{label}</span><span aria-hidden="true" className="shrink-0"><ArrowRight /></span>
  </>
  const classes = `flex min-h-[54px] w-full items-center gap-3 rounded-xl px-4 py-3 text-[14px] hover:bg-cream/60 ${focusClasses}`
  return to ? <Link to={to} className={classes}>{content}</Link> : <button type="button" onClick={onClick} className={`cursor-pointer ${classes}`}>{content}</button>
}
