import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { focusClasses } from '../onboarding/styles.ts'
import closeIcon from '../../assets/close_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg'

type BottomSheetProps = { open: boolean; onClose: () => void; title: string; children: ReactNode }

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    // Native modal behavior traps focus, makes the background inert, and restores
    // focus to the trigger on close. The backdrop stays inside the phone frame.
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
    return () => { if (dialog.open) dialog.close() }
  }, [open])

  function keepFocusInSheet(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, [tabindex]')]
      .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0)
    const first = controls[0]
    const last = controls.at(-1)
    // Keep keyboard cycling within the sheet, including browsers that otherwise
    // move focus to browser chrome at a native dialog's first/last control.
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return (
    <dialog ref={ref} aria-labelledby={titleId} onKeyDown={keepFocusInSheet} onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }} className="fixed inset-x-0 top-0 bottom-auto mx-auto my-0 h-svh max-h-none w-full max-w-[390px] flex-col justify-end border-0 bg-ink/40 p-0 text-ink backdrop:bg-transparent open:flex sm:top-8 sm:h-[844px] sm:max-h-[calc(100svh-64px)] sm:overflow-hidden sm:rounded-[32px]">
      <section className="relative flex h-[78%] max-h-[760px] min-h-0 flex-col rounded-t-[28px] border-t border-line/80 bg-canvas shadow-[0_-12px_32px_#47372f0a]">
        <div aria-hidden="true" className="mx-auto mt-3 h-1 w-8 shrink-0 rounded-full bg-line" />
        <header className="flex shrink-0 items-center gap-3 px-5 py-4">
          <button autoFocus type="button" aria-label="Close" onClick={onClose} className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-cream hover:text-ink ${focusClasses}`}><img src={closeIcon} alt="" width="24" height="24" /></button>
          <h2 id={titleId} className="flex-1 pr-11 text-center font-display text-[19px] leading-6 font-bold">{title}</h2>
        </header>
        {children}
      </section>
    </dialog>
  )
}
