import { findQuestDetail } from '../data/quest-details.ts'
import { readQuestProgress, updateQuestProgress } from '../data/quest-progress.ts'
import { checkStubFailure, waitForStub } from './stub-utils.ts'
import type { QuestAttemptResult, QuestCompletionResult, QuestDetailResult, QuestDraft } from '../types/quest.ts'

export function localDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function blankDraft(): QuestDraft {
  return { optionId: '', manualVenue: '', completedOn: localDate(), startTime: '', endTime: '', notes: '', photos: [], photoComment: '', activityRating: null, venueRating: null, recommendation: null, expectations: null, likedMost: '', tips: '' }
}

export function validateQuestStep(questId: string, draft: QuestDraft, step: number): string {
  const quest = findQuestDetail(questId)
  if (!draft.optionId || (draft.optionId !== 'manual' && !quest.options.some(option => option.id === draft.optionId))) return 'Choose how you completed this quest.'
  if (draft.optionId === 'manual' && (!draft.manualVenue.trim() || draft.manualVenue.trim().length > 120)) return 'Enter a place or resource name of 1–120 characters.'
  if (step === 0) return ''
  const date = new Date(`${draft.completedOn}T12:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.completedOn) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== draft.completedOn || draft.completedOn > localDate()) return 'Choose a valid completion date that is not in the future.'
  if (draft.startTime || draft.endTime) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.endTime) || draft.endTime <= draft.startTime) return 'Enter both times, with the end time after the start time on the same day.'
  }
  if (draft.notes.length > 300) return 'Keep your notes to 300 characters or fewer.'
  if (step === 1) return ''
  if (draft.photos.length > 3) return 'Choose up to three photos.'
  if (draft.photos.some(photo => !photo.id || !photo.imageUrl || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo.imageUrl) || photo.imageUrl.length > 14_000_000)) return 'Use JPG or PNG photos up to 10 MB each.'
  if (draft.photoComment.length > 300) return 'Keep your photo comment to 300 characters or fewer.'
  if (step === 2) return ''
  const validRating = (value: number | null) => value !== null && Number.isInteger(value) && value >= 1 && value <= 5
  if (!validRating(draft.activityRating) || !validRating(draft.venueRating)) return 'Rate both the activity and the venue or resource before submitting.'
  if ([draft.recommendation, draft.expectations].some(value => value !== null && !validRating(value))) return 'Choose a response from 1 to 5, or leave the optional questions blank.'
  if (draft.likedMost.length > 300 || draft.tips.length > 300) return 'Keep each feedback answer to 300 characters or fewer.'
  return ''
}

/** TODO(backend): Fetch the quest goal, difficulty and available options from the API. */
export async function getQuestDetail(_userId: string, questId: string, signal?: AbortSignal): Promise<QuestDetailResult> {
  await waitForStub(signal)
  checkStubFailure('quest')
  return { quest: findQuestDetail(questId), isStub: true }
}

/** TODO(backend): Start/resume a user-owned quest attempt. Starting adds no completion. */
export async function startQuest(userId: string, questId: string, signal?: AbortSignal): Promise<QuestAttemptResult> {
  const quest = findQuestDetail(questId)
  await waitForStub(signal)
  checkStubFailure('quest-start')
  const attempt = await updateQuestProgress(userId, progress => {
    const active = progress.attempts.find(item => item.questId === questId && item.status === 'in-progress')
    if (active) return active
    const created = { id: crypto.randomUUID(), questId, status: 'in-progress' as const, step: 0, startedAt: new Date().toISOString(), draft: blankDraft() }
    progress.attempts.push(created)
    return created
  }, signal)
  return { quest, attempt, isStub: true }
}

/** TODO(backend): Load the attempt scoped to the authenticated user, never by ID alone. */
export async function getQuestAttempt(userId: string, questId: string, attemptId: string, signal?: AbortSignal): Promise<QuestAttemptResult> {
  await waitForStub(signal)
  checkStubFailure('quest')
  const attempt = (await readQuestProgress(userId, signal)).attempts.find(item => item.id === attemptId && item.questId === questId)
  if (!attempt) throw new Error('This quest attempt could not be found. Open the quest and start again.')
  return { quest: findQuestDetail(questId), attempt, isStub: true }
}

/** TODO(backend): Save draft steps and upload photos through a media endpoint.
 * The preview stores data URLs locally; the real API should return media IDs/URLs.
 */
export async function saveQuestDraft(userId: string, questId: string, attemptId: string, draft: QuestDraft, nextStep: number, signal?: AbortSignal) {
  const input = structuredClone(draft)
  const error = validateQuestStep(questId, input, Math.max(0, nextStep - 1))
  if (error) throw new Error(error)
  if (!Number.isInteger(nextStep) || nextStep < 0 || nextStep > 3) throw new Error('Choose a valid step.')
  await waitForStub(signal, 200)
  checkStubFailure('quest-draft')
  return updateQuestProgress(userId, progress => {
    const attempt = progress.attempts.find(item => item.id === attemptId && item.questId === questId)
    if (!attempt || attempt.status !== 'in-progress') throw new Error('This attempt is no longer editable.')
    attempt.draft = input
    attempt.step = nextStep
    return attempt
  }, signal)
}

/** TODO(backend): Commit completion + feedback atomically using attemptId as the
 * idempotency key. Failed/cancelled submissions must not update any progress.
 */
export async function completeQuest(userId: string, questId: string, attemptId: string, draft: QuestDraft, signal?: AbortSignal): Promise<QuestCompletionResult> {
  const input = structuredClone(draft)
  const error = validateQuestStep(questId, input, 3)
  if (error) throw new Error(error)
  const quest = findQuestDetail(questId)
  await waitForStub(signal, 600)
  checkStubFailure('quest-complete')
  const record = await updateQuestProgress(userId, progress => {
    const attempt = progress.attempts.find(item => item.id === attemptId && item.questId === questId)
    if (!attempt) throw new Error('Start this quest before recording your experience.')
    const existing = progress.records.find(item => item.id === `completion-${attemptId}`)
    if (existing) return existing
    const option = quest.options.find(item => item.id === input.optionId)
    const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
    const duration = input.startTime ? `${minutes(input.endTime) - minutes(input.startTime)} min` : 'Time not recorded'
    const created = {
      id: `completion-${attemptId}`, questId, questTitle: quest.title, activityTypeId: quest.activityTypeId,
      completedOn: input.completedOn, venue: input.optionId === 'manual' ? input.manualVenue.trim() : option!.title,
      duration, activityRating: input.activityRating!, venueRating: input.venueRating!, notes: input.notes.trim(),
      photos: input.photos.map(photo => ({ ...photo, caption: input.photoComment.trim() || quest.title })),
      startedAt: attempt.startedAt, startTime: input.startTime, endTime: input.endTime, photoComment: input.photoComment.trim(),
      recommendation: input.recommendation, expectations: input.expectations, likedMost: input.likedMost.trim(), tips: input.tips.trim(),
    }
    progress.records.push(created)
    attempt.status = 'completed'
    attempt.recordId = created.id
    // Avoid retaining a second copy of potentially large photo data in the draft.
    attempt.draft = { ...input, photos: [] }
    return created
  }, signal)
  return { record, isStub: true }
}

/** TODO(backend): Read a confirmed completion owned by the authenticated user. */
export async function getQuestCompletion(userId: string, questId: string, recordId: string, signal?: AbortSignal): Promise<QuestCompletionResult> {
  await waitForStub(signal, 200)
  const record = (await readQuestProgress(userId, signal)).records.find(item => item.id === recordId && item.questId === questId)
  if (!record) throw new Error('This completion could not be found.')
  return { record, isStub: true }
}
