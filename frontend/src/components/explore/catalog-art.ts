import type { ActivityType, CategoryId } from '../../types/discovery.ts'

// Vite resolves local URLs here; only images rendered on the page are requested.
const icons = import.meta.glob<string>('../../assets/catalog-icons-reviewed/*/*.png', { eager: true, query: '?url', import: 'default' })
export function activityIcon(activity: Pick<ActivityType, 'categoryId' | 'slug'>) {
  const folder = activity.categoryId === 'outdoors' ? 'outdoor' : activity.categoryId
  return icons[`../../assets/catalog-icons-reviewed/${folder}/${activity.slug}.png`]
}

export const categorySurfaces: Record<CategoryId, string> = {
  sports: 'bg-[#EEF6FD] hover:border-[#9BCBEF]',
  outdoors: 'bg-[#F0F6EA] hover:border-[#ABD095]',
  'food-drink': 'bg-[#FFF2E2] hover:border-[#F4CF90]',
  'arts-culture': 'bg-[#FDF0F1] hover:border-[#F0B5BE]',
  social: 'bg-[#FEF0EC] hover:border-[#F1B6A2]',
  learning: 'bg-[#F3EDFB] hover:border-[#CCB3ED]',
  shopping: 'bg-[#FFF0F6] hover:border-[#EDB1CB]',
  wellness: 'bg-[#FDF1F2] hover:border-[#F1B6C0]',
}
