import { Link } from 'react-router-dom'
import mapIllustration from '../assets/map_1.png'
import sparkleIcon from '../assets/feature-sparkle_1.svg'
import leavesIcon from '../assets/feature-leaves_1.png'
import heartIcon from '../assets/feature-heart_1.svg'
import clockIcon from '../assets/clock_1.svg'
import sparkleRays from '../assets/map-sparkle-rays_1.svg'
import { ArrowRight } from '../components/onboarding/arrow-right.tsx'
import { OnboardingHeader } from '../components/onboarding/header.tsx'
import { headingClasses, pageClasses, primaryActionClasses } from '../components/onboarding/styles.ts'

export function Intro() {
  return (
    <section aria-labelledby="intro-title" className={pageClasses}>
      <title>Find your kind of adventure</title>
      <OnboardingHeader step={1} backTo="/" backLabel="Back to welcome" />

      <div className="mt-12 text-center">
        <h1 id="intro-title" className={headingClasses}>
          Let’s find your<br /> kind of adventure.
        </h1>
        <p className="mx-auto mt-5 max-w-[305px] text-[16px] leading-6 text-ink/85">
          Tell us a little about what you enjoy — we’ll create personalised ideas just for you.
        </p>
      </div>

      <img
        src={mapIllustration}
        alt="An illustrated adventure map with a trail through mountains, a river, and a village."
        width="1536"
        height="1024"
        className="mt-5 aspect-[3/2] w-full object-contain"
      />

      <ul className="mt-3 space-y-3" aria-label="What you can discover">
        <li className="flex items-center gap-4">
          <span className="flex size-[50px] shrink-0 items-center justify-center rounded-full bg-cream">
            <img src={sparkleIcon} alt="" width="40" height="40" className="size-10 object-contain" />
          </span>
          <p className="text-[15px] leading-[22px] text-ink/80">Discover experiences<br /> that match your interests</p>
        </li>
        <li className="flex items-center gap-4">
          <span className="flex size-[50px] shrink-0 items-center justify-center rounded-full bg-cream">
            <img src={leavesIcon} alt="" width="56" height="48" className="h-12 w-14 max-w-none shrink-0 object-contain" />
          </span>
          <p className="text-[15px] leading-[22px] text-ink/80">Step out of your comfort zone</p>
        </li>
        <li className="flex items-center gap-4">
          <span className="flex size-[50px] shrink-0 items-center justify-center rounded-full bg-cream">
            <img src={heartIcon} alt="" width="40" height="40" className="size-10 object-contain" />
          </span>
          <p className="text-[15px] leading-[22px] text-ink/80">Make everyday life<br /> more interesting</p>
        </li>
      </ul>

      <div className="mt-auto pt-7">
        <p className="mb-5 flex items-center justify-center gap-4 text-[14px]">
          {/* Crop each half of the same SVG without modifying the original artwork. */}
          <span aria-hidden="true" className="relative h-9 w-[18px] shrink-0 overflow-hidden">
            <img src={sparkleRays} alt="" width="36" height="36" className="absolute top-0 left-0 size-9 max-w-none" />
          </span>
          <span className="flex items-center gap-2 whitespace-nowrap">
            <img src={clockIcon} alt="" width="28" height="28" className="size-7 object-contain" />
            Takes ~1 min
          </span>
          <span aria-hidden="true" className="relative h-9 w-[18px] shrink-0 overflow-hidden">
            <img src={sparkleRays} alt="" width="36" height="36" className="absolute top-0 right-0 size-9 max-w-none" />
          </span>
        </p>
        <Link to="/questionnaire" className={`${primaryActionClasses} hover:brightness-[1.03] active:scale-[0.99]`}>
          Let’s do it <ArrowRight />
        </Link>
      </div>
    </section>
  )
}
