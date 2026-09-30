import { Link } from 'react-router-dom'
import welcomeIllustration from '../assets/onboarding_1.png'
import { ArrowRight } from '../components/onboarding/arrow-right.tsx'
import { focusClasses, primaryActionClasses } from '../components/onboarding/styles.ts'

export function Welcome() {
  return (
    <section aria-labelledby="welcome-title" className="flex flex-1 flex-col">
      <title>Welcome</title>
      <div className="relative aspect-[390/420] shrink-0 overflow-hidden bg-linear-to-b from-[#BCE4F7] via-[#E3F1F5] to-cream sm:rounded-t-[31px]">
        <img
          src={welcomeIllustration}
          alt="A traveller looking out over a sunlit village, mountains, and a river."
          width="1312"
          height="1199"
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover object-bottom"
        />
      </div>

      <div className="relative -mt-8 flex flex-1 flex-col rounded-t-[44px] bg-canvas px-6 pt-5 pb-[max(24px,env(safe-area-inset-bottom))] text-center sm:rounded-b-[31px]">
        {/* TODO(asset): Insert the final brand logo here (280 x 76 px). Keep this space empty until it is supplied. */}
        <div aria-hidden="true" data-asset-slot="brand-logo" className="mx-auto h-[76px] w-full max-w-[280px] shrink-0" />

        <h1 id="welcome-title" className="mx-auto mt-4 max-w-[295px] text-[22px] leading-[28px] font-bold text-ink">
          Ideas that make your<br /> world wider.
        </h1>
        <p className="mx-auto mt-5 max-w-[300px] text-[16px] leading-6 text-ink/80">
          Discover new experiences and<br className="hidden min-[350px]:block" /> make everyday life more interesting.
        </p>

        <div className="mt-auto pt-9">
          <Link to="/intro" className={`${primaryActionClasses} hover:brightness-[1.03] active:scale-[0.99]`}>
            Start Exploring <ArrowRight />
          </Link>
          <div className="mt-5 flex items-center gap-3">
            <span aria-hidden="true" className="h-px flex-1 bg-linear-to-r from-transparent to-[#EBD8AF]" />
            <Link
              to="/sign-in"
              className={`flex min-h-11 items-center rounded-md px-2 text-[14px] font-semibold hover:text-primary-dark ${focusClasses}`}
            >
              I have an account
            </Link>
            <span aria-hidden="true" className="h-px flex-1 bg-linear-to-l from-transparent to-[#EBD8AF]" />
          </div>
        </div>
      </div>
    </section>
  )
}
