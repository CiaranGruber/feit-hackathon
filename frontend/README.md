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
| `npm run preview` | Serve the production build locally after building |

## Onboarding preview

The four screens use a 390px design width, shrink to fit narrower screens, and are centered on desktop. Playfair Display and Nunito are bundled locally. All routes share one fixed-height frame: the small viewport height on mobile, and up to 844px on desktop. 

| Route | Screen |
| --- | --- |
| `/` (or `/welcome`) | Welcome |
| `/intro` | Introduction |
| `/questionnaire` | Activity interests |
| `/create-account` | Registration |

Start Exploring leads to the introduction, then the questionnaire and registration. The back buttons return to the previous step. The questionnaire allows multiple selections and requires at least one. Only interest IDs are saved in this tab's `sessionStorage`, so they survive back navigation and refresh. Registration includes client-side validation and a password visibility toggle.

Registration and Google/Apple sign-in call typed asynchronous stubs in `src/services/auth-service.ts`. They return simulated user objects, including the questionnaire's selected interest IDs.  Integration points have English `TODO` comments.

### Backend integration stubs

See [the service contracts and integration notes](docs/backend-stubs.md) for inputs, return objects, and the scope of the stubs. 


Search `TODO(asset)` for the empty asset slots:

| Location | Missing asset | Display size |
| --- | --- | --- |
| `src/pages/welcome.tsx` | Final brand logo | 280 x 76px |

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


