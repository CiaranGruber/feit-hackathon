# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Getting started

Use Node.js 20.19+ (20.x) or 22.12+ and npm. From the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite (by default `http://localhost:6485`). 

## Commands

| Command           | Purpose                                           |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | Start the development server with hot reload      |
| `npm run build`   | Check TypeScript and build into `dist/`           |
| `npm run lint`    | Run Oxlint                                        |
| `npm test`        | Check service contracts (Node 22.18+ or 24)       |
| `npm run preview` | Serve the production build locally after building |

## Onboarding preview

The onboarding and sign-in screens use a 390px design width, shrink to fit narrower screens, and are centered on desktop. Playfair Display and Nunito are bundled locally. All routes share one fixed-height frame: the small viewport height on mobile, and up to 844px on desktop.

| Route | Screen |
| --- | --- |
| `/` (or `/welcome`) | Welcome |
| `/intro` | Introduction |
| `/questionnaire` | Activity interests |
| `/create-account` | Registration |
| `/sign-in` | Returning-user sign-in |

Start Exploring leads to the introduction, then the questionnaire and registration. The back buttons return to the previous step. The questionnaire allows multiple selections and requires at least one. Interest IDs are saved in this tab's `sessionStorage`, so they survive back navigation and refresh. Registration includes client-side validation and a password visibility toggle. Successful preview registration opens Home and keeps a display-only ID, name, and preview status in this tab. No passwords or authentication credentials are stored.

Welcome's "I have an account" link opens the sign-in page. Registration and sign-in share `src/components/onboarding/account-form.tsx` for matching styles. Sign-in uses email and password, without a name field or onboarding progress indicator. It includes validation, a password visibility toggle, and pending/error states. "Create an account" takes new users to the introduction and questionnaire.

Registration, email sign-in, and Google/Apple sign-in call typed asynchronous stubs in `src/services/auth-service.ts`. Email sign-in opens the fictional Carol profile without verifying credentials. Registration passes the questionnaire's selected interest IDs; returning-user sign-in does not submit this draft. Integration points have English `TODO` comments. `/sign-in?stubError=sign-in` simulates one failed email sign-in attempt in development so retry can be checked.

## Home preview

Open `/home` directly to preview Carol's example dashboard, or complete the registration preview to use the entered name. The Home screen includes horizontally scrolling recommendations, bookmarks, a category breakdown of your saved progress, and a companion chat sheet. Activity cards display duration and estimated cost. Click the companion to open chat; quick prompts, custom messages, waiting, and retry states are supported with local stub responses.

The fixed navigation uses Home / Explore / My Quests / Profile with the supplied home, search, flag, and person SVG icons. Icons inherit the active link colour; nested routes keep their parent selected. `/my-quests` separates saved activity types from saved quests. Home's See all and progress details open working views; quest cards open the full quest detail page. Quest bookmarks are shared across Home, Explore, and My Quests in memory and reset on reload.

Onboarding and main routes share `src/components/phone-frame.tsx`, keeping the canvas size stable while content scrolls independently. The chat sheet supports Escape, keyboard focus cycling, and reduced-motion artwork.

## Explore preview

The reviewed catalog contains 8 categories and 124 activity types. Outdoor has 12 types; each other category has 16. The data follows `catalog-icons-reviewed`, including Hiking/Cycling under Outdoor and Bookstore under Arts & Culture. The questionnaire's existing Other preference is unchanged and is not an Explore category.

| Route | Screen |
| --- | --- |
| `/explore` | Categories; Search filters activity and category names |
| `/explore/sports` | Activity types in a category |
| `/explore/sports/ice-skating` | Activity overview, related quests, and activity save |
| `/explore/sports/ice-skating/records` | Read-only completed quests and Memories |
| `/my-quests` | Saved Activities; `?tab=quests` shows saved Quests |

Only activity types with saved completed records have coloured grid icons; grey items remain clickable. New preview users start with zero completions. Details are available for every catalog entry, and entries without quests or records have empty states. Hero and quest artwork stays blank until supplied; record photos come from the completion flow.

The activity-page heart saves the activity type only. Related quests open the full quest detail and completion flow with independent quest bookmarks. Memories displays uploaded completion photos. Editing/deleting completed records remains outside this version.

Requests live in `src/services/explore-service.ts`. Types in `src/types/discovery.ts` separate `ActivityType`, `Quest`, and `ActivityRecord`. See the backend stub notes below for contracts and failure-preview URLs.

## Quest detail and completion

| Route | Screen |
| --- | --- |
| `/quests/:questId` | Goal, difficulty, example venue/online options, bookmark and Start Quest |
| `/quests/:questId/complete/:attemptId` | Option → details → optional photos → experience |
| `/quests/:questId/completed/:recordId` | Confirmation, updated statistics and link to the new record |

Home, My Quests and Explore quest cards open the detail page. Start Quest resumes an unfinished attempt or creates a new one. Each Next saves the current draft step, so it survives refresh. Edits before continuing are not saved. Bottom navigation is hidden during this flow to match the design.

Completion supports a listed or manually entered place/resource, a non-future date, optional start/end times on the same day, notes, up to three optional JPG/PNG photos (10 MB each), a photo comment, two required 1–5 ratings and optional recommendation/expectation scores and feedback. Photos are decoded before preview. Invalid input and failed submissions retain the form; retrying the same attempt does not create duplicates.

`src/services/quest-service.ts` isolates backend integration. Drafts, records and photos are saved per user ID in IndexedDB (`nowidea-quest-preview-v1`). No upload or API call occurs. Storage failures report errors instead of claiming success. Clearing site data removes preview history. Authentication remains a stub.

Only submission updates records, Memories, coloured activity icons, Home's category chart and Profile statistics. Repeating an activity adds a completion without inflating distinct activity/category counts. Venue options are illustrative; no booking availability or resource URLs are fabricated.

Development failures: `?stubError=quest`, `quest-start`, `quest-draft`, or `quest-complete` on the appropriate quest URL. Each fails once per page load and supports retry.

## Profile preview

| Route | Screen |
| --- | --- |
| `/profile` | Profile overview, progress and discovery journey |
| `/profile/interests` | The same nine category choices as Questionnaire; no activity subcategories |
| `/profile/personalisation` | Optional 500-character preference note and example prompts |
| `/profile/settings` | Settings groups and preview logout |
| `/profile/edit` | Name, optional username and bio |

Profile changes are saved through typed service stubs to this tab's `sessionStorage`, scoped by preview user ID, with an in-memory fallback. Registration seeds the selected interests; subsequent profile edits remain separate from the onboarding draft. Saves have pending, success and retryable error states. Leaving an editor without saving discards its draft, and leaving during a pending save cancels the preview request. Edited names are reflected in Home and companion greetings.

Progress uses the same saved user records as Home and Explore: completed quests, distinct activities tried, and distinct categories explored. Selecting an interest does not mark an activity as completed. Personalisation summaries reflect explicitly selected categories only; there is no AI inference or live recommendation update.

Edit Profile and preview logout work. Avatar uploads, email/password changes, notification controls, language and appearance switching are not connected; their settings rows open explanatory sheets. Legal pages remain placeholders. Logout clears the active preview identity and returns to Welcome; per-user preview preferences remain in the tab. Real authentication remains outside this version.

Chat uses the supplied close and upward-arrow Send icons. Icon-only buttons retain accessible labels and touch targets. All bottom sheets share the close icon.

Profile settings, Home's bookmark heading, and record location/rating icons use local Material Symbols Outlined SVGs in `src/assets/`, downloaded from [Google Fonts](https://fonts.google.com/icons) under the [Apache 2.0 license](https://www.apache.org/licenses/LICENSE-2.0.html). Explore reuses the supplied search/close icons. No external icon font is loaded.

### Backend integration stubs

See [the service contracts and integration notes](docs/backend-stubs.md) for inputs, return objects, and the scope of the stubs. 


Search `TODO(asset)` for the empty asset slots:

| Location | Missing asset | Display size |
| --- | --- | --- |
| `src/pages/welcome.tsx` | Final brand logo | 280 x 76px |
| `src/pages/home.tsx` | Home wordmark | 150 x 40px |
| `src/components/home/activity-card.tsx` | Activity scene covers | Responsive card cover |
| `src/pages/profile.tsx` | Profile banner, avatar, journey illustration | Reserved empty slots |
| `src/pages/profile-personalisation.tsx` | Companion writing in a journal | Reserved empty slot |
| `src/pages/profile-settings.tsx` | Avatar upload artwork | Reserved empty slot |
| `src/pages/explore-activity.tsx`, `explore-records.tsx` | Activity hero scenes and completion/memory photos | Reserved empty slots |

Colors and font tokens are in `src/index.css`. The layout, progress header, and button styles are in `src/components/onboarding/`.

## Styling with Tailwind

Tailwind is integrated through `@tailwindcss/vite` in `vite.config.ts` and `@import "tailwindcss"` in `src/index.css`.

```tsx
<button className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-500">
  Save
</button>

```

## Project structure
* `src/main.tsx`: React entry point and global stylesheet.
* `src/App.tsx`: route definitions.
* `src/pages/`: page components and optional page styles.
* `src/services/`: domain services and the shared API helper.
* `vite.config.ts`: development/build configuration and public app settings.
