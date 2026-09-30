import { validInterestIds } from './interest-categories.ts'
import type { ProfileDetails } from '../types/profile.ts'

const prefix = 'nowidea.profile-preview.v1:'
const memoryProfiles = new Map<string, ProfileDetails>()
const preferMemory = new Set<string>()
const clone = (profile: ProfileDetails): ProfileDetails => ({ ...profile, interestIds: [...profile.interestIds] })

function storedProfile(userId: string): ProfileDetails | null {
  if (!preferMemory.has(userId)) {
    try {
      const value = JSON.parse(sessionStorage.getItem(prefix + userId) ?? 'null')
      if (value && value.id === userId && typeof value.name === 'string' && typeof value.handle === 'string'
        && typeof value.bio === 'string' && typeof value.personalisation === 'string' && Array.isArray(value.interestIds)) {
        const profile: ProfileDetails = {
          id: userId, name: value.name, handle: value.handle, bio: value.bio,
          personalisation: value.personalisation, interestIds: validInterestIds(value.interestIds),
        }
        memoryProfiles.set(userId, profile)
        return clone(profile)
      }
    } catch { /* Keep local editing usable when storage is blocked or malformed. */ }
  }
  const profile = memoryProfiles.get(userId)
  return profile ? clone(profile) : null
}

export function readProfilePreview(userId: string, name = 'Carol'): ProfileDetails {
  return storedProfile(userId) ?? {
    id: userId, name, handle: userId === 'demo-carol' ? 'carolchan' : '',
    bio: 'Exploring new places, activities and ideas for a more colourful life.',
    interestIds: userId === 'demo-carol' ? ['outdoors', 'sports', 'food-drink', 'arts-culture', 'social'] : [],
    personalisation: '',
  }
}

// Preview preferences are scoped by user ID and tab, never authentication data.
export function writeProfilePreview(profile: ProfileDetails): ProfileDetails {
  const snapshot = clone(profile)
  memoryProfiles.set(profile.id, snapshot)
  try {
    sessionStorage.setItem(prefix + profile.id, JSON.stringify(snapshot))
    preferMemory.delete(profile.id)
  } catch {
    preferMemory.add(profile.id)
  }
  return clone(snapshot)
}

export function seedProfilePreview(user: { id: string; name: string; interestIds: readonly string[] }, replaceInterests = false) {
  const existing = storedProfile(user.id)
  // Registration applies its questionnaire choices; returning sign-in preserves edits.
  writeProfilePreview({
    ...(existing ?? readProfilePreview(user.id, user.name)), name: user.name,
    interestIds: !replaceInterests && existing ? existing.interestIds : validInterestIds(user.interestIds),
  })
}
