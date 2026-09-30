/** Simulate latency so the preview exercises loading and cancellation states. */
export function waitForStub(signal?: AbortSignal, milliseconds = 500): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Request cancelled.', 'AbortError'))
      return
    }
    const cancel = () => {
      clearTimeout(timer)
      reject(new DOMException('Request cancelled.', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', cancel)
      resolve()
    }, milliseconds)
    signal?.addEventListener('abort', cancel, { once: true })
  })
}

const simulatedFailures = new Set<string>()

/**
 * Development-only failure preview: append ?stubError=chat, home, or bookmark.
 * Each selected operation fails once per page load; retry then succeeds.
 * TODO(backend): Remove this simulation when services use real API errors.
 */
export function checkStubFailure(operation: 'chat' | 'home' | 'bookmark' | 'catalog' | 'activity' | 'records' | 'activity-bookmark' | 'sign-in' | 'profile' | 'profile-save' | 'interests-save' | 'personalisation-save' | 'sign-out' | 'quest' | 'quest-start' | 'quest-draft' | 'quest-complete') {
  if (import.meta.env?.DEV && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('stubError') === operation
    && !simulatedFailures.has(operation)) {
    simulatedFailures.add(operation)
    throw new Error('Something went wrong. Please try again.')
  }
}
