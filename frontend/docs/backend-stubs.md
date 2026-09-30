# Onboarding service stubs

Current screens need email registration, email sign-in, and social sign-in. All entry points live in `src/services/auth-service.ts` and return Promises, so the UI already handles asynchronous results, pending states, and errors. They currently perform no network requests or persistence.

Current backend's example `GET /user/{user_id}` only returns `first_name`.

## Service inputs

### `registerAccount(input)`

```ts
type RegisterAccountInput = {
  name: string
  email: string
  password: string
  interestIds: readonly string[]
}

```

### `signIn(input)`

```ts
type SignInInput = {
  email: string
  password: string
}
```
The returning-user form validates email format and requires a non-empty password. Registration's minimum password length does not apply to sign-in. The stub simulates a short wait and always returns the fictional Carol profile (`stub-returning-user`); it does not look up an account or check credentials. It never stores or returns the password. No questionnaire draft is submitted. Real integration must return the existing user's profile and saved preferences.

### `signInWithProvider(input)`

```ts
type SocialSignInInput = {
  provider: 'google' | 'apple'
  interestIds?: readonly string[]
}
```

## Shared result

All three services return `Promise<AuthResult>`:

```json
{
  "isStub": true,
  "user": {
    "id": "stub-email-user",
    "name": "Alex",
    "email": "alex@example.com",
    "interestIds": ["food-drink", "outdoors"]
  }
}

```

* `user.id`: a string; stub IDs are placeholders, not real backend user IDs.
* `user.name`: the entered name for registration, Carol for preview email sign-in, or a fictional provider user name for social sign-in.
* `user.email`: a string or `null`; a provider may not return an email each time.
* `user.interestIds`: category IDs, never display labels or artwork URLs. Registration sends the questionnaire draft. Returning-user social sign-in omits the optional input so real integration can preserve existing preferences. Sign-in previews return an empty array because no account lookup occurs.
* `isStub`: frontend-only metadata that keeps preview results visibly distinct from real authentication. It is not a required backend JSON field. Set it to `false` only after real authentication succeeds.

## Questionnaire draft

`src/data/onboarding-draft.ts` shares the selected IDs between the questionnaire and registration. It uses `sessionStorage` with an in-memory fallback when storage is unavailable; only category IDs are saved. A memory-only draft does not survive reloads.

Because like the visitor has no account yet, clicking Next only saves a local draft. Registration or social sign-in passes that draft to the service. Integration can persist preferences as part of registration or through a separate request after authentication, without making the page coordinate backend endpoints. 

## Replacing the stubs

1. Agree on the inputs and user fields, including how `name` maps to its user model and how interest IDs are persisted.
2. Replace the implementations using `callApi` from `src/services/api.ts`. Keep HTTP calls, response validation, and field mapping inside services.
3. Check `result.ok`, validate the response, and throw an `Error` with a user-facing message for failures. Pages catch these errors and restore the submission buttons so the user can retry.
4. Return the same `AuthResult` shape with `isStub: false`. Do not fabricate a successful result when a real request fails.
5. Registration and sign-in save a display-only profile and navigate to `/home`. This profile is not an authenticated session; real integration must establish authentication separately.

## Home and companion services

`src/services/home-service.ts` provides:

* `getHome(userId, signal?) -> Promise<HomeResult>`: recommendation ideas, bookmarked quests, and activity counts by category.
* `setQuestBookmarked(userId, questId, bookmarked) -> Promise<BookmarkResult>`: confirms an explicit saved/unsaved state, making retries idempotent. Changes are isolated by user ID in memory and reset on a page reload.

Activities carry `id`, `title`, `description`, `categoryId`, `kind` (`Familiar`, `Explore`, or `Wildcard`), `duration`, `cost` (`Free`, `$`, or `$$`), and nullable `coverImageUrl`. Time and cost are display estimates, not distance or live venue pricing. Cover images are intentionally blank until supplied. Preserve the `outdoors` category ID even though the corresponding artwork folder is named `outdoor`.

`HomeResult.adventure` contains `totalActivities` and `categories: { id, label, count }[]`. Counts derive from this user's saved completion records, starting at zero. All eight categories are included, including Shopping and Wellness.

`src/services/companion-service.ts` provides:

* `sendCompanionMessage({ userId, messages }, signal?) -> Promise<CompanionResult>`.
* Each message is `{ id, role: 'user' | 'assistant', content }`.
* The result is `{ message: ChatMessage, isStub: boolean }`.

The companion uses local keyword responses and simulated latency; it does not call an AI, search for venues, or request location. Retrying reuses the original user message and ID, so the UI does not duplicate it. Closing and reopening the sheet preserves the conversation while Home remains mounted; navigating away or reloading clears it. Pending work is cancelled when Home unmounts. Empty messages and messages longer than 1,000 characters are rejected.

Replace each service implementation with `callApi`, validate the response, and throw user-safe errors. Keep page components independent of endpoint URLs. All current responses have `isStub: true`. Display-profile storage only keeps ID, name, and preview status in `sessionStorage`, with an in-memory fallback. It never stores email, passwords, or provider tokens, and is never proof of authentication.

### Preview and failure checks

* `/home` opens a sample profile named Carol when no onboarding profile exists.
* `/sign-in` opens from Welcome's "I have an account" link. In development, `/sign-in?stubError=sign-in` fails the first email sign-in attempt; retry succeeds. These preview credentials are never sent to the backend.
* `/my-quests` separates saved Activities and Quests. Explore supports the catalog-to-records flow; Profile supports display and preference editing. Quest detail, draft steps, photo selection, feedback and completion are implemented through local service stubs.
* In development, `/home?stubError=chat` fails the first chat request. Retry succeeds. `stubError=home` and `stubError=bookmark` exercise the corresponding failure states. Each selected operation fails once per page load; these switches are inactive in production builds.
* `npm test` runs service-contract checks using Node's built-in test runner (Node 22.18+ or 24). `npm run build` and `npm run lint` validate the app.

### Pending artwork

English `TODO(asset)` comments mark the nowIdea wordmark, activity scene covers, and missing Profile artwork. The four bottom-navigation icons, chat Close/Send icons, settings icons and golden bookmark section icon are connected, with accessible labels on icon-only buttons. Supplied category icons, clocks, hearts, arrows, companion artwork, and prompt illustrations are already connected. Additional functional icons are local Material Symbols SVGs in `src/assets/`, downloaded from Google Fonts under Apache 2.0.

## Explore contracts

The source of category membership and labels is `src/data/catalog.ts`, matching all 124 activity icons in the reviewed asset folders. Keep `outdoors` as the API category ID. Activity IDs use `categoryId/slug`, for example `sports/ice-skating`; quest IDs remain independent strings. `src/types/discovery.ts` defines:

* `ActivityType`: `{ id, slug, categoryId, title, description, about, coverImageUrl }`.
* `ActivitySummary`: an activity type plus `completedQuestCount`.
* `Quest`: existing Home card fields plus `activityTypeId`. The Home service's old `Activity` type name is a compatibility alias for `Quest`, not `ActivityType`.
* `ActivityRecord`: `{ id, activityTypeId, questId, questTitle, completedOn, venue, duration, activityRating, venueRating, notes, photos }`.
* `MemoryPhoto`: `{ id, imageUrl, caption }`. Missing artwork uses a null URL.

`src/services/explore-service.ts` returns Promises:

| Function | Result |
| --- | --- |
| `getCatalog(userId, signal?)` | `{ categories: (ActivityCategory & { activityCount })[], activities: ActivitySummary[], isStub }` |
| `getActivityDetail(userId, activityId, signal?)` | `{ activity: ActivitySummary, quests: Quest[], isStub }` |
| `getActivityRecords(userId, activityId, signal?)` | `{ activity: ActivitySummary, records: ActivityRecord[], isStub }` |
| `getActivityBookmarks(userId, signal?)` | `{ activityIds: string[], isStub }` |
| `setActivityBookmarked(userId, activityId, bookmarked)` | `{ activityId, bookmarked, isStub }` |

Replace implementations with validated `callApi` responses, preserving the contracts and cancellation behavior. Quest descriptions and suggested venue/resource options are fixtures, not AI output or live recommendations. Dates, ratings, photos and feedback in completion records come from the user. The user ID is a preview partition key, never authorization; real responses must be scoped to the authenticated user. `completedOn` is an ISO date-only string, records sort newest first, and ratings are 1–5.

Activity saves and quest saves have separate stores and API contracts. Saving an activity does not save any child quests, and removing an activity save does not remove saved quests or completed records. Both preview stores reset on reload. The shared quest fixtures preserve previous Home quest IDs; Bookstore now belongs to Arts & Culture to match the reviewed catalog.

The same user records drive Explore counts/colour, Home's distinct-activity totals and Profile statistics. New users have no completed records. Memories derives from photos attached through the completion flow; illustrative records are kept only in test fixtures. Other catalog entries can have zero quests or records, and the UI supports both empty states. Search filters the loaded catalog locally, including case/accent-insensitive matches.

### Development failure previews

Use `?stubError=catalog` on `/explore`, `?stubError=activity` on an activity route, `?stubError=records` on its records route, or `?stubError=activity-bookmark` on an activity route. Each selected operation fails once per document load; retry succeeds. These simulations are disabled in production. Catalog failures do not block Home, and Home failures do not block catalog browsing.

Additional `TODO(asset)` slots cover activity hero scenes and completion photos. Location pins, five rating faces and the catalog Search/Close icons are connected. Rating faces follow the nearest score on the 1–5 scale; the exact numeric rating remains visible.

## Profile services

`src/services/profile-service.ts` provides these preview contracts:

| Function | Result |
| --- | --- |
| `getProfile(userId, signal?)` | `{ profile, stats, isStub }` |
| `updateProfileDetails(userId, { name, handle, bio }, signal?)` | `{ profile, isStub }` |
| `updateProfileInterests(userId, interestIds, signal?)` | `{ profile, isStub }` |
| `updatePersonalisation(userId, text, signal?)` | `{ profile, isStub }` |

`profile` contains `id`, `name`, `handle` (without @), `bio`, `interestIds`, and `personalisation`. `stats` contains `completedQuests`, `activitiesTried`, `categoriesExplored`, and `categories: { id, count }[]`. Stats derive from shared user completion records, independent of selected interests. All results currently have `isStub: true`.

Profile edits require a trimmed name of 1–100 characters, an optional username of up to 30 letters/numbers/underscores, and a bio of up to 160 characters. Interest saves replace the full category selection and require at least one valid category. The nine options match Questionnaire, including `other`; no specific activities are submitted. Agree on the backend mapping for these IDs. Personalisation is optional, up to 500 characters, and an empty string clears it. No AI runs in this preview.

Changes are scoped by user ID and saved under `nowidea.profile-preview.v1:<userId>` in this tab's sessionStorage. Failed storage writes fall back to memory. Only successful service results update the saved profile. Unsaved edits stay in the editor; aborted requests do not commit. Registration seeds its chosen interests, while returning sign-in preserves any existing preview preferences. Neither passwords nor email addresses are stored in the profile preview. Updating the name also updates the display-only profile used by Home and chat.

TODO(backend): Replace these functions with validated API calls and return the confirmed profile. Profile identity is not authentication. Account security, avatar upload, notifications, language and appearance changes are not implemented; their settings sheets state their current limitations.

`signOut(signal?)` in `auth-service.ts` returns `{ isStub: true }` after clearing only the active display profile. It does not invalidate a server session or delete user data. Replace it with the agreed real logout flow when authentication exists.

Development failure previews: `?stubError=profile`, `profile-save`, `interests-save`, `personalisation-save`, or `sign-out` on the relevant page. Each operation fails once per page load; retry succeeds. These simulations are disabled in production.

## Quest completion services

`src/types/quest.ts` defines the detail, attempt and draft contracts. `src/services/quest-service.ts` provides:

| Function | Result |
| --- | --- |
| `getQuestDetail(userId, questId, signal?)` | `{ quest: QuestDetail, isStub }` |
| `startQuest(userId, questId, signal?)` | `{ quest, attempt, isStub }`; resumes an unfinished attempt |
| `getQuestAttempt(userId, questId, attemptId, signal?)` | `{ quest, attempt, isStub }` |
| `saveQuestDraft(userId, questId, attemptId, draft, nextStep, signal?)` | Confirmed `QuestAttempt` |
| `completeQuest(userId, questId, attemptId, draft, signal?)` | `{ record: ActivityRecord, isStub }` |
| `getQuestCompletion(userId, questId, recordId, signal?)` | `{ record, isStub }` |

`QuestDetail` extends `Quest` with `about`, `goal`, `difficulty` (Easy / Adventure / Challenge), `difficultyDescription` and `options`. Options contain `id`, `kind` (in-person / online / idea), `title`, `location`, `description`, `booking` and nullable `imageUrl`. Current options are examples, not verified venue recommendations.

`QuestAttempt` contains `id`, `questId`, `startedAt`, `status`, `step` (0–3), `draft` and optional `recordId`. `QuestDraft` contains `optionId` (or `manual`), `manualVenue`, `completedOn`, optional `startTime`/`endTime`, `notes`, `photos`, `photoComment`, required-at-submit `activityRating`/`venueRating`, optional `recommendation`/`expectations`, `likedMost` and `tips`. Ratings and optional numeric answers use integer values 1–5; unanswered optional values are null. Notes/comments/feedback are limited to 300 characters; manual option names to 120.

Dates use `YYYY-MM-DD` in the user's local calendar and cannot be in the future. Optional times use `HH:mm` on the same day; either both are absent or end is later than start. Recorded duration derives from entered times; otherwise it is `Time not recorded`, never the quest's estimate.

The preview commits the record and attempt status in one IndexedDB transaction. The attempt ID is the idempotency key: repeated/concurrent submissions return the existing record. Repeating the quest deliberately starts a new attempt. Cancelled, failed or invalid requests do not alter statistics. Backend integration must enforce ownership using authentication.

Photos are local data URLs in this preview, at most three JPG/PNG files of 10 MB each. Replace them with a media-upload service and return IDs/URLs before completion. No photos are sent off-device. Store media once and reference it from records/drafts in the real backend. Browser storage errors surface instead of falling back to a fake success.

Home, Explore and Profile read the same saved records via `readActivityRecords`. Counts start at zero. A completion increments completed quest count; activities and categories are counted distinctly. Submission invalidates Home/Explore data, and record/Profile screens fetch fresh results on navigation. Test fixture records live in `tests/discovery-records.ts` only.

The optional personalised tip, real booking/resource links, editing/deleting completed records and a separate in-progress quest dashboard are outside this flow. Resume a draft by opening the same quest and selecting Start Quest. English `TODO(asset)` comments reserve missing hero, venue, optional question and celebration artwork.
