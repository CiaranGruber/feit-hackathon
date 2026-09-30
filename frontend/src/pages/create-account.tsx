import { useId, useRef, useState, type FormEvent } from 'react'
import googleLogo from '../assets/google-logo.png'
import appleLogo from '../assets/apple-logo.png'
import { ArrowRight } from '../components/onboarding/arrow-right.tsx'
import { OnboardingHeader } from '../components/onboarding/header.tsx'
import { focusClasses, headingClasses, noticeClasses, pageClasses, primaryActionClasses } from '../components/onboarding/styles.ts'
import { readInterestDraft } from '../data/onboarding-draft.ts'
import { registerAccount, signInWithProvider, type AuthResult, type SocialProvider } from '../services/auth-service.ts'

type FieldName = 'name' | 'email' | 'password'
type FieldErrors = Partial<Record<FieldName, string>>

const inputClasses = 'mt-2 h-[52px] w-full rounded-[10px] border border-line bg-transparent px-4 text-[16px] text-ink shadow-[inset_0_1px_3px_#47372f03] outline-none transition-colors placeholder:text-muted/70 focus:border-primary-dark focus:ring-2 focus:ring-primary/20 aria-invalid:border-error aria-invalid:focus:ring-error/15'

export function CreateAccount() {
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [notice, setNotice] = useState('')
  const [pendingAction, setPendingAction] = useState<'register' | SocialProvider | null>(null)
  const isSubmitting = pendingAction !== null

  function showAuthResult(result: AuthResult) {
    const count = result.user.interestIds.length
    if (result.isStub) {
      setNotice(`Preview only: received a simulated profile for ${result.user.name} with ${count} ${count === 1 ? 'interest' : 'interests'}. No account was created or signed in.`)
      return
    }

    // TODO: Navigate to the post-onboarding screen once that route is available.
    setNotice(`You're signed in as ${result.user.name}.`)
  }

  function updateField(field: FieldName, value: string) {
    setValues(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined }))
    setNotice('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setNotice('')

    const nextErrors: FieldErrors = {}
    if (!values.name.trim()) nextErrors.name = 'Please enter your name.'
    if (!values.email.trim()) {
      nextErrors.email = 'Please enter your email address.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.'
    }
    if (values.password.length < 8) {
      nextErrors.password = 'Use at least 8 characters for your password.'
    }
    setErrors(nextErrors)

    const firstInvalidField = (['name', 'email', 'password'] as const)
      .find(field => nextErrors[field])
    if (firstInvalidField) {
      const input = formRef.current?.elements.namedItem(firstInvalidField)
      if (input instanceof HTMLInputElement) input.focus()
      return
    }

    setPendingAction('register')
    try {
      // Pass the questionnaire draft through the service contract for integration.
      const result = await registerAccount({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        interestIds: readInterestDraft(),
      })
      showAuthResult(result)
      setValues(current => ({ ...current, password: '' }))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to create your account. Please try again.')
    } finally {
      setPendingAction(null)
    }
  }

  async function handleSocialSignIn(provider: SocialProvider) {
    if (isSubmitting) return
    setNotice('')
    setPendingAction(provider)
    try {
      const result = await signInWithProvider({ provider, interestIds: readInterestDraft() })
      showAuthResult(result)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to sign in. Please try again.')
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <section aria-labelledby={`${id}-title`} className={pageClasses}>
      <title>Create your account</title>
      <OnboardingHeader step={3} backTo="/questionnaire" backLabel="Back to your interests" />

      <div className="mt-12 text-center">
        <h1 id={`${id}-title`} className={headingClasses}>
          Create your account
        </h1>
        <p className="mx-auto mt-4 max-w-[290px] text-[16px] leading-6 text-ink/85">
          Save your preferences and get<br className="hidden min-[350px]:block" /> personalised ideas.
        </p>
      </div>

      <form ref={formRef} noValidate onSubmit={handleSubmit} aria-busy={pendingAction === 'register'} className="mt-9">
        <fieldset disabled={isSubmitting} className="space-y-5">
          <div>
            <label htmlFor={`${id}-name`} className="block text-[14px] leading-5 font-semibold">Name</label>
            <input
              id={`${id}-name`}
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              required
              maxLength={100}
              value={values.name}
              onChange={event => updateField('name', event.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? `${id}-name-error` : undefined}
              className={inputClasses}
            />
            {errors.name && <p id={`${id}-name-error`} className="mt-2 text-[13px] leading-5 text-error">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor={`${id}-email`} className="block text-[14px] leading-5 font-semibold">Email</label>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="you@example.com"
              required
              maxLength={254}
              value={values.email}
              onChange={event => updateField('email', event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${id}-email-error` : undefined}
              className={inputClasses}
            />
            {errors.email && <p id={`${id}-email-error`} className="mt-2 text-[13px] leading-5 text-error">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor={`${id}-password`} className="block text-[14px] leading-5 font-semibold">Password</label>
            <div className="relative">
              <input
                id={`${id}-password`}
                name="password"
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                required
                minLength={8}
                value={values.password}
                onChange={event => updateField('password', event.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? `${id}-password-error` : undefined}
                className={`${inputClasses} pr-14`}
              />
              <button
                type="button"
                aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                aria-controls={`${id}-password`}
                onClick={() => setPasswordVisible(current => !current)}
                className={`absolute right-1 bottom-1 flex size-11 cursor-pointer items-center justify-center rounded-[8px] text-muted transition-colors hover:bg-cream hover:text-ink ${focusClasses}`}
              >
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  {passwordVisible && <path d="m3 3 18 18" />}
                </svg>
              </button>
            </div>
            {errors.password && <p id={`${id}-password-error`} className="mt-2 text-[13px] leading-5 text-error">{errors.password}</p>}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`mt-7 ${primaryActionClasses}`}
        >
          {pendingAction === 'register' ? 'Creating account…' : 'Create account'}
          <ArrowRight />
        </button>
      </form>

      <div className="my-4 flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-linear-to-r from-transparent to-[#EBD8AF]" />
        <span className="text-[14px] leading-5">or</span>
        <span className="h-px flex-1 bg-linear-to-l from-transparent to-[#EBD8AF]" />
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleSocialSignIn('google')}
          disabled={isSubmitting}
          aria-busy={pendingAction === 'google'}
          className={`flex h-[52px] w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-line/55 bg-white text-[16px] font-semibold shadow-[0_3px_7px_#47372f05] transition-shadow enabled:hover:shadow-[0_3px_10px_#47372f12] disabled:cursor-wait disabled:opacity-60 ${focusClasses}`}
        >
          <img src={googleLogo} alt="" width="20" height="20" className="size-5 shrink-0 object-contain" />
          {pendingAction === 'google' ? 'Connecting…' : 'Continue with Google'}
        </button>
        <button
          type="button"
          onClick={() => handleSocialSignIn('apple')}
          disabled={isSubmitting}
          aria-busy={pendingAction === 'apple'}
          className={`flex h-[52px] w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-line/55 bg-white text-[16px] font-semibold shadow-[0_3px_7px_#47372f05] transition-shadow enabled:hover:shadow-[0_3px_10px_#47372f12] disabled:cursor-wait disabled:opacity-60 ${focusClasses}`}
        >
          {/* Apple's official image includes padding; keep the visible glyph near 20px. */}
          <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center">
            <img src={appleLogo} alt="" width="44" height="44" className="size-11 max-w-none shrink-0 object-contain" />
          </span>
          {pendingAction === 'apple' ? 'Connecting…' : 'Continue with Apple'}
        </button>
      </div>

      <footer className="mx-auto mt-6 max-w-[310px] text-center text-[13px] leading-[21px] text-muted">
        <p>
          By creating an account, you agree to our<br />
          {/* TODO: Replace these buttons with links when the legal pages are available. */}
          <button type="button" onClick={() => setNotice('The Terms of Service will be available before registration opens.')} className={`cursor-pointer rounded-sm underline decoration-muted/60 underline-offset-2 hover:text-ink ${focusClasses}`}>
            Terms of Service
          </button>
          {' and '}
          <button type="button" onClick={() => setNotice('The Privacy Policy will be available before registration opens.')} className={`cursor-pointer rounded-sm underline decoration-muted/60 underline-offset-2 hover:text-ink ${focusClasses}`}>
            Privacy Policy
          </button>.
        </p>
      </footer>

      <div role="status" aria-live="polite" aria-atomic="true">
        {notice && <p className={noticeClasses}>{notice}</p>}
      </div>
    </section>
  )
}
