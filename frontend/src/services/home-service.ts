import { checkStubFailure, waitForStub } from './stub-utils.ts'
import { demoQuests, homeQuestIds } from '../data/discovery-fixtures.ts'
import { readActivityRecords } from '../data/quest-progress.ts'
import type { CategoryId, Quest } from '../types/discovery.ts'
export type { CategoryId, QuestKind } from '../types/discovery.ts'

// Compatibility name for the existing Home card components: these render quests,
// not the ActivityType objects used by the Explore catalog.
export type Activity = Quest
export type AdventureCategory = { id: CategoryId; label: string; count: number }
export type HomeResult = {
  ideas: Activity[]
  bookmarkedQuests: Activity[]
  adventure: { totalActivities: number; categories: AdventureCategory[] }
  isStub: boolean
}
export type BookmarkResult = { questId: string; bookmarked: boolean; isStub: boolean }

const activities = demoQuests
const categories: AdventureCategory[] = [
  { id: 'sports', label: 'Sports', count: 5 },
  { id: 'food-drink', label: 'Food & Drink', count: 3 },
  { id: 'arts-culture', label: 'Arts & Culture', count: 2 },
  { id: 'outdoors', label: 'Outdoors', count: 1 },
  { id: 'social', label: 'Social', count: 1 },
  { id: 'learning', label: 'Learning', count: 0 },
  { id: 'shopping', label: 'Shopping', count: 0 },
  { id: 'wellness', label: 'Wellness', count: 0 },
]
const bookmarksByUser = new Map<string, Set<string>>()

function bookmarksFor(userId: string) {
  let bookmarks = bookmarksByUser.get(userId)
  if (!bookmarks) {
    bookmarks = new Set(['pottery', 'hiking', 'bookstore', 'matcha'])
    bookmarksByUser.set(userId, bookmarks)
  }
  return bookmarks
}

/**
 * Quest suggestions, prices and durations are illustrative; progress uses saved user records.
 * TODO(backend): Use callApi, validate the response, and map it to HomeResult.
 * Keep IDs stable across recommendations and bookmarks. Preserve `outdoors`
 * as the category ID even though the asset folder is named `outdoor`.
 * Pass userId through the real authenticated session, not as proof of identity.
 */
export async function getHome(userId: string, signal?: AbortSignal): Promise<HomeResult> {
  await waitForStub(signal)
  checkStubFailure('home')
  const bookmarks = bookmarksFor(userId)
  const records = await readActivityRecords(userId, signal)
  return {
    ideas: homeQuestIds.map(id => ({ ...activities.find(activity => activity.id === id)! })),
    bookmarkedQuests: activities.filter(activity => bookmarks.has(activity.id)).map(activity => ({ ...activity })),
    adventure: {
      totalActivities: new Set(records.map(record => record.activityTypeId)).size,
      categories: categories.map(category => ({ ...category, count: new Set(records.filter(record => record.activityTypeId.startsWith(`${category.id}/`)).map(record => record.activityTypeId)).size })),
    },
    isStub: true,
  }
}

/**
 * Explicitly set the desired state so retrying cannot accidentally toggle twice.
 * Stub changes live in memory, are isolated by user ID, and reset on reload.
 * TODO(backend): Persist with callApi and return the confirmed BookmarkResult.
 * Throw a user-safe Error on failure; the UI keeps the last confirmed state.
 */
export async function setQuestBookmarked(userId: string, questId: string, bookmarked: boolean): Promise<BookmarkResult> {
  await waitForStub(undefined, 300)
  checkStubFailure('bookmark')
  if (!activities.some(activity => activity.id === questId)) throw new Error('This activity is no longer available.')
  const bookmarks = bookmarksFor(userId)
  if (bookmarked) bookmarks.add(questId)
  else bookmarks.delete(questId)
  return { questId, bookmarked, isStub: true }
}
