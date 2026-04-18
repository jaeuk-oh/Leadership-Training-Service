const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `API error: ${res.status}`)
  }
  return res.json()
}

export async function streamChat(
  body: {
    session_id: string
    persona_id: string
    message: string
    grow_stage: string
    history: { role: string; content: string }[]
    trust_score: number
  },
  onChunk: (content: string) => void,
  onDone: (trustScore: number, trustDelta: number) => void,
) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Chat error: ${res.status}`)
  if (!res.body) throw new Error('No response body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))

    for (const line of lines) {
      try {
        const data = JSON.parse(line.slice(6))
        if (data.content) onChunk(data.content)
        if (data.done) onDone(data.trust_score, data.trust_delta)
      } catch {
        // 파싱 오류 무시
      }
    }
  }
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'audio.webm')
  const res = await fetch(`${API_URL}/api/stt`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error('STT failed')
  const data = await res.json()
  return data.text
}

export async function synthesizeSpeech(text: string, voice = 'alloy'): Promise<ArrayBuffer> {
  const res = await fetch(`${API_URL}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  })
  if (!res.ok) throw new Error('TTS failed')
  return res.arrayBuffer()
}
