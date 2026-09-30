import { useLocation } from 'react-router-dom'

export function useParentPath(fallback: string) {
  const { state } = useLocation()
  return state && typeof state.backTo === 'string' && /^\/(explore|my-quests|profile)([/?]|$)/.test(state.backTo) ? state.backTo : fallback
}

export function formatRecordDate(date: string) {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
}
