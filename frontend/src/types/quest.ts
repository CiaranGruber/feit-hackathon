import type { ActivityRecord, MemoryPhoto, Quest } from './discovery.ts'

export type QuestDifficulty = 'Easy' | 'Adventure' | 'Challenge'
export type QuestOption = {
  id: string
  kind: 'in-person' | 'online' | 'idea'
  title: string
  location: string
  description: string
  booking: string
  imageUrl: string | null
}
export type QuestDetail = Quest & {
  about: string
  goal: string
  difficulty: QuestDifficulty
  difficultyDescription: string
  options: QuestOption[]
}
export type QuestDraft = {
  optionId: string
  manualVenue: string
  completedOn: string
  startTime: string
  endTime: string
  notes: string
  photos: MemoryPhoto[]
  photoComment: string
  activityRating: number | null
  venueRating: number | null
  recommendation: number | null
  expectations: number | null
  likedMost: string
  tips: string
}
export type QuestAttempt = {
  id: string
  questId: string
  startedAt: string
  status: 'in-progress' | 'completed'
  step: number
  draft: QuestDraft
  recordId?: string
}
export type QuestDetailResult = { quest: QuestDetail; isStub: true }
export type QuestAttemptResult = { quest: QuestDetail; attempt: QuestAttempt; isStub: true }
export type QuestCompletionResult = { record: ActivityRecord; isStub: true }
