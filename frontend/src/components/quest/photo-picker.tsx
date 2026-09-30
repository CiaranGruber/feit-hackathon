import { useEffect, useRef, useState } from 'react'
import imageIcon from '../../assets/image.svg'
import closeIcon from '../../assets/close_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg'
import { UiIcon } from '../ui-icon.tsx'
import { focusClasses } from '../onboarding/styles.ts'
import type { MemoryPhoto } from '../../types/discovery.ts'

function readPhoto(file: File, signal: AbortSignal): Promise<MemoryPhoto> {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024 || file.size === 0) {
      reject(new Error('Use JPG or PNG photos up to 10 MB each.')); return
    }
    const reader = new FileReader()
    const abort = () => { reader.abort(); reject(new DOMException('Photo reading cancelled.', 'AbortError')) }
    if (signal.aborted) { abort(); return }
    signal.addEventListener('abort', abort, { once: true })
    reader.onerror = () => { signal.removeEventListener('abort', abort); reject(new Error('This photo could not be read. Try another image.')) }
    reader.onload = async () => {
      try {
        const imageUrl = String(reader.result)
        const image = new Image()
        image.src = imageUrl
        await image.decode()
        if (signal.aborted) throw new DOMException('Photo reading cancelled.', 'AbortError')
        resolve({ id: crypto.randomUUID(), imageUrl, caption: file.name })
      } catch { reject(new Error('This photo could not be opened. Try another JPG or PNG.')) }
      finally { signal.removeEventListener('abort', abort) }
    }
    reader.readAsDataURL(file)
  })
}

export function PhotoPicker({ photos, onChange, onBusy }: { photos: MemoryPhoto[]; onChange: (photos: MemoryPhoto[]) => void; onBusy: (busy: boolean) => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  async function add(files: File[]) {
    if (!files.length || controller.current) return
    if (photos.length + files.length > 3) { setError('Choose up to three photos. Remove one before adding another.'); return }
    const active = new AbortController()
    controller.current = active
    setBusy(true); onBusy(true); setError('')
    try {
      const added = await Promise.all(files.map(file => readPhoto(file, active.signal)))
      if (!active.signal.aborted) onChange([...photos, ...added])
    } catch (error) { if (!active.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to read these photos.') }
    finally {
      controller.current = null
      if (!active.signal.aborted) { setBusy(false); onBusy(false) }
    }
  }
  return <div>
    <label className={`relative flex min-h-[164px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#D6C5B0] bg-cream/30 p-5 text-center has-focus-visible:outline-2 has-focus-visible:outline-primary-dark ${busy || photos.length === 3 ? 'opacity-50' : ''}`}>
      <UiIcon src={imageIcon} className="size-9 text-muted" /><span className="text-[14px] font-semibold">{busy ? 'Preparing photos…' : 'Tap to add a photo'}</span><span className="text-[11px] text-muted">JPG, PNG · up to 10 MB each · maximum 3</span>
      <input type="file" accept="image/jpeg,image/png" multiple aria-label="Add quest photos" disabled={busy || photos.length === 3} onChange={event => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ''; void add(files) }} className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
    </label>
    {photos.length > 0 && <ul className="mt-4 grid grid-cols-3 gap-2">{photos.map((photo, index) => <li key={photo.id} className="relative"><img src={photo.imageUrl!} alt={`Selected quest photo ${index + 1}`} className="aspect-square w-full rounded-xl object-cover" /><button type="button" disabled={busy} aria-label={`Remove photo ${index + 1}`} onClick={() => { onChange(photos.filter(item => item.id !== photo.id)); setError('') }} className={`absolute top-0 right-0 flex size-11 cursor-pointer items-center justify-center rounded-full ${focusClasses}`}><span className="flex size-7 items-center justify-center rounded-full bg-canvas/95"><UiIcon src={closeIcon} className="size-5" /></span></button></li>)}</ul>}
    {error && <p role="alert" className="mt-3 text-[13px] text-error">{error}</p>}
    <p className="mt-3 text-[12px] leading-5 text-muted">Photos are optional. Your preview photos stay in this browser.</p>
  </div>
}
