import { useEffect, useState } from 'react'

// Callers memoize `request` with useCallback. A changed request immediately hides
// stale data, and AbortSignal prevents an older response replacing the new page.
export function useAsyncResource<T>(request: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ request: typeof request; data: T | null; error: string } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    request(controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ request, data, error: '' })
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ request, data: null, error: error instanceof Error ? error.message : 'Unable to load this page. Please try again.' })
    })
    return () => controller.abort()
  }, [request, attempt])

  const current = result?.request === request ? result : null
  return {
    data: current?.data ?? null,
    loading: current === null,
    error: current?.error ?? '',
    retry: () => { setResult(null); setAttempt(value => value + 1) },
  }
}
