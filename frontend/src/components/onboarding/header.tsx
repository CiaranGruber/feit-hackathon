import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { focusClasses } from './styles.ts'

const steps = ['Introduction', 'Your interests', 'Create your account']

type OnboardingHeaderProps = {
  step: 1 | 2 | 3
  backTo: string
  backLabel: string
}

export function OnboardingHeader({ step, backTo, backLabel }: OnboardingHeaderProps) {
  return (
    <header className="relative flex h-11 shrink-0 items-center justify-center">
      <Link
        to={backTo}
        aria-label={backLabel}
        className={`absolute -left-3 flex size-11 items-center justify-center rounded-full transition-colors hover:bg-cream ${focusClasses}`}
      >
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m14 5-7 7 7 7" />
        </svg>
      </Link>

      <div
        role="progressbar"
        aria-label="Account setup"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={step}
        aria-valuetext={`Step ${step} of 3: ${steps[step - 1]}`}
        className="flex items-center gap-[5px]"
      >
        {steps.map((label, index) => (
          <Fragment key={label}>
            {index > 0 && <span className={`h-[2px] w-[39px] rounded-full ${index < step ? 'bg-primary' : 'bg-line'}`} />}
            <span className={`size-[11px] rounded-full ${index < step ? 'bg-primary-dark' : 'bg-line'}`} />
          </Fragment>
        ))}
      </div>
    </header>
  )
}
