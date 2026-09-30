import type { CategoryId, Quest } from '../types/discovery.ts'

function quest(id: string, activityTypeId: string, title: string, description: string, duration: string, cost: Quest['cost'], kind: Quest['kind'] = 'Explore'): Quest {
  return { id, activityTypeId, categoryId: activityTypeId.split('/')[0] as CategoryId, title, description, duration, cost, kind, coverImageUrl: null }
}

// Preserve existing Home quest IDs while giving each quest an explicit activity parent.
// TODO(asset): Replace null covers with supplied scene illustrations.
export const demoQuests: Quest[] = [
  quest('cafe', 'food-drink/cafe-hopping', 'Try a new café', 'A cozy spot with great coffee and peaceful vibes.', '1–2 hrs', '$'),
  quest('ice-skating', 'sports/ice-skating', 'Go ice skating', 'A fun way to move and try something a little different.', '2–3 hrs', '$$', 'Wildcard'),
  quest('pottery', 'arts-culture/pottery', 'Pottery workshop', 'Make your own pottery piece in a beginner-friendly class.', '2 hrs', '$$', 'Familiar'),
  quest('hiking', 'outdoors/hiking', 'Hiking trail', 'Enjoy nature and scenic views on a refreshing hike.', '3–4 hrs', 'Free'),
  quest('bookstore', 'arts-culture/bookstore', 'Bookstore visit', 'Slow down, browse the shelves, and find your next favourite read.', '1–2 hrs', 'Free', 'Familiar'),
  quest('matcha', 'food-drink/tea-tasting', 'Try matcha', 'Catch up with a friend over a cup of something new.', '1–2 hrs', '$'),
  quest('ice-skating-beginner', 'sports/ice-skating', 'Try a beginner ice skating session', 'Get comfortable on the ice with a gentle introduction to skating.', '2–3 hrs', '$$', 'Familiar'),
  quest('ice-skating-night', 'sports/ice-skating', 'Go to a night ice skating event', 'Enjoy a different atmosphere on the rink with music and evening lights.', '2–3 hrs', '$$', 'Wildcard'),
  quest('swimming-session', 'sports/swimming', 'Make time for a swim', 'Enjoy an easy session in the pool at a pace that feels comfortable.', '1 hr', '$'),
  quest('running-session', 'sports/running', 'Try a gentle run', 'Choose a familiar route and enjoy a little time moving outdoors.', '30 min', 'Free'),
  quest('yoga-session', 'sports/yoga', 'Try a beginner yoga class', 'Explore a gentle introduction to movement and stretching.', '1 hr', '$'),
  quest('basketball-session', 'sports/basketball', 'Shoot some hoops', 'Head to a public court and enjoy a relaxed practice session.', '1 hr', 'Free'),
  quest('baking-session', 'food-drink/baking', 'Bake something to share', 'Try a simple recipe and share the results with a friend.', '2 hrs', '$', 'Familiar'),
  quest('painting-session', 'arts-culture/painting', 'Paint a little postcard', 'Pick a favourite place and capture it with a few colours.', '1 hr', '$'),
  quest('meetup-session', 'social/meetups', 'Join a local interest meetup', 'Find a group around something you enjoy and meet a few new people.', '1–2 hrs', 'Free'),
  quest('language-session', 'learning/languages', 'Learn your first ten phrases', 'Choose a language and practise a small set of useful everyday phrases.', '30 min', 'Free'),
  quest('market-session', 'shopping/markets-popups', 'Browse a weekend market', 'Take a relaxed wander and discover a few local makers.', '1–2 hrs', 'Free'),
  quest('meditation-session', 'wellness/meditation', 'Take a quiet five minutes', 'Set aside a little time to pause in a comfortable, quiet place.', '5 min', 'Free', 'Familiar'),
]
export const homeQuestIds = ['cafe', 'ice-skating', 'pottery', 'hiking', 'bookstore', 'matcha']

