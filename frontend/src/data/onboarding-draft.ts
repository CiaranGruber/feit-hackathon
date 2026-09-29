import { interestOptions } from './interests.ts'

const storageKey = 'onboarding.interests.v1'
let memoryDraft: string[] = []
let useMemoryDraft = false

function validInterestIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return interestOptions.filter(option => value.includes(option.id)).map(option => option.id)
}

/**
 * Read the local, pre-registration draft. This is not a backend service.
 * Only category IDs are stored; account details and passwords never belong here.
 */
export function readInterestDraft(): string[] {
  if (useMemoryDraft) return [...memoryDraft]
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '[]')
    memoryDraft = validInterestIds(saved)
  } catch {
    // Keep the current draft usable when storage is blocked or malformed.
  }
  return [...memoryDraft]
}

export function saveInterestDraft(interestIds: readonly string[]): void {
  memoryDraft = validInterestIds(interestIds)
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(memoryDraft))
  } catch {
    // Fall back to memory so registration can still receive the selected IDs.
    useMemoryDraft = true
  }
}
