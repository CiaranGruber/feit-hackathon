export const focusClasses = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-dark'

export const primaryActionClasses = `flex min-h-[58px] w-full cursor-pointer items-center justify-center gap-4 rounded-full border border-[#F8C867] bg-linear-to-b from-[#FFD16E] to-[#F6AB30] px-5 py-3 text-[18px] font-bold text-ink shadow-[0_3px_8px_#e9903214,inset_0_1px_1px_#ffffff80] transition-[filter,transform,box-shadow] enabled:hover:brightness-[1.03] enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none ${focusClasses}`

export const pageClasses = 'flex flex-1 flex-col px-6 pt-[max(20px,env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))]'

export const headingClasses = 'm-0 font-display text-[28px] leading-[1.3] font-bold tracking-[-0.8px] text-ink'

export const noticeClasses = 'mt-5 rounded-[12px] border border-line bg-cream px-4 py-3 text-center text-[14px] leading-5 text-ink'
