import { demoQuests } from './discovery-fixtures.ts'
import type { QuestDetail, QuestDifficulty, QuestOption } from '../types/quest.ts'

const goals: Record<string, string> = {
  cafe: 'Visit a café you haven’t tried before and take a moment to enjoy something new.',
  'ice-skating': 'Spend at least 30 minutes skating on the ice, taking breaks whenever you need.',
  'ice-skating-beginner': 'Try a beginner skating session and practise moving comfortably on the ice.',
  'ice-skating-night': 'Join an evening skating session and try a few laps at your own pace.',
  hiking: 'Complete a new walking route of at least 2 km and pause at your favourite spot.',
  pottery: 'Make one small pottery piece and enjoy learning the basic techniques.',
  'language-session': 'Learn ten useful phrases in a language you’re curious about.',
  'meditation-session': 'Set aside five quiet minutes and practise bringing your attention to your breath.',
}
const difficultyCopy: Record<QuestDifficulty, string> = {
  Easy: 'A comfortable place to start, with little preparation needed. Go at your own pace.',
  Adventure: 'A small step outside your usual routine. Allow some preparation and choose an option that suits your experience.',
  Challenge: 'Allow more time and preparation. Choose a route and conditions that match your experience.',
}

// These are illustrative options from the design, not verified venue listings.
// TODO(backend): Return current venue/resource details, booking requirements and URLs.
// TODO(asset): Add option photographs and quest hero artwork when supplied.
export function findQuestDetail(questId: string): QuestDetail {
  const quest = demoQuests.find(item => item.id === questId)
  if (!quest) throw new Error('This quest could not be found.')
  const skating = quest.activityTypeId === 'sports/ice-skating'
  const difficulty: QuestDifficulty = quest.id === 'hiking' ? 'Challenge' : skating || quest.id === 'meetup-session' ? 'Adventure' : 'Easy'
  const venues = skating
    ? [{ title: 'O’Brien Icehouse', location: 'Docklands' }, { title: 'Melbourne Skating Centre', location: 'Oakleigh' }]
    : quest.id === 'hiking'
      ? [{ title: 'Dandenong Ranges', location: 'Melbourne region' }, { title: 'Yarra Bend Trail', location: 'Melbourne region' }]
      : [{ title: 'Choose a place that suits you', location: 'Your own local option' }]
  const options: QuestOption[] = venues.map((venue, index) => ({
    id: `${quest.id}-venue-${index + 1}`, kind: 'in-person', ...venue,
    description: 'An example option for this preview. Check the venue’s current opening hours, accessibility and booking information before visiting.',
    booking: 'Check with the venue', imageUrl: null,
  }))
  options.push({ id: `${quest.id}-online`, kind: 'online', title: skating ? 'Beginner ice skating guide' : `A beginner’s guide: ${quest.title.toLowerCase()}`, location: 'Online resource', description: 'Use a guide or lesson of your choice. This preview does not include a verified resource link.', booking: 'Choose your own resource', imageUrl: null })
  options.push({ id: `${quest.id}-idea`, kind: 'idea', title: 'Make it your own', location: 'At your own pace', description: 'Adapt the idea to a place, resource or approach that works for you. You can also enter your own option when recording your experience.', booking: 'Plan your own experience', imageUrl: null })
  return { ...quest, goal: goals[quest.id] ?? `Try this activity at your own pace: ${quest.title.toLowerCase()}. Notice what you enjoy and record your experience.`, about: `${quest.description} Make a little room in your day to explore something different. You can try it on your own or with a friend, then save a memory and tell us how it went.`, difficulty, difficultyDescription: difficultyCopy[difficulty], options }
}
