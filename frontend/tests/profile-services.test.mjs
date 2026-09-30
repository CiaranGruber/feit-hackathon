import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getProfile, updateProfileDetails, updateProfileInterests, updatePersonalisation } from '../src/services/profile-service.ts'
import { getHome } from '../src/services/home-service.ts'
import { demoRecords } from './discovery-records.ts'
import { updateQuestProgress } from '../src/data/quest-progress.ts'
import { saveDisplayProfile, readDisplayProfile, updateDisplayName } from '../src/data/display-profile.ts'
import { saveInterestDraft, readInterestDraft } from '../src/data/onboarding-draft.ts'
import { signOut } from '../src/services/auth-service.ts'

test('profile progress agrees with Home and completion records, independently of selected interests', async () => {
  assert.equal((await getProfile('profile-stats')).stats.completedQuests, 0)
  await updateQuestProgress('profile-stats', progress => { progress.records = structuredClone(demoRecords) })
  const before = await getProfile('profile-stats')
  const home = await getHome('profile-stats')
  assert.equal(before.stats.completedQuests, demoRecords.length)
  assert.equal(before.stats.activitiesTried, home.adventure.totalActivities)
  assert.equal(before.stats.categoriesExplored, home.adventure.categories.filter(category => category.count > 0).length)
  await updateProfileInterests('profile-stats', ['other'])
  assert.deepEqual((await getProfile('profile-stats')).stats, before.stats)
})

test('registration seeds interests; profile edits are isolated from other users and the questionnaire draft', async () => {
  saveInterestDraft(['sports', 'outdoors'])
  saveDisplayProfile({ isStub: true, user: { id: 'profile-onboarding', name: 'Jamie', email: null, interestIds: readInterestDraft() } })
  const initial = await getProfile('profile-onboarding')
  assert.equal(initial.profile.name, 'Jamie')
  assert.deepEqual([...initial.profile.interestIds].sort(), ['outdoors', 'sports'])
  const updated = await updateProfileInterests('profile-onboarding', ['social', 'other', 'social'])
  assert.deepEqual(updated.profile.interestIds, ['social', 'other'])
  assert.deepEqual([...readInterestDraft()].sort(), ['outdoors', 'sports'])
  assert.deepEqual((await getProfile('profile-independent')).profile.interestIds, [])
  updated.profile.interestIds.push('shopping')
  assert.deepEqual((await getProfile('profile-onboarding')).profile.interestIds, ['social', 'other'])
  saveDisplayProfile({ isStub: true, user: { id: 'profile-onboarding', name: 'Jamie', email: null, interestIds: ['learning'] } }, { replaceInterests: true })
  assert.deepEqual((await getProfile('profile-onboarding')).profile.interestIds, ['learning'])
  saveDisplayProfile({ isStub: true, user: { id: 'profile-onboarding', name: 'Jamie', email: null, interestIds: [] } })
  assert.deepEqual((await getProfile('profile-onboarding')).profile.interestIds, ['learning'])
})

test('invalid and aborted edits do not replace the last confirmed profile', async () => {
  await updateProfileInterests('profile-cancel', ['wellness'])
  await updatePersonalisation('profile-cancel', 'Keep this note.')
  const before = await getProfile('profile-cancel')
  await assert.rejects(updateProfileInterests('profile-cancel', []))
  await assert.rejects(updateProfileInterests('profile-cancel', ['not-a-category']))
  await assert.rejects(updatePersonalisation('profile-cancel', 'x'.repeat(501)))
  await assert.rejects(updateProfileDetails('profile-cancel', { name: ' ', handle: '', bio: '' }))
  await assert.rejects(updateProfileDetails('profile-cancel', { name: 'Alex', handle: 'invalid name', bio: '' }))
  const controller = new AbortController()
  const requests = [
    updateProfileInterests('profile-cancel', ['shopping'], controller.signal),
    updatePersonalisation('profile-cancel', 'Cancelled note.', controller.signal),
    getProfile('profile-cancel', controller.signal),
  ]
  controller.abort()
  for (const request of requests) await assert.rejects(request, { name: 'AbortError' })
  assert.deepEqual(await getProfile('profile-cancel'), before)
  assert.equal((await updatePersonalisation('profile-cancel', '')).profile.personalisation, '')
})

test('failed browser storage uses the latest edits and logout clears only the active display identity', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
  const storage = new Map()
  let failWrites = false
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => { if (failWrites) throw new Error('Storage unavailable'); storage.set(key, value) },
    removeItem: key => storage.delete(key),
  } })
  try {
    saveDisplayProfile({ isStub: true, user: { id: 'profile-storage', name: 'Alex', email: 'alex@example.test', interestIds: ['sports'] } })
    await updatePersonalisation('profile-storage', 'Original note.')
    failWrites = true
    await updatePersonalisation('profile-storage', 'Latest note.')
    const updated = await updateProfileDetails('profile-storage', { name: ' Jamie ', handle: '@jamie', bio: ' A new bio. ' })
    updateDisplayName(updated.profile.name)
    assert.equal(readDisplayProfile().name, 'Jamie')
    assert.equal((await getProfile('profile-storage')).profile.personalisation, 'Latest note.')
    assert.equal(updated.profile.handle, 'jamie')
    assert.equal(updated.profile.bio, 'A new bio.')
    assert.equal([...storage.values()].some(value => value.includes('alex@example.test') || value.includes('password')), false)
    await signOut()
    assert.equal(storage.has('nowidea.display-profile.v1'), false)
    assert.equal(readDisplayProfile().id, 'demo-carol')
    assert.equal((await getProfile('profile-storage')).profile.personalisation, 'Latest note.')
  } finally {
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original)
    else delete globalThis.sessionStorage
  }
})
