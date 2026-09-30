import foodAndDrinkIcon from '../assets/food&drink_2.png'
import outdoorsIcon from '../assets/outdoors_2.png'
import artsAndCultureIcon from '../assets/arts&culture_2.png'
import wellnessIcon from '../assets/wellness_2.png'
import socialIcon from '../assets/social_2.png'
import learningIcon from '../assets/learning_2.png'
import shoppingIcon from '../assets/shopping_2.png'
import sportsIcon from '../assets/sports_2.png'
import otherIcon from '../assets/other_2.png'

type InterestOption = {
  id: string
  label: string
  icon: string
}

export const interestOptions: InterestOption[] = [
  { id: 'food-drink', label: 'Food & Drink', icon: foodAndDrinkIcon },
  { id: 'outdoors', label: 'Outdoors', icon: outdoorsIcon },
  { id: 'arts-culture', label: 'Arts & Culture', icon: artsAndCultureIcon },
  { id: 'wellness', label: 'Wellness', icon: wellnessIcon },
  { id: 'social', label: 'Social', icon: socialIcon },
  { id: 'learning', label: 'Learning', icon: learningIcon },
  { id: 'shopping', label: 'Shopping', icon: shoppingIcon },
  { id: 'sports', label: 'Sports', icon: sportsIcon },
  { id: 'other', label: 'Other', icon: otherIcon },
]
