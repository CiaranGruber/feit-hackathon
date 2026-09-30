import type { CategoryId } from './discovery.ts'

export type ProfileDetails = {
  id: string
  name: string
  handle: string
  bio: string
  interestIds: string[]
  personalisation: string
}

export type ProfileStats = {
  completedQuests: number
  activitiesTried: number
  categoriesExplored: number
  categories: { id: CategoryId; count: number }[]
}

export type ProfileResult = { profile: ProfileDetails; stats: ProfileStats; isStub: boolean }
export type ProfileUpdateResult = { profile: ProfileDetails; isStub: boolean }
export type ProfileDetailsInput = Pick<ProfileDetails, 'name' | 'handle' | 'bio'>
