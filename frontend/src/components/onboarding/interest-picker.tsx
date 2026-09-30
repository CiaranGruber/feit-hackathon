import { interestOptions } from '../../data/interests.ts'

type InterestPickerProps = {
  selected: readonly string[]
  onToggle: (id: string) => void
  disabled?: boolean
  hintId?: string
}

// One category picker keeps onboarding and profile editing in sync.
export function InterestPicker({ selected, onToggle, disabled, hintId }: InterestPickerProps) {
  return <fieldset disabled={disabled} aria-describedby={hintId} className="grid grid-cols-3 gap-3 max-[359px]:gap-2 disabled:opacity-60">
    <legend className="sr-only">Choose at least one activity you enjoy</legend>
    {interestOptions.map(option => {
      const isSelected = selected.includes(option.id)
      return <label key={option.id} className={`relative flex min-h-[130px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[14px] border px-1.5 py-5 text-center shadow-[0_2px_5px_#47372f04] transition-colors focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-primary-dark ${isSelected ? 'border-primary-dark bg-cream/80 shadow-[0_2px_8px_#e9903214]' : 'border-line/65 bg-canvas hover:border-primary/75 hover:bg-cream/35'}`}>
        <input type="checkbox" name="interests" value={option.id} checked={isSelected} onChange={() => onToggle(option.id)} className="absolute top-2 right-2 size-4 cursor-pointer accent-primary-dark opacity-0 checked:opacity-100 focus-visible:opacity-100" />
        <img src={option.icon} alt="" width="44" height="44" className="size-11 shrink-0 object-contain" />
        <span className="flex min-h-9 items-center text-[12px] leading-[17px] font-semibold">{option.label}</span>
      </label>
    })}
  </fieldset>
}
