// Thin client for the local Ollama server (proxied at /ollama by Vite).

export const MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? 'gemma4:latest'

// Loading the model can take minutes (especially from an external drive), so keep it
// in memory while a student is working instead of Ollama's default 5 minutes.
const KEEP_ALIVE = '2h'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export class OllamaError extends Error {}

// Load the model into memory ahead of the first real request. Resolves once it's ready.
export async function warmUp(): Promise<void> {
  const res = await fetch('/ollama/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: [], keep_alive: KEEP_ALIVE }),
  })
  if (!res.ok) throw new OllamaError(`Couldn't load ${MODEL} (${res.status}).`)
}

// Ask the model for JSON that matches `schema` and parse it.
export async function chatJSON<T>(messages: ChatMessage[], schema: object, temperature = 0.7): Promise<T> {
  let res: Response
  try {
    res = await fetch('/ollama/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages,
        format: schema,
        stream: false,
        think: false,
        keep_alive: KEEP_ALIVE,
        options: { temperature },
      }),
    })
  } catch {
    throw new OllamaError("Can't reach Gemma. Make sure Ollama is running (ollama serve).")
  }

  if (!res.ok) {
    const body = await res.text()
    if (res.status >= 500 && body.length === 0) {
      throw new OllamaError("Can't reach Gemma. Make sure Ollama is running (ollama serve).")
    }
    throw new OllamaError(`Gemma returned an error (${res.status}): ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  try {
    return JSON.parse(data.message.content) as T
  } catch {
    throw new OllamaError('Gemma sent back something unexpected. Try again.')
  }
}
