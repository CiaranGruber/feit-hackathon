import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getHome, setQuestBookmarked } from '../src/services/home-service.ts'
import { sendCompanionMessage } from '../src/services/companion-service.ts'
import { readDisplayProfile, saveDisplayProfile } from '../src/data/display-profile.ts'

test('bookmarks are idempotent, isolated by user, and returned as independent snapshots', async () => {
  const before = await getHome('bookmark-test')
  assert.equal(before.adventure.totalActivities, before.adventure.categories.reduce((sum, category) => sum + category.count, 0))
  assert.equal(before.bookmarkedQuests.some(quest => quest.id === 'cafe'), false)
  await setQuestBookmarked('bookmark-test', 'cafe', true)
  await setQuestBookmarked('bookmark-test', 'cafe', true)
  const saved = await getHome('bookmark-test')
  assert.equal(saved.bookmarkedQuests.filter(quest => quest.id === 'cafe').length, 1)
  assert.equal(before.bookmarkedQuests.some(quest => quest.id === 'cafe'), false)
  assert.equal((await getHome('another-user')).bookmarkedQuests.some(quest => quest.id === 'cafe'), false)
  saved.ideas[0].title = 'Mutated by consumer'
  assert.notEqual((await getHome('bookmark-test')).ideas[0].title, 'Mutated by consumer')
  await setQuestBookmarked('bookmark-test', 'cafe', false)
  assert.equal((await getHome('bookmark-test')).bookmarkedQuests.some(quest => quest.id === 'cafe'), false)
  await assert.rejects(setQuestBookmarked('bookmark-test', 'unknown-quest', true), /no longer available/)
})

test('Home and chat requests can be cancelled without returning a simulated success', async () => {
  const homeController = new AbortController()
  const loading = getHome('cancelled-user', homeController.signal)
  homeController.abort()
  await assert.rejects(loading, { name: 'AbortError' })
  const chatController = new AbortController()
  const reply = sendCompanionMessage({ userId: 'test', messages: [{ id: 'cancel', role: 'user', content: 'An idea, please' }] }, chatController.signal)
  chatController.abort()
  await assert.rejects(reply, { name: 'AbortError' })
})

test('chat validates input, preserves retry identity, and does not invent nearby venues', async () => {
  for (const content of ['', '   ', 'x'.repeat(1001)]) {
    await assert.rejects(sendCompanionMessage({ userId: 'test', messages: [{ id: 'invalid', role: 'user', content }] }))
  }
  const input = { userId: 'test', messages: [{ id: 'outdoors-message', role: 'user', content: 'Outdoor activities near me' }] }
  const [first, retry] = await Promise.all([sendCompanionMessage(input), sendCompanionMessage(input)])
  assert.deepEqual(first, retry)
  assert.equal(first.message.role, 'assistant')
  assert.equal(first.isStub, true)
  assert.match(first.message.content, /don’t have your location/)
  assert.equal(input.messages.length, 1)
  const relaxing = await sendCompanionMessage({ ...input, messages: [{ id: 'relax', role: 'user', content: 'Something relaxing' }] })
  assert.notEqual(relaxing.message.content, first.message.content)
})

test('a failed profile write uses the latest display name without storing credentials', () => {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
  const storage = new Map()
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  } })
  try {
    saveDisplayProfile({ isStub: true, user: { id: 'test', name: 'Alex', email: 'alex@example.test', interestIds: ['sports'] } })
    assert.deepEqual(readDisplayProfile(), { id: 'test', name: 'Alex', isStub: true })
    assert.equal([...storage.values()].some(value => value.includes('email') || value.includes('password')), false)
    globalThis.sessionStorage.setItem = () => { throw new Error('Storage unavailable') }
    saveDisplayProfile({ isStub: true, user: { id: 'new-user', name: 'Jamie', email: null, interestIds: [] } })
    assert.equal(readDisplayProfile().name, 'Jamie')
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, 'sessionStorage', originalStorage)
    else delete globalThis.sessionStorage
  }
})
