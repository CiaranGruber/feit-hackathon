import foodAndDrinkIcon from '../assets/food&drink_2.png'
import outdoorsIcon from '../assets/outdoors_2.png'
import artsAndCultureIcon from '../assets/arts&culture_2.png'
import wellnessIcon from '../assets/wellness_2.png'
import socialIcon from '../assets/social_2.png'
import learningIcon from '../assets/learning_2.png'
import shoppingIcon from '../assets/shopping_2.png'
import sportsIcon from '../assets/sports_2.png'
import otherIcon from '../assets/other_2.png'
import { interestCategories } from './interest-categories.ts'

type InterestOption = {
  id: string
  label: string
  icon: string
}

const icons = {
  'food-drink': foodAndDrinkIcon, outdoors: outdoorsIcon, 'arts-culture': artsAndCultureIcon,
  wellness: wellnessIcon, social: socialIcon, learning: learningIcon,
  shopping: shoppingIcon, sports: sportsIcon, other: otherIcon,
}

export const interestOptions: InterestOption[] = interestCategories.map(category => ({ ...category, icon: icons[category.id] }))
