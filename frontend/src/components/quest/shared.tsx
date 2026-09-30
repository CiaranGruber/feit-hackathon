import { Link } from 'react-router-dom'
import { ArrowRight } from '../onboarding/arrow-right.tsx'
import { focusClasses } from '../onboarding/styles.ts'
import type { QuestOption } from '../../types/quest.ts'

export const questPageClasses = 'px-5 pt-[max(16px,env(safe-area-inset-top))] pb-7'
export const questInputClasses = 'mt-2 w-full min-w-0 rounded-xl border border-line bg-canvas px-3 py-3 text-[16px] outline-none focus:border-primary-dark focus:ring-2 focus:ring-primary/20 disabled:opacity-60'
export const secondaryActionClasses = `flex min-h-[54px] cursor-pointer items-center justify-center gap-2 rounded-full border border-line bg-canvas px-5 py-3 text-[15px] font-semibold hover:bg-cream disabled:cursor-wait disabled:opacity-50 ${focusClasses}`

export function QuestHeader({ title, backTo }: { title: string; backTo: string }) {
  return <header className="mb-5 grid min-h-11 grid-cols-[44px_1fr_44px] items-center gap-1"><Link to={backTo} aria-label="Back to quest" className={`flex size-11 items-center justify-center rounded-full hover:bg-cream ${focusClasses}`}><span className="rotate-180"><ArrowRight /></span></Link><h1 className="text-center font-display text-[21px] leading-7 font-bold">{title}</h1></header>
}

export function OptionContent({ option }: { option: QuestOption }) {
  return <>
    <div aria-hidden="true" className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-[#F8EEDB]">
      {/* TODO(asset): Supply this venue/resource thumbnail; do not substitute category artwork. */}
      {option.imageUrl && <img src={option.imageUrl} alt="" className="size-full object-cover" />}
    </div>
    <div className="min-w-0 flex-1"><p className="font-display text-[15px] leading-5 font-bold">{option.title}</p><p className="mt-1 text-[11px] leading-4 text-muted">{option.location}</p><p className="mt-2 w-fit rounded-full bg-cream px-2 py-1 text-[10px] leading-4">{option.booking}</p></div>
  </>
}
