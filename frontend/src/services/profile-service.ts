import { readActivityRecords } from '../data/quest-progress.ts'
import { interestCategories, validInterestIds } from '../data/interest-categories.ts'
import { readProfilePreview, writeProfilePreview } from '../data/profile-preview.ts'
import { readDisplayProfile } from '../data/display-profile.ts'
import { checkStubFailure, waitForStub } from './stub-utils.ts'
import type { CategoryId } from '../types/discovery.ts'
import type { ProfileDetailsInput, ProfileResult, ProfileUpdateResult } from '../types/profile.ts'

function currentProfile(userId: string) {
  const display = readDisplayProfile()
  return readProfilePreview(userId, display.id === userId ? display.name : 'Carol')
}

/**
 * TODO(backend): Fetch the user's profile and progress through callApi.
 * IDs are preview partition keys, not proof of identity. Progress comes from the
 * same user completion records as Home and Explore, not from chosen interests.
 */
export async function getProfile(userId: string, signal?: AbortSignal): Promise<ProfileResult> {
  await waitForStub(signal)
  checkStubFailure('profile')
  const records = await readActivityRecords(userId, signal)
  const categories = interestCategories.filter(category => category.id !== 'other').map(category => ({
    id: category.id as CategoryId,
    count: new Set(records.filter(record => record.activityTypeId.startsWith(`${category.id}/`)).map(record => record.activityTypeId)).size,
  }))
  return {
    profile: currentProfile(userId),
    stats: {
      completedQuests: records.length,
      activitiesTried: new Set(records.map(record => record.activityTypeId)).size,
      categoriesExplored: categories.filter(category => category.count > 0).length,
      categories,
    },
    isStub: true,
  }
}

/** TODO(backend): Persist these display fields and return the confirmed profile. */
export async function updateProfileDetails(userId: string, input: ProfileDetailsInput, signal?: AbortSignal): Promise<ProfileUpdateResult> {
  const name = input.name.trim()
  const handle = input.handle.trim().replace(/^@/, '')
  if (!name || name.length > 100) throw new Error('Enter a name of 1–100 characters.')
  if (handle && !/^[A-Za-z0-9_]{1,30}$/.test(handle)) throw new Error('Use up to 30 letters, numbers or underscores for your username.')
  if (input.bio.length > 160) throw new Error('Keep your bio to 160 characters or fewer.')
  await waitForStub(signal)
  checkStubFailure('profile-save')
  return { profile: writeProfilePreview({ ...currentProfile(userId), name, handle, bio: input.bio.trim() }), isStub: true }
}

/**
 * TODO(backend): Save the complete set of category IDs, including Other if supported.
 * No activity subcategories are submitted. Only a successful save updates the
 * preview profile; failed or cancelled requests preserve the last saved values.
 */
export async function updateProfileInterests(userId: string, interestIds: readonly string[], signal?: AbortSignal): Promise<ProfileUpdateResult> {
  const selected = validInterestIds(interestIds)
  if (!selected.length || interestIds.some(id => !selected.includes(id))) throw new Error('Choose at least one of the available categories.')
  await waitForStub(signal)
  checkStubFailure('interests-save')
  return { profile: writeProfilePreview({ ...currentProfile(userId), interestIds: selected }), isStub: true }
}

/**
 * TODO(backend): Save the optional free-text preference note (maximum 500 characters).
 * This stub does not call AI or infer traits. An empty string clears the note.
 */
export async function updatePersonalisation(userId: string, text: string, signal?: AbortSignal): Promise<ProfileUpdateResult> {
  if (text.length > 500) throw new Error('Keep your note to 500 characters or fewer.')
  await waitForStub(signal)
  checkStubFailure('personalisation-save')
  return { profile: writeProfilePreview({ ...currentProfile(userId), personalisation: text.trim() }), isStub: true }
}
