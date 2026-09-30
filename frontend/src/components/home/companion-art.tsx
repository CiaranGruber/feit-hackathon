import sitting from '../../assets/companion-sitting-1.png'
import talking from '../../assets/companion-talking-1.gif'
import backdrop from '../../assets/bg-orange-circle-1.png'
import sparkle from '../../assets/feature-sparkle_1.svg'

export function CompanionArt({ talking: animated = false, className = '' }: { talking?: boolean; className?: string }) {
  return <div aria-hidden="true" className={`relative ${className}`}>
    <img src={backdrop} alt="" className="absolute inset-0 h-full w-full object-contain opacity-70" />
    <picture>
      <source media="(prefers-reduced-motion: reduce)" srcSet={sitting} />
      <img src={animated ? talking : sitting} alt="" className="relative h-full w-full object-contain" />
    </picture>
    <img src={sparkle} alt="" className="absolute top-[10%] left-0 size-[18%]" />
    <img src={sparkle} alt="" className="absolute top-[4%] right-[6%] size-[12%]" />
  </div>
}
