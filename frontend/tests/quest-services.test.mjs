import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getQuestDetail, startQuest, getQuestAttempt, saveQuestDraft, completeQuest, getQuestCompletion, localDate, validateQuestStep } from '../src/services/quest-service.ts'
import { getHome } from '../src/services/home-service.ts'
import { getProfile } from '../src/services/profile-service.ts'
import { getCatalog, getActivityDetail, getActivityRecords } from '../src/services/explore-service.ts'

const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII='
const filled = attempt => ({ ...attempt.draft, optionId: 'manual', manualVenue: 'My community class', completedOn: localDate(), startTime: '10:00', endTime: '11:30', notes: 'Tried something new.', photos: [{ id: 'test-photo', imageUrl: pixel, caption: 'Before' }], photoComment: 'A happy memory.', activityRating: 5, venueRating: 4, recommendation: 5, expectations: 4, likedMost: 'Learning with a friend.', tips: 'Bring a notebook.' })

test('start is resumable and draft changes never count as completions', async () => {
  const user = 'quest-drafts'
  const before = await getProfile(user)
  const [first, second] = await Promise.all([startQuest(user, 'language-session'), startQuest(user, 'language-session')])
  assert.equal(first.attempt.id, second.attempt.id)
  const input = filled(first.attempt)
  const saved = await saveQuestDraft(user, 'language-session', first.attempt.id, input, 3)
  input.notes = 'Mutated after saving'
  saved.draft.photos[0].caption = 'Mutated result'
  const resumed = await getQuestAttempt(user, 'language-session', first.attempt.id)
  assert.equal(resumed.attempt.step, 3)
  assert.equal(resumed.attempt.draft.notes, 'Tried something new.')
  assert.equal(resumed.attempt.draft.photos[0].caption, 'Before')
  assert.deepEqual((await getProfile(user)).stats, before.stats)
  await assert.rejects(getQuestAttempt('different-user', 'language-session', first.attempt.id), /could not be found/)
  await assert.rejects(getQuestDetail(user, 'missing-quest'), /could not be found/)
})

test('completion atomically updates records, all statistics and memories; retries are idempotent', async () => {
  const user = 'quest-completion'
  const before = await getProfile(user)
  const { attempt } = await startQuest(user, 'language-session')
  const input = filled(attempt)
  const [first, retry] = await Promise.all([completeQuest(user, 'language-session', attempt.id, input), completeQuest(user, 'language-session', attempt.id, input)])
  assert.equal(first.record.id, retry.record.id)
  const [profile, home, catalog, detail, history, completed] = await Promise.all([
    getProfile(user), getHome(user), getCatalog(user), getActivityDetail(user, 'learning/languages'),
    getActivityRecords(user, 'learning/languages'), getQuestCompletion(user, 'language-session', first.record.id),
  ])
  assert.equal(profile.stats.completedQuests, before.stats.completedQuests + 1)
  assert.equal(profile.stats.activitiesTried, before.stats.activitiesTried + 1)
  assert.equal(profile.stats.categoriesExplored, before.stats.categoriesExplored + 1)
  assert.equal(home.adventure.totalActivities, profile.stats.activitiesTried)
  assert.equal(home.adventure.categories.reduce((sum, item) => sum + item.count, 0), home.adventure.totalActivities)
  assert.equal(catalog.activities.find(item => item.id === 'learning/languages').completedQuestCount, 1)
  assert.equal(detail.activity.completedQuestCount, 1)
  assert.equal(history.records.length, 1)
  assert.equal(history.records[0].duration, '90 min')
  assert.equal(history.records[0].photos[0].imageUrl, pixel)
  assert.equal(history.records[0].photos[0].caption, input.photoComment)
  assert.equal(completed.record.tips, input.tips)
  assert.equal((await getQuestAttempt(user, 'language-session', attempt.id)).attempt.status, 'completed')
  assert.equal((await getActivityRecords('unrelated-user', 'learning/languages')).records.length, 0)
  await assert.rejects(getQuestCompletion('unrelated-user', 'language-session', first.record.id))
  await assert.rejects(saveQuestDraft(user, 'language-session', attempt.id, input, 3), /no longer editable/)
  const next = await startQuest(user, 'language-session')
  assert.notEqual(next.attempt.id, attempt.id)
  await completeQuest(user, 'language-session', next.attempt.id, { ...filled(next.attempt), photos: [] })
  const repeated = await getProfile(user)
  assert.equal(repeated.stats.completedQuests, before.stats.completedQuests + 2)
  assert.equal(repeated.stats.activitiesTried, profile.stats.activitiesTried)
  assert.equal(repeated.stats.categoriesExplored, profile.stats.categoriesExplored)
})

test('new shopping and wellness completions are included in Home category totals', async () => {
  const user = 'quest-categories'
  for (const questId of ['market-session', 'meditation-session']) {
    const { attempt } = await startQuest(user, questId)
    await completeQuest(user, questId, attempt.id, { ...filled(attempt), photos: [], startTime: '', endTime: '' })
  }
  const home = await getHome(user)
  assert.equal(home.adventure.categories.find(item => item.id === 'shopping').count, 1)
  assert.equal(home.adventure.categories.find(item => item.id === 'wellness').count, 1)
  assert.equal(home.adventure.categories.reduce((sum, item) => sum + item.count, 0), home.adventure.totalActivities)
})

test('invalid, aborted and cross-user submissions do not create records', async () => {
  const user = 'quest-validation'
  const { attempt } = await startQuest(user, 'ice-skating')
  const input = filled(attempt)
  const before = await getActivityRecords(user, 'sports/ice-skating')
  for (const change of [{ optionId: '' }, { manualVenue: ' ' }, { completedOn: '2026-02-30' }, { completedOn: '2999-01-01' }, { endTime: '09:00' }, { startTime: '' }, { activityRating: null }, { venueRating: 6 }, { recommendation: 1.5 }, { photos: [...input.photos, ...input.photos, ...input.photos, ...input.photos] }, { notes: 'x'.repeat(301) }]) {
    assert.notEqual(validateQuestStep('ice-skating', { ...input, ...change }, 3), '')
    await assert.rejects(completeQuest(user, 'ice-skating', attempt.id, { ...input, ...change }))
  }
  const controller = new AbortController()
  const pending = completeQuest(user, 'ice-skating', attempt.id, input, controller.signal)
  controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
  await assert.rejects(completeQuest('another-user', 'ice-skating', attempt.id, input), /Start this quest/)
  assert.deepEqual(await getActivityRecords(user, 'sports/ice-skating'), before)
})
