export type CategoryId = 'sports' | 'outdoors' | 'food-drink' | 'arts-culture' | 'social' | 'learning' | 'shopping' | 'wellness'
export type QuestKind = 'Familiar' | 'Explore' | 'Wildcard'

export type ActivityCategory = {
  id: CategoryId
  title: string
  description: string
}

// An activity type is a reusable interest, such as ice skating. It is not a quest.
export type ActivityType = {
  id: string
  slug: string
  categoryId: CategoryId
  title: string
  description: string
  about: string
  coverImageUrl: string | null
}
export type ActivitySummary = ActivityType & { completedQuestCount: number }

// A quest is one specific idea that belongs to an activity type.
export type Quest = {
  id: string
  activityTypeId: string
  title: string
  description: string
  categoryId: CategoryId
  kind: QuestKind
  duration: string
  cost: 'Free' | '$' | '$$'
  coverImageUrl: string | null
}

export type MemoryPhoto = { id: string; imageUrl: string | null; caption: string }
export type ActivityRecord = {
  id: string
  activityTypeId: string
  questId: string
  questTitle: string
  completedOn: string
  venue: string
  duration: string
  activityRating: number
  venueRating: number
  notes: string
  photos: MemoryPhoto[]
  startedAt?: string
  startTime?: string
  endTime?: string
  photoComment?: string
  recommendation?: number | null
  expectations?: number | null
  likedMost?: string
  tips?: string
}
