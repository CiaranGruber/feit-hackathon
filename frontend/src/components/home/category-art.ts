import sports from '../../assets/catalog-icons-reviewed/sports/sports.png'
import food from '../../assets/catalog-icons-reviewed/food-drink/food-drink.png'
import arts from '../../assets/catalog-icons-reviewed/arts-culture/arts-culture.png'
import outdoors from '../../assets/catalog-icons-reviewed/outdoor/outdoor.png'
import social from '../../assets/catalog-icons-reviewed/social/social.png'
import learning from '../../assets/catalog-icons-reviewed/learning/learning.png'
import shopping from '../../assets/catalog-icons-reviewed/shopping/shopping.png'
import wellness from '../../assets/catalog-icons-reviewed/wellness/wellness.png'
import type { CategoryId } from '../../services/home-service.ts'

export const categoryArt: Record<CategoryId, { image: string; color: string; label: string }> = {
  sports: { image: sports, color: '#8abce6', label: 'Sports' },
  'food-drink': { image: food, color: '#fac778', label: 'Food & Drink' },
  'arts-culture': { image: arts, color: '#f49d84', label: 'Arts & Culture' },
  // Keep the API's plural category ID despite the singular asset folder name.
  outdoors: { image: outdoors, color: '#a3bd87', label: 'Outdoors' },
  social: { image: social, color: '#bd9ade', label: 'Social' },
  learning: { image: learning, color: '#ddcba5', label: 'Learning' },
  shopping: { image: shopping, color: '#eca4ba', label: 'Shopping' },
  wellness: { image: wellness, color: '#f1a7af', label: 'Wellness' },
}
