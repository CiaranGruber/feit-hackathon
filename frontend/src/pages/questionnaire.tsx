import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from '../components/onboarding/arrow-right.tsx'
import { OnboardingHeader } from '../components/onboarding/header.tsx'
import { headingClasses, pageClasses, primaryActionClasses } from '../components/onboarding/styles.ts'
import { interestOptions } from '../data/interests.ts'
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
        <fieldset aria-describedby="questionnaire-hint" className="grid grid-cols-3 gap-3 max-[359px]:gap-2">
          <legend className="sr-only">Choose at least one activity you enjoy</legend>
          {interestOptions.map(option => {
            const isSelected = selected.includes(option.id)
            return (
              <label
                key={option.id}
                className={`relative flex min-h-[130px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[14px] border px-1.5 py-5 text-center shadow-[0_2px_5px_#47372f04] transition-colors focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-primary-dark ${isSelected ? 'border-primary-dark bg-cream/80 shadow-[0_2px_8px_#e9903214]' : 'border-line/65 bg-canvas hover:border-primary/75 hover:bg-cream/35'}`}
              >
                <input
                  type="checkbox"
                  name="interests"
                  value={option.id}
                  checked={isSelected}
                  onChange={() => toggleInterest(option.id)}
                  className="absolute top-2 right-2 size-4 cursor-pointer accent-primary-dark opacity-0 checked:opacity-100 focus-visible:opacity-100"
                />
                <img src={option.icon} alt="" width="44" height="44" className="size-11 shrink-0 object-contain" />
                <span className="flex min-h-9 items-center text-[12px] leading-[17px] font-semibold">{option.label}</span>
              </label>
            )
          })}
        </fieldset>

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
