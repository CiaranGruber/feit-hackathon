import { activityCategories, activityTypes } from '../data/catalog.ts'
import { demoQuests } from '../data/discovery-fixtures.ts'
import { readActivityRecords } from '../data/quest-progress.ts'
import type { ActivityCategory, ActivityRecord, ActivitySummary, Quest } from '../types/discovery.ts'
import { checkStubFailure, waitForStub } from './stub-utils.ts'

export type CatalogResult = {
  categories: (ActivityCategory & { activityCount: number })[]
  activities: ActivitySummary[]
  isStub: boolean
}
export type ActivityDetailResult = { activity: ActivitySummary; quests: Quest[]; isStub: boolean }
export type ActivityRecordsResult = { activity: ActivitySummary; records: ActivityRecord[]; isStub: boolean }
export type ActivityBookmarksResult = { activityIds: string[]; isStub: boolean }
export type ActivityBookmarkResult = { activityId: string; bookmarked: boolean; isStub: boolean }

const bookmarksByUser = new Map<string, Set<string>>()
function bookmarksFor(userId: string) {
  let ids = bookmarksByUser.get(userId)
  if (!ids) { ids = new Set(); bookmarksByUser.set(userId, ids) }
  return ids
}
function summarize(activityId: string, records: ActivityRecord[]): ActivitySummary {
  const activity = activityTypes.find(item => item.id === activityId)
  if (!activity) throw new Error('This activity could not be found.')
  return { ...activity, completedQuestCount: records.filter(record => record.activityTypeId === activityId).length }
}

/**
 * TODO(backend): Replace local fixtures with callApi and validate/map each result.
 * Preserve category IDs, activity IDs, and quest IDs as distinct fields.
 * userId scopes preview bookmarks and records; it is never proof of authentication.
 * Counts reflect the same user records shown in the records screen.
 */
export async function getCatalog(userId: string, signal?: AbortSignal): Promise<CatalogResult> {
  await waitForStub(signal)
  checkStubFailure('catalog')
  const records = await readActivityRecords(userId, signal)
  return {
    categories: activityCategories.map(category => ({ ...category, activityCount: activityTypes.filter(activity => activity.categoryId === category.id).length })),
    activities: activityTypes.map(activity => summarize(activity.id, records)),
    isStub: true,
  }
}

/** TODO(backend): Request one activity type and its related quests using callApi. */
export async function getActivityDetail(userId: string, activityId: string, signal?: AbortSignal): Promise<ActivityDetailResult> {
  await waitForStub(signal)
  checkStubFailure('activity')
  const quests = demoQuests.filter(quest => quest.activityTypeId === activityId)
  // Show the two illustrated skating examples before the general Home idea.
  quests.sort((a, b) => Number(a.id === 'ice-skating') - Number(b.id === 'ice-skating'))
  return { activity: summarize(activityId, await readActivityRecords(userId, signal)), quests: quests.map(quest => ({ ...quest })), isStub: true }
}

/**
 * TODO(backend): Fetch completed records for this activity and authenticated user.
 * Memories are photos belonging to these records, not a separate upload flow.
 * Return ISO date-only strings and nullable image URLs; do not invent images.
 */
export async function getActivityRecords(userId: string, activityId: string, signal?: AbortSignal): Promise<ActivityRecordsResult> {
  await waitForStub(signal)
  checkStubFailure('records')
  const records = await readActivityRecords(userId, signal)
  return {
    activity: summarize(activityId, records),
    records: records.filter(record => record.activityTypeId === activityId)
      .toSorted((a, b) => b.completedOn.localeCompare(a.completedOn))
      .map(record => ({ ...record, photos: record.photos.map(photo => ({ ...photo })) })),
    isStub: true,
  }
}

/** TODO(backend): Read saved activity IDs separately from saved quest IDs. */
export async function getActivityBookmarks(userId: string, signal?: AbortSignal): Promise<ActivityBookmarksResult> {
  await waitForStub(signal, 200)
  return { activityIds: [...bookmarksFor(userId)], isStub: true }
}

/**
 * Idempotently save one activity type. This never saves its child quests.
 * TODO(backend): Persist via callApi, return the confirmed state, and throw a
 * user-safe Error on failure. Preview saves are per-user and reset on reload.
 */
export async function setActivityBookmarked(userId: string, activityId: string, bookmarked: boolean): Promise<ActivityBookmarkResult> {
  await waitForStub(undefined, 300)
  checkStubFailure('activity-bookmark')
  summarize(activityId, [])
  const ids = bookmarksFor(userId)
  if (bookmarked) ids.add(activityId)
  else ids.delete(activityId)
  return { activityId, bookmarked, isStub: true }
}
