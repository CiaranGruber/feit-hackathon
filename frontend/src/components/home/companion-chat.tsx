import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import compass from '../../assets/compass-2.png'
import relaxing from '../../assets/relax-moon-stars-2.png'
import outdoors from '../../assets/catalog-icons-reviewed/outdoor/hiking.png'
import friends from '../../assets/catalog-icons-reviewed/social/social.png'
import dice from '../../assets/surprise-dice-2.png'
import sendIcon from '../../assets/arrow_circle_up_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg'
import { sendCompanionMessage, type ChatMessage } from '../../services/companion-service.ts'
import { focusClasses } from '../onboarding/styles.ts'
import { BottomSheet } from './bottom-sheet.tsx'
import { CompanionArt } from './companion-art.tsx'
import { useHome } from './home-context.ts'

const prompts = [
  { text: 'Give me an activity idea', image: compass },
  { text: 'Something relaxing', image: relaxing },
  { text: 'Outdoor activities near me', image: outdoors },
  { text: 'Ideas to do with friends', image: friends },
  { text: 'Surprise me!', image: dice },
]

export function CompanionChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useHome()
  const firstName = profile.name.trim().split(/\s+/)[0] || 'friend'
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const requestRef = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const inputId = useId()

  useEffect(() => () => requestRef.current?.abort(), [])
  useEffect(() => {
    if (open && messages.length) listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [open, messages, pending, error])

  async function requestReply(history: ChatMessage[]) {
    if (requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    setPending(true)
    setError('')
    try {
      const result = await sendCompanionMessage({ userId: profile.id, messages: history }, controller.signal)
      if (!controller.signal.aborted) setMessages([...history, result.message])
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Your companion couldn’t reply. Please try again.')
    } finally {
      if (!controller.signal.aborted) setPending(false)
      requestRef.current = null
    }
  }

  function sendMessage(content: string) {
    const trimmed = content.trim()
    if (!trimmed || trimmed.length > 1000 || requestRef.current || error) return
    const history: ChatMessage[] = [...messages, { id: crypto.randomUUID(), role: 'user', content: trimmed }]
    setMessages(history)
    setDraft('')
    void requestReply(history)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    sendMessage(draft)
  }

  function editFailedMessage() {
    const last = messages.at(-1)
    if (last?.role !== 'user') return
    setDraft(last.content)
    setMessages(messages.slice(0, -1))
    setError('')
    inputRef.current?.focus()
  }

  return <BottomSheet open={open} onClose={onClose} title="Chat with your companion">
    <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-5 [scrollbar-width:thin]">
      {messages.length === 0 ? <>
        <div className="relative mb-5 flex min-h-[126px] items-center">
          <div className="relative z-10 w-[66%] rounded-[28px] rounded-br-md bg-cream px-5 py-5 text-[15px] leading-[23px]">Hi {firstName}!<br />What are you in the mood for today?</div>
          <CompanionArt className="absolute -right-3 bottom-0 h-[140px] w-[140px]" />
        </div>
        <div className="mx-auto flex max-w-[290px] flex-col items-center gap-2.5">
          {prompts.map(prompt => <button type="button" key={prompt.text} onClick={() => sendMessage(prompt.text)} className={`flex min-h-[48px] w-full cursor-pointer items-center gap-3 rounded-full border border-line/70 bg-canvas px-4 py-2 text-left text-[13px] shadow-[0_3px_8px_#e990320c] hover:bg-cream ${focusClasses}`}>
            <img src={prompt.image} alt="" width="30" height="30" className="size-[30px] shrink-0 object-contain" />{prompt.text}
          </button>)}
        </div>
      </> : <>
        <div className="mb-4 flex items-center gap-3"><CompanionArt talking={pending} className="size-16 shrink-0" /><p className="text-[13px] text-muted">A little inspiration for your day.</p></div>
        <div role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions" className="space-y-3">
          {messages.map(message => <div key={message.id} className={`max-w-[90%] whitespace-pre-wrap rounded-[20px] px-4 py-3 text-[14px] leading-[22px] [overflow-wrap:anywhere] ${message.role === 'user' ? 'ml-auto rounded-br-sm bg-[#FFE2A6]' : 'mr-auto rounded-bl-sm border border-line/60 bg-cream/60'}`}>
            <span className="sr-only">{message.role === 'user' ? 'You: ' : 'Companion: '}</span>{message.content}
          </div>)}
        </div>
        {pending && <p role="status" className="mt-4 flex items-center gap-2 text-[13px] text-muted"><span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />Your companion is thinking…</p>}
        {error && <div role="alert" className="mt-4 rounded-2xl border border-error/20 bg-[#FFF1E9] px-4 py-3 text-[13px]">
          <p>{error}</p><div className="mt-2 flex flex-wrap gap-4"><button type="button" onClick={() => void requestReply(messages)} className={`min-h-11 cursor-pointer rounded-md font-bold underline underline-offset-4 ${focusClasses}`}>Try again</button><button type="button" onClick={editFailedMessage} className={`min-h-11 cursor-pointer rounded-md underline underline-offset-4 ${focusClasses}`}>Edit message</button></div>
        </div>}
        {!pending && !error && <button type="button" onClick={() => sendMessage('Another idea, please')} className={`mt-4 min-h-11 cursor-pointer rounded-full border border-line px-4 text-[13px] hover:bg-cream ${focusClasses}`}>Another idea, please</button>}
      </>}
    </div>
    <form onSubmit={submit} className="shrink-0 border-t border-line/70 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2">
        <label htmlFor={inputId} className="sr-only">Message your companion</label>
        <textarea ref={inputRef} id={inputId} value={draft} rows={1} maxLength={1000} placeholder="Ask me anything…" onChange={event => setDraft(event.target.value)} onKeyDown={event => {
          // Let IME users finish composing before interpreting Enter as send.
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
            event.preventDefault()
            sendMessage(draft)
          }
        }} className="min-h-[52px] flex-1 resize-none rounded-[26px] border border-line bg-transparent px-4 py-3 text-[16px] leading-6 outline-none placeholder:text-muted focus:border-primary-dark focus:ring-2 focus:ring-primary/20" />
        <button type="submit" aria-label="Send message" disabled={!draft.trim() || pending || Boolean(error)} className={`flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#FFDC94] text-[13px] font-bold enabled:hover:bg-primary disabled:cursor-not-allowed disabled:opacity-40 ${focusClasses}`}>
          <img src={sendIcon} alt="" width="30" height="30" className="size-[30px]" />
        </button>
      </div>
      <p className="mt-2 text-center text-[10px] tracking-wide text-muted">Demo conversation · ideas to inspire you</p>
    </form>
  </BottomSheet>
}
