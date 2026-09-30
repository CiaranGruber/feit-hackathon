import { useCallback, useEffect, useRef, useState } from 'react'
import { useHome } from '../components/home/home-context.ts'
import { getProfile } from '../services/profile-service.ts'
import { useAsyncResource } from './use-async-resource.ts'

export function useProfile() {
  const { profile } = useHome()
  const request = useCallback((signal: AbortSignal) => getProfile(profile.id, signal), [profile.id])
  return useAsyncResource(request)
}

export function useProfileSave() {
  const controller = useRef<AbortController | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  useEffect(() => () => controller.current?.abort(), [])

  async function run<T>(request: (signal: AbortSignal) => Promise<T>, onSuccess: (result: T) => void) {
    if (controller.current) return
    const active = new AbortController()
    controller.current = active
    setPending(true)
    setError('')
    setSaved(false)
    try {
      const result = await request(active.signal)
      if (!active.signal.aborted) { onSuccess(result); setSaved(true) }
    } catch (error) {
      if (!active.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to save. Please try again.')
    } finally {
      if (!active.signal.aborted) setPending(false)
      if (controller.current === active) controller.current = null
    }
  }

  return { pending, error, saved, run, clear: () => { setSaved(false); setError('') } }
}
