export type SocialProvider = 'google' | 'apple'

export type RegisterAccountInput = {
  name: string
  email: string
  password: string
  interestIds: readonly string[]
}

export type SocialSignInInput = {
  provider: SocialProvider
  interestIds: readonly string[]
}

export type AuthUser = {
  id: string
  name: string
  email: string | null
  interestIds: string[]
}

export type AuthResult = {
  user: AuthUser
  // Frontend metadata, not a required backend response field.
  // Real integrations must set this to false after successful authentication.
  isStub: boolean
}

/**
 * Preview-only registration stub. It performs no network request or persistence.
 * TODO(backend): Agree on the request/response fields with the backend team,
 * then use callApi from ./api.ts and map its response to AuthResult.
 * Preserve this async contract and throw a user-safe Error on failure.
 * Never return, store, or log the password; only a real registration request
 * should send it to the backend. The returned stub ID is not a real account ID.
 */
export async function registerAccount(input: RegisterAccountInput): Promise<AuthResult> {
  return {
    isStub: true,
    user: {
      id: 'stub-email-user',
      name: input.name.trim(),
      email: input.email.trim(),
      interestIds: [...input.interestIds],
    },
  }
}

/**
 * Preview-only social sign-in stub. No provider window or authenticated session
 * is opened, and the returned identity is fictional.
 * TODO(backend): Implement provider authorization and the backend credential
 * exchange, then return AuthResult with isStub: false. A provider name alone
 * is not proof of identity. Use callApi for backend requests and surface
 * cancellation/failure as a user-safe Error. Apply interestIds after sign-in.
 */
export async function signInWithProvider(input: SocialSignInInput): Promise<AuthResult> {
  const providerName = input.provider === 'google' ? 'Google' : 'Apple'

  return {
    isStub: true,
    user: {
      id: `stub-${input.provider}-user`,
      name: `${providerName} Preview User`,
      // Real providers may not return an email on every sign-in.
      email: null,
      interestIds: [...input.interestIds],
    },
  }
}
