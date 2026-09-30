import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from '../components/onboarding/arrow-right.tsx'
import { OnboardingHeader } from '../components/onboarding/header.tsx'
import { headingClasses, pageClasses, primaryActionClasses } from '../components/onboarding/styles.ts'
import { InterestPicker } from '../components/onboarding/interest-picker.tsx'
import { readInterestDraft, saveInterestDraft } from '../data/onboarding-draft.ts'

export function Questionnaire() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string[]>(readInterestDraft)

  useEffect(() => {
    // Keep a local draft until registration or social sign-in submits these IDs.
    saveInterestDraft(selected)
  }, [selected])

  function toggleInterest(id: string) {
    setSelected(current => current.includes(id)
      ? current.filter(value => value !== id)
      : [...current, id])
  }

  function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selected.length > 0) {
      saveInterestDraft(selected)
      navigate('/create-account')
    }
  }

  return (
    <section aria-labelledby="questionnaire-title" className={pageClasses}>
      <title>Your interests</title>
      <OnboardingHeader step={2} backTo="/intro" backLabel="Back to introduction" />

      <div className="mt-12 text-center">
        <h1 id="questionnaire-title" className={headingClasses}>
          What activities<br /> do you enjoy?
        </h1>
        <p id="questionnaire-hint" className="mt-4 text-[16px] leading-6 text-ink/85">Select a few to get started.</p>
      </div>

      <form onSubmit={handleContinue} className="mt-7 flex flex-1 flex-col">
        <InterestPicker selected={selected} onToggle={toggleInterest} hintId="questionnaire-hint" />

        <div className="mt-auto pt-6">
          <p role="status" aria-live="polite" aria-atomic="true" className="mb-4 min-h-5 text-center text-[13px] leading-5 text-muted">
            {selected.length === 0 ? 'Choose at least one to continue.' : `${selected.length} ${selected.length === 1 ? 'interest' : 'interests'} selected`}
          </p>
          <button type="submit" disabled={selected.length === 0} className={primaryActionClasses}>
            Next <ArrowRight />
          </button>
        </div>
      </form>
    </section>
  )
}
