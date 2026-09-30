import { checkStubFailure, waitForStub } from './stub-utils.ts'

export type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }
export type CompanionInput = { userId: string; messages: readonly ChatMessage[] }
export type CompanionResult = { message: ChatMessage; isStub: boolean }

/**
 * A deterministic local conversation stub, not an AI or location search.
 * TODO(backend): Send the conversation through callApi and map the result to
 * CompanionResult. Preserve message IDs for retries and pass AbortSignal through
 * the API helper when cancellation is supported. Never claim a nearby venue
 * or live availability without a real location/search response.
 */
export async function sendCompanionMessage(input: CompanionInput, signal?: AbortSignal): Promise<CompanionResult> {
  const latest = input.messages.at(-1)
  if (!latest || latest.role !== 'user' || !latest.content.trim()) throw new Error('Please enter a message.')
  if (latest.content.length > 1000) throw new Error('Please keep your message under 1,000 characters.')
  await waitForStub(signal, 1000)
  checkStubFailure('chat')

  const text = latest.content.toLowerCase()
  let content = 'How about trying a new café? Take a book and enjoy a slow coffee break. Allow 1–2 hours, with a low budget ($). Would you prefer something active or relaxing?'
  if (/relax|quiet|calm/.test(text)) {
    content = 'A little bookstore visit could be lovely. Browse a shelf you usually skip and pick a book that catches your eye. Allow 1–2 hours; browsing is free.'
  } else if (/outdoor|hik|nature|near/.test(text)) {
    content = 'A hiking trail sounds like a refreshing idea! Allow 3–4 hours; a free trail keeps the cost down. I don’t have your location yet, so this is a general idea rather than a nearby trail recommendation.'
  } else if (/friend|together|social/.test(text)) {
    content = 'Try a pottery workshop with a friend. You can each make something small and compare your creations afterwards. Allow about 2 hours and a medium budget ($$).'
  } else if (/surprise|active|sport|skat/.test(text)) {
    content = 'Your wildcard idea: go ice skating! Try a beginner session and enjoy learning something new. Allow 2–3 hours and a medium budget ($$).'
  } else if (/another|else|different/.test(text)) {
    content = 'Let’s switch things up: try matcha with a friend. Choose somewhere comfortable and make an afternoon of it. Allow 1–2 hours and a low budget ($).'
  }
  return { message: { id: `reply-${latest.id}`, role: 'assistant', content }, isStub: true }
}
