import type { AuthResult } from '../services/auth-service.ts'
import { seedProfilePreview } from './profile-preview.ts'

export type DisplayProfile = { id: string; name: string; isStub: boolean }
const storageKey = 'nowidea.display-profile.v1'
let memoryProfile: DisplayProfile = { id: 'demo-carol', name: 'Carol', isStub: true }
let preferMemory = false

// This is display data only, never authentication or an authorization check.
// Keep email, passwords, provider credentials, and tokens out of this storage.
export function saveDisplayProfile(result: AuthResult, options?: { replaceInterests?: boolean }) {
  seedProfilePreview(result.user, options?.replaceInterests)
  memoryProfile = { id: result.user.id, name: result.user.name, isStub: result.isStub }
  persistDisplayProfile()
}

function persistDisplayProfile() {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(memoryProfile))
    preferMemory = false
  } catch {
    // A failed write must not make a stale stored profile override this one.
    preferMemory = true
  }
}

export function updateDisplayName(name: string): DisplayProfile {
  memoryProfile = { ...readDisplayProfile(), name }
  persistDisplayProfile()
  return { ...memoryProfile }
}

export function clearDisplayProfile() {
  memoryProfile = { id: 'demo-carol', name: 'Carol', isStub: true }
  try {
    sessionStorage.removeItem(storageKey)
    preferMemory = false
  } catch {
    preferMemory = true
  }
}

export function readDisplayProfile(): DisplayProfile {
  if (preferMemory) return { ...memoryProfile }
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null')
    if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string'
      && 'name' in value && typeof value.name === 'string' && 'isStub' in value && typeof value.isStub === 'boolean') {
      return { id: value.id, name: value.name, isStub: value.isStub }
    }
  } catch { /* Direct Home visits use the preview profile without requiring sign-in. */ }
  return { ...memoryProfile }
}
