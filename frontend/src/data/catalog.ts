import type { ActivityCategory, ActivityType, CategoryId } from '../types/discovery.ts'

// This is the reviewed catalog, not the older counts/grouping in the mockups.
// Keep the existing API ID `outdoors`; artwork uses the folder `outdoor`.
export const activityCategories: ActivityCategory[] = [
  { id: 'sports', title: 'Sports', description: 'Get active, try something new, and enjoy the fun of movement.' },
  { id: 'outdoors', title: 'Outdoor', description: 'Step outside and find a little adventure in the world around you.' },
  { id: 'food-drink', title: 'Food & Drink', description: 'Discover new flavours, favourite spots, and delicious little moments.' },
  { id: 'arts-culture', title: 'Arts & Culture', description: 'Follow your curiosity through art, creativity, and culture.' },
  { id: 'social', title: 'Social', description: 'Meet people, share an experience, and make a new connection.' },
  { id: 'learning', title: 'Learning', description: 'Explore a new subject or take the first step towards a new skill.' },
  { id: 'shopping', title: 'Shopping', description: 'Browse local discoveries and find something that feels like you.' },
  { id: 'wellness', title: 'Wellness', description: 'Make a little space to rest, recharge, and look after yourself.' },
]

const entries: Record<CategoryId, readonly (readonly [string, string])[]> = {
  sports: [
    ['swimming', 'Swimming'], ['running', 'Running'], ['gym-fitness', 'Gym / Fitness'],
    ['basketball', 'Basketball'], ['tennis', 'Tennis'], ['badminton', 'Badminton'],
    ['ice-skating', 'Ice skating'], ['golf', 'Golf'], ['yoga', 'Yoga'], ['pilates', 'Pilates'],
    ['soccer', 'Soccer'], ['rock-climbing', 'Rock climbing'], ['table-tennis', 'Table tennis'],
    ['volleyball', 'Volleyball'], ['dance', 'Dance'], ['martial-arts', 'Martial arts'],
  ],
  outdoors: [
    ['hiking', 'Hiking'], ['camping', 'Camping'], ['cycling', 'Cycling'],
    ['nature-walk', 'Nature walk'], ['beach', 'Beach'], ['national-parks', 'National parks'],
    ['water-activities', 'Water activities'], ['snow-activities', 'Snow activities'],
    ['gardening', 'Gardening'], ['stargazing', 'Stargazing'], ['fishing', 'Fishing'], ['picnic', 'Picnic'],
  ],
  'food-drink': [
    ['cafe-hopping', 'Café hopping'], ['baking', 'Baking'], ['cooking', 'Cooking'],
    ['try-new-cuisine', 'Try new cuisine'], ['brunch', 'Brunch'], ['dessert-sweets', 'Dessert / Sweets'],
    ['bar-cocktail', 'Bar / Cocktail'], ['tea-tasting', 'Tea tasting'], ['wine-tasting', 'Wine tasting'],
    ['food-markets', 'Food markets'], ['bbq-grilling', 'BBQ / Grilling'],
    ['vegetarian-vegan', 'Vegetarian / Vegan'], ['fine-dining', 'Fine dining'], ['street-food', 'Street food'],
    ['home-brewing', 'Home brewing'], ['farm-to-table', 'Farm to table'],
  ],
  'arts-culture': [
    ['museum', 'Museum'], ['art-exhibitions', 'Art exhibitions'], ['pottery', 'Pottery'],
    ['painting', 'Painting'], ['photography', 'Photography'], ['diy-crafts', 'DIY / Crafts'],
    ['concerts', 'Concerts'], ['theatre', 'Theatre'], ['movies', 'Movies'],
    ['music-instrument', 'Music instrument'], ['bookstore', 'Bookstore'], ['calligraphy', 'Calligraphy'],
    ['cultural-festivals', 'Cultural festivals'], ['architecture', 'Architecture'],
    ['vintage-thrifting', 'Vintage / Thrifting'], ['collecting', 'Collecting'],
  ],
  social: [
    ['meetups', 'Meetups'], ['board-games', 'Board games'], ['karaoke', 'Karaoke'],
    ['volunteering', 'Volunteering'], ['networking', 'Networking'], ['party-events', 'Party / Events'],
    ['language-exchange', 'Language exchange'], ['community-group', 'Community group'],
    ['clubs-societies', 'Clubs / Societies'], ['game-nights', 'Game nights'],
    ['speed-friending', 'Speed friending'], ['cooking-together', 'Cooking together'],
    ['sports-groups', 'Sports groups'], ['cultural-exchange', 'Cultural exchange'],
    ['study-group', 'Study group'], ['local-events', 'Local events'],
  ],
  learning: [
    ['languages', 'Languages'], ['coding-tech', 'Coding / Tech'], ['business-finance', 'Business / Finance'],
    ['personal-development', 'Personal development'], ['academic-subjects', 'Academic subjects'],
    ['workshops', 'Workshops'], ['online-courses', 'Online courses'], ['public-speaking', 'Public speaking'],
    ['ai-data', 'AI / Data'], ['sustainability', 'Sustainability'], ['history', 'History'], ['science', 'Science'],
    ['diy-skills', 'DIY skills'], ['life-skills', 'Life skills'], ['career-development', 'Career development'],
    ['hobbies-learning', 'Hobbies learning'],
  ],
  shopping: [
    ['clothing-fashion', 'Clothing / Fashion'], ['sneakers', 'Sneakers'], ['beauty-skincare', 'Beauty / Skincare'],
    ['accessories', 'Accessories'], ['home-decor', 'Home decor'], ['stationery', 'Stationery'],
    ['plants', 'Plants'], ['markets-popups', 'Markets / Popups'], ['second-hand', 'Second-hand'],
    ['local-boutiques', 'Local boutiques'], ['malls-outlets', 'Malls / Outlets'], ['online-finds', 'Online finds'],
    ['craft-supplies', 'Craft supplies'], ['tech-gadgets', 'Tech gadgets'], ['antiques', 'Antiques'], ['souvenirs', 'Souvenirs'],
  ],
  wellness: [
    ['meditation', 'Meditation'], ['mindfulness', 'Mindfulness'], ['sleep', 'Sleep'],
    ['mental-health', 'Mental health'], ['journaling', 'Journaling'], ['spirituality', 'Spirituality'],
    ['massage-spa', 'Massage / Spa'], ['hot-springs', 'Hot springs'], ['healthy-eating', 'Healthy eating'],
    ['stretching', 'Stretching'], ['breathwork', 'Breathwork'], ['nature-therapy', 'Nature therapy'],
    ['digital-detox', 'Digital detox'], ['self-care', 'Self-care'],
    ['therapy-counselling', 'Therapy / Counselling'], ['productivity', 'Productivity'],
  ],
}

export const activityTypes: ActivityType[] = activityCategories.flatMap(category => entries[category.id].map(([slug, title]) => ({
  id: `${category.id}/${slug}`,
  slug,
  categoryId: category.id,
  title,
  description: slug === 'ice-skating' ? 'Glide, explore and enjoy the thrill of skating on ice.' : `Discover ${title.toLowerCase()} at your own pace.`,
  about: slug === 'ice-skating'
    ? 'Ice skating combines gentle exercise, balance, and a sense of adventure. Whether you’re a complete beginner or looking to improve, there are many ways to enjoy skating — from casual public sessions to themed events.'
    : `${category.description} ${title} is one way to get started. Browse the available quests, choose something that suits your interests, and make the experience your own.`,
  // TODO(asset): Supply activity hero artwork. Do not use a category icon as a cover.
  coverImageUrl: null,
})))

export function filterCatalog<T extends ActivityType>(activities: readonly T[], query: string): T[] {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  return activities.filter(activity => {
    const category = activityCategories.find(item => item.id === activity.categoryId)
    const text = normalize(`${activity.title} ${category?.title ?? ''} ${activity.slug.replaceAll('-', ' ')}`)
    return terms.every(term => text.includes(term))
  })
}
