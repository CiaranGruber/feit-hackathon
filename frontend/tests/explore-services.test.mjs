import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { test } from 'node:test'
import { activityCategories, activityTypes, filterCatalog } from '../src/data/catalog.ts'
import { demoQuests } from '../src/data/discovery-fixtures.ts'
import { demoRecords } from './discovery-records.ts'
import { updateQuestProgress } from '../src/data/quest-progress.ts'
import { getCatalog, getActivityDetail, getActivityRecords, getActivityBookmarks, setActivityBookmarked } from '../src/services/explore-service.ts'
import { getHome, setQuestBookmarked } from '../src/services/home-service.ts'

test('reviewed catalog covers exactly the available category and activity icons', () => {
  assert.equal(activityCategories.length, 8)
  assert.equal(activityTypes.length, 124)
  assert.equal(new Set(activityTypes.map(activity => activity.id)).size, 124)
  for (const category of activityCategories) {
    const folder = category.id === 'outdoors' ? 'outdoor' : category.id
    const files = readdirSync(new URL(`../src/assets/catalog-icons-reviewed/${folder}/`, import.meta.url))
      .filter(file => file.endsWith('.png') && file !== `${folder}.png`).map(file => file.slice(0, -4)).sort()
    assert.deepEqual(activityTypes.filter(activity => activity.categoryId === category.id).map(activity => activity.slug).sort(), files)
  }
  assert.equal(activityTypes.find(activity => activity.slug === 'hiking').categoryId, 'outdoors')
  assert.equal(activityTypes.find(activity => activity.slug === 'cycling').categoryId, 'outdoors')
  assert.equal(activityTypes.find(activity => activity.slug === 'bookstore').categoryId, 'arts-culture')
})

test('search matches category names and accented names without fabricating results', () => {
  assert.deepEqual(filterCatalog(activityTypes, 'cafe').map(activity => activity.id), ['food-drink/cafe-hopping'])
  assert.equal(filterCatalog(activityTypes, '  CAFÉ ').length, 1)
  assert.equal(filterCatalog(activityTypes, 'sports').length, 17) // 16 Sports activities + Social / Sports groups.
  assert.equal(filterCatalog(activityTypes, 'outdoor hiking')[0].id, 'outdoors/hiking')
  assert.equal(filterCatalog(activityTypes, 'no-such-activity').length, 0)
  assert.equal(filterCatalog(activityTypes, '  ').length, 124)
})

test('quest and completion references resolve to the same activity type', () => {
  for (const quest of demoQuests) {
    const parent = activityTypes.find(activity => activity.id === quest.activityTypeId)
    assert.ok(parent)
    assert.equal(parent.categoryId, quest.categoryId)
  }
  for (const record of demoRecords) {
    assert.equal(demoQuests.find(quest => quest.id === record.questId)?.activityTypeId, record.activityTypeId)
    assert.ok(record.activityRating >= 1 && record.activityRating <= 5)
    assert.ok(record.venueRating >= 1 && record.venueRating <= 5)
  }
})

test('catalog, details, records, memories and Home progress agree', async () => {
  await updateQuestProgress('records-test', progress => { progress.records = structuredClone(demoRecords) })
  const [catalog, details, history, home] = await Promise.all([
    getCatalog('records-test'), getActivityDetail('records-test', 'sports/ice-skating'),
    getActivityRecords('records-test', 'sports/ice-skating'), getHome('records-test'),
  ])
  assert.equal(catalog.categories.find(category => category.id === 'outdoors').activityCount, 12)
  assert.equal(catalog.categories.find(category => category.id === 'sports').activityCount, 16)
  assert.equal(details.activity.completedQuestCount, 2)
  assert.equal(history.records.length, 2)
  assert.equal(history.records.flatMap(record => record.photos).length, 3)
  assert.equal(home.adventure.totalActivities, catalog.activities.filter(activity => activity.completedQuestCount > 0).length)
  assert.ok(history.records[0].completedOn > history.records[1].completedOn)
  history.records[0].photos[0].caption = 'Changed by a consumer'
  assert.notEqual((await getActivityRecords('records-test', 'sports/ice-skating')).records[0].photos[0].caption, 'Changed by a consumer')
  const empty = await getActivityRecords('records-test', 'sports/tennis')
  assert.equal(empty.records.length, 0)
  assert.equal(empty.activity.completedQuestCount, 0)
  await assert.rejects(getActivityDetail('records-test', 'sports/unknown'), /could not be found/)
})

test('activity saves are idempotent, user-scoped, and independent of quest saves and completions', async () => {
  const user = 'activity-saves-test'
  const before = await getHome(user)
  await setActivityBookmarked(user, 'sports/ice-skating', true)
  await setActivityBookmarked(user, 'sports/ice-skating', true)
  assert.deepEqual((await getActivityBookmarks(user)).activityIds, ['sports/ice-skating'])
  assert.deepEqual((await getActivityBookmarks('other-user')).activityIds, [])
  assert.deepEqual((await getHome(user)).bookmarkedQuests, before.bookmarkedQuests)
  await setQuestBookmarked(user, 'ice-skating-beginner', true)
  await setActivityBookmarked(user, 'sports/ice-skating', false)
  assert.deepEqual((await getActivityBookmarks(user)).activityIds, [])
  assert.ok((await getHome(user)).bookmarkedQuests.some(quest => quest.id === 'ice-skating-beginner'))
  assert.equal((await getActivityDetail(user, 'sports/ice-skating')).activity.completedQuestCount, 0)
  assert.deepEqual((await getActivityRecords(user, 'sports/ice-skating')).records, [])
  assert.equal((await getHome(user)).adventure.totalActivities, 0)
  await assert.rejects(setActivityBookmarked(user, 'sports/unknown', true), /could not be found/)
})

test('catalog and record requests respect cancellation', async () => {
  for (const request of [signal => getCatalog('cancelled-user', signal), signal => getActivityRecords('cancelled-user', 'sports/ice-skating', signal)]) {
    const controller = new AbortController()
    const pending = request(controller.signal)
    controller.abort()
    await assert.rejects(pending, { name: 'AbortError' })
  }
})
