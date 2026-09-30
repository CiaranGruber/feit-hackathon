// Shared IDs for onboarding and profile preferences, including the Other option.
export const interestCategories = [
  { id: 'food-drink', label: 'Food & Drink' },
  { id: 'outdoors', label: 'Outdoors' },
  { id: 'arts-culture', label: 'Arts & Culture' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'social', label: 'Social' },
  { id: 'learning', label: 'Learning' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'sports', label: 'Sports' },
  { id: 'other', label: 'Other' },
] as const

export function validInterestIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return interestCategories.filter(category => value.includes(category.id)).map(category => category.id)
}
