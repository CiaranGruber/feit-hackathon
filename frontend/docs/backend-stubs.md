# Onboarding service stubs

Current screens need email registration and social sign-in. Both entry points live in `src/services/auth-service.ts` and return Promises, so the UI already handles asynchronous results, pending states, and errors. They currently perform no network requests or persistence.

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

### `signInWithProvider(input)`

```ts
type SocialSignInInput = {
  provider: 'google' | 'apple'
  interestIds: readonly string[]
}

```

## Shared result

Both services return `Promise<AuthResult>`:

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
* `user.name`: the entered name for registration, or a fictional provider user name for social sign-in.
* `user.email`: a string or `null`; a provider may not return an email each time.
* `user.interestIds`: category IDs from the questionnaire, never display labels or artwork URLs. An empty array is possible when opening registration directly.
* `isStub`: frontend-only metadata that keeps preview results visibly distinct from real authentication. It is not a required backend JSON field. Set it to `false` only after real authentication succeeds.

## Questionnaire draft

`src/data/onboarding-draft.ts` shares the selected IDs between the questionnaire and registration. It uses `sessionStorage` with an in-memory fallback when storage is unavailable; only category IDs are saved. A memory-only draft does not survive reloads.

Because like the visitor has no account yet, clicking Next only saves a local draft. Registration or social sign-in passes that draft to the service. Integration can persist preferences as part of registration or through a separate request after authentication, without making the page coordinate backend endpoints. 

## Replacing the stubs

1. Agree on the inputs and user fields, including how `name` maps to its user model and how interest IDs are persisted.
2. Replace the implementations using `callApi` from `src/services/api.ts`. Keep HTTP calls, response validation, and field mapping inside services.
3. Check `result.ok`, validate the response, and throw an `Error` with a user-facing message for failures. Pages catch these errors and restore the submission buttons so the user can retry.
4. Return the same `AuthResult` shape with `isStub: false`. Do not fabricate a successful result when a real request fails.
5. Connect the post-authentication destination once that page exists. Until then, the registration page displays the returned user's name in a notice.


