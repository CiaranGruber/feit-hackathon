import type { ActivityRecord } from '../types/discovery.ts'
import type { QuestAttempt } from '../types/quest.ts'

type Progress = { attempts: QuestAttempt[]; records: ActivityRecord[] }
const memory = new Map<string, Progress>()
let database: Promise<IDBDatabase> | undefined
const empty = (): Progress => ({ attempts: [], records: [] })

function openDatabase() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('nowidea-quest-preview-v1', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('progress')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => { database = undefined; reject(new Error('Your progress could not be opened. Please try again.')) }
    request.onblocked = () => { database = undefined; reject(new Error('Close other nowIdea tabs and try again.')) }
  })
  return database
}

function cancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Request cancelled.', 'AbortError')
}

// Local preview persistence only. IndexedDB keeps photos out of sessionStorage's
// small quota. User IDs partition data; they are not authentication credentials.
// Node service tests use the same transactions with an in-memory fallback.
async function transaction<T>(userId: string, mutate: boolean, work: (progress: Progress) => T, signal?: AbortSignal): Promise<T> {
  cancelled(signal)
  if (typeof indexedDB === 'undefined') {
    const progress = structuredClone(memory.get(userId) ?? empty())
    const result = work(progress)
    cancelled(signal)
    if (mutate) memory.set(userId, progress)
    return structuredClone(result)
  }
  const db = await openDatabase()
  cancelled(signal)
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction('progress', mutate ? 'readwrite' : 'readonly')
    const abort = () => tx.abort()
    signal?.addEventListener('abort', abort, { once: true })
    const store = tx.objectStore('progress')
    const request = store.get(userId)
    let result: T
    let failure: unknown
    request.onsuccess = () => {
      try {
        const progress: Progress = request.result ?? empty()
        result = work(progress)
        if (mutate) store.put(progress, userId)
      } catch (error) { failure = error; tx.abort() }
    }
    tx.oncomplete = () => { signal?.removeEventListener('abort', abort); resolve(structuredClone(result)) }
    tx.onabort = () => {
      signal?.removeEventListener('abort', abort)
      reject(failure ?? (signal?.aborted ? new DOMException('Request cancelled.', 'AbortError') : new Error('Your progress could not be saved. Free some browser storage or try again.')))
    }
    tx.onerror = () => { /* The abort handler reports storage failures without claiming a save. */ }
  })
}

export const readQuestProgress = (userId: string, signal?: AbortSignal) => transaction(userId, false, progress => progress, signal)
export const updateQuestProgress = <T,>(userId: string, work: (progress: Progress) => T, signal?: AbortSignal) => transaction(userId, true, work, signal)

export async function readActivityRecords(userId: string, signal?: AbortSignal): Promise<ActivityRecord[]> {
  const progress = await readQuestProgress(userId, signal)
  return progress.records
}
