import { demoQuests } from '../src/data/discovery-fixtures.ts'
import type { ActivityRecord } from '../src/types/discovery.ts'

function record(questId: string, completedOn: string, overrides: Partial<ActivityRecord> = {}): ActivityRecord {
  const activityQuest = demoQuests.find(item => item.id === questId)!
  return {
    id: `record-${questId}`, questId, activityTypeId: activityQuest.activityTypeId,
    questTitle: activityQuest.title, completedOn, venue: 'Example location', duration: activityQuest.duration,
    activityRating: 4, venueRating: 4, notes: 'A little time to try something new. I’m glad I gave it a go!', photos: [], ...overrides,
  }
}

export const demoRecords: ActivityRecord[] = [
  record('ice-skating-beginner', '2026-09-14', {
    venue: "O’Brien Icehouse, Docklands", duration: '2 hrs', venueRating: 5,
    notes: 'It was my first time ice skating and it was really fun! I was a bit nervous at first but quickly got used to it. The rink was clean and the atmosphere was great.',
    photos: [{ id: 'ice-first-steps', imageUrl: null, caption: 'My first time on the ice.' }],
  }),
  record('ice-skating-night', '2026-08-02', {
    venue: 'Melbourne Skating Centre, Oakleigh', duration: '2 hrs', activityRating: 5,
    notes: 'Amazing night! The atmosphere was so nice with the lights and music. It was much more crowded than a usual session, but I’d love to go again!',
    photos: [
      { id: 'ice-evening', imageUrl: null, caption: 'An evening under the rink lights.' },
      { id: 'ice-friends', imageUrl: null, caption: 'A fun night with friends.' },
    ],
  }),
  ...['swimming-session', 'running-session', 'yoga-session', 'basketball-session', 'cafe', 'baking-session', 'matcha', 'pottery', 'painting-session', 'hiking', 'meetup-session']
    .map((id, index) => record(id, `2026-07-${String(20 - index).padStart(2, '0')}`)),
]
