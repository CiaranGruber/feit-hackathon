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

## Styling with Tailwind

Tailwind is integrated through `@tailwindcss/vite` in `vite.config.ts` and `@import "tailwindcss"` in `src/index.css`. Add utility classes directly to React components:

```tsx
<button className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-500">
  Save
</button>
```

## Project structure

- `src/main.tsx`: React entry point and global stylesheet.
- `src/App.tsx`: route definitions.
- `src/pages/`: page components and optional page styles.
- `src/services/`: domain services and the shared API helper.
- `vite.config.ts`: development/build configuration and public app settings.

The React Compiler is not enabled.
