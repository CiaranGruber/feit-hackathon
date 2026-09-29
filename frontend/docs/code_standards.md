# Coding Standards

This document describes the main conventions for extending the frontend.

---

## Calling backend endpoints

Do not call `fetch` directly from pages. Use the shared API helper and domain services.

### Layers

| Layer | Responsibility |
|---|---|
| `src/pages/*` | UI and user interaction |
| `src/services/*` | Domain API calls (one concern per file) |
| `src/services/api.ts` | Low-level HTTP helper (`callApi`) |

### 1. Add a service function

Create or extend a module under `src/services/`. Call `callApi` with a path relative to `backendUrl` (from `__APP_CONFIG__`).

```typescript
import { callApi } from "./api.ts"

export async function getHello(): Promise<string> {
  const result = await callApi("/")
  if (!result.ok) {
    throw new Error(`GET / failed (${result.status})`)
  }
  return result.body.message as string
}
```

`callApi` signature:

```typescript
callApi(
  path: string,
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  body?: unknown,
  api_key?: string,
): Promise<ApiCallResult>
```

- Relative paths (e.g. `/user/{id}`) are resolved against `__APP_CONFIG__.backendUrl`.
- Absolute `http://` / `https://` URLs are used as-is.
- Pass `api_key` when the backend route requires the `x-api-key` header.
- Provide `body` for JSON request bodies (sent as `application/json`).

### 2. Use the service from a page

```typescript
import { getHello } from "../services/random-service.ts"

const message = await getHello()
```

### Guidelines

- Check `result.ok` / `result.status` in the service and throw or return a typed error; keep pages free of raw status handling where practical.
- Keep response shape assumptions inside the service (narrow `result.body` there).
- Prefer one service file per backend domain (users, auth, etc.) rather than dumping everything into `api.ts`.

---

## Adding new pages

Pages are React components under `src/pages/`, wired through React Router in `src/App.tsx`.

### 1. Create the page component

Add a file such as `src/pages/about.tsx`:

```typescript
export function About() {
  return (
    <section>
      <h1>About</h1>
    </section>
  )
}
```

Optional page-specific styles can live beside the component (e.g. `about.css`).

### 2. Register the route

Import the page in `src/App.tsx` and add a `<Route>`:

```typescript
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Home } from "./pages/home.tsx"
import { About } from "./pages/about.tsx"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- Use `index` for the home route (`/`).
- Use `path="..."` for other routes (e.g. `/about`).
- Nest routes under a layout route when shared chrome (nav, shell) is needed.

### Guidelines

- Keep routing configuration in `App.tsx`; keep page UI in `src/pages/`.
- Fetch data via services, not inline `fetch` / `callApi` in the page when the call is reusable.
- Export a named page component (e.g. `Home`, `About`) for clear imports.

---

## Adding configuration items

Configuration is loaded from `config.toml` at build/dev time in `vite.config.ts`. Values are split into **private** (server/Vite only) and **public** (baked into the client).

### Private vs public

| Kind | Stored on | Visible to clients? | Examples |
|---|---|---|---|
| Private | `AppConfig` (top level) | No | `port`, `logLevel` |
| Public | `AppConfig.public` / `__APP_CONFIG__` | Yes | `backendUrl` |

Never put secrets in `PublicConfig` or `__APP_CONFIG__`. Anything under `public` is embedded in the client bundle.

### 1. Extend the typed interfaces

In `vite.config.ts`:

```typescript
interface PublicConfig {
  backendUrl: string
  // featureName: string  // public example
}

interface AppConfig {
  port: number
  logLevel: LogLevel
  // adminToken: string  // private example — do not put on `public`
  public: PublicConfig
}
```

### 2. Validate and assign in `compileConfig`

Use `asType` + `validate` (and helpers such as `isURL` / `toLogLevel` where needed):

```typescript
const featureName = validate(
  asType(raw.featureName, ""),
  x => x.length > 0,
  "default-feature",
)
```

- **Private:** set on the returned `AppConfig` object (alongside `port` / `logLevel`).
- **Public:** set under `public: { ... }` so it is included in `__APP_CONFIG__`.

Wire private options into Vite where relevant (e.g. `server.port`, `logLevel`).

### 3. Update client types for public options

If the option is public, keep `src/vite.env.d.ts` in sync with `PublicConfig`:

```typescript
declare const __APP_CONFIG__: {
  backendUrl: string
  // featureName: string
}
```

Read public config in application code via `__APP_CONFIG__` (see `api.ts` for `backendUrl`).

### 4. Document in `config.toml.example`

Add a commented entry. Keep public options under the public section; keep private options above it:

```toml
#port = 6485
#logLevel = "info"

# -------------------------------------
# Public Configuration Options
# -------------------------------------
#backendUrl = "http://localhost:6486"
#featureName = "default-feature"
```

### Guidelines

- Config file path defaults to `./config.toml`, or `NO_IDEA_FE_CONFIG` when set.
- Public and private shapes must stay aligned: `PublicConfig`, the `public` object returned from `compileConfig`, `__APP_CONFIG__` in `define`, and `vite.env.d.ts`.
- Prefer failing closed for required secrets/URLs (`defaultValue` of `null` on `validate` raises `RangeError`).
