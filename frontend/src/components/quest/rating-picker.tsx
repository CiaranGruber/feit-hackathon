import veryDissatisfied from '../../assets/sentiment_very_dissatisfied.svg'
import dissatisfied from '../../assets/sentiment_dissatisfied.svg'
import neutral from '../../assets/sentiment_neutral.svg'
import satisfied from '../../assets/sentiment_satisfied.svg'
import verySatisfied from '../../assets/sentiment_very_satisfied.svg'
import { UiIcon } from '../ui-icon.tsx'
import { focusClasses } from '../onboarding/styles.ts'

const faces = [veryDissatisfied, dissatisfied, neutral, satisfied, verySatisfied]
const labels = ['Very bad', 'Bad', 'Okay', 'Good', 'Amazing']
const agreement = ['Not at all', 'Probably not', 'Maybe', 'Probably', 'Definitely']

export function RatingPicker({ label, name, value, onChange, optional = false }: { label: string; name: string; value: number | null; onChange: (value: number | null) => void; optional?: boolean }) {
  return <fieldset className="my-6">
    <legend className="font-display text-[18px] leading-6 font-bold">{label}</legend>
    <div className="mt-3 grid grid-cols-5 gap-1.5">
      {(optional ? agreement : labels).map((text, index) => <label key={text} className={`relative flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-0.5 py-3 text-center ${value === index + 1 ? 'border-primary-dark bg-[#FFE4A2]' : 'border-line/70 bg-cream/40'} has-focus-visible:outline-2 has-focus-visible:outline-primary-dark`}>
        <input type="radio" name={name} value={index + 1} checked={value === index + 1} onChange={() => onChange(index + 1)} aria-label={`${index + 1} — ${text}`} className="sr-only" />
        {optional ? <span className="font-display text-[22px] font-bold">{index + 1}</span> : <UiIcon src={faces[index]} className="size-8 text-[#A76A22]" />}
        <span className="text-[10px] leading-4">{!optional && `${index + 1} `}{text}</span>
      </label>)}
    </div>
    {/* TODO(asset): Add the optional quick-question thumbs icons when supplied. */}
    {optional && value !== null && <button type="button" onClick={() => onChange(null)} className={`mt-2 min-h-11 cursor-pointer rounded px-2 text-[12px] underline ${focusClasses}`}>Clear answer</button>}
  </fieldset>
}
