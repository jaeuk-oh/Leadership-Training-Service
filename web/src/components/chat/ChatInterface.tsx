'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { CoachingSession, Message, GrowStage } from '@/types'
import { GROW_STAGE_LABELS, GROW_STAGE_COLORS } from '@/types'
import { streamChat, transcribeAudio, synthesizeSpeech } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Send, Mic, MicOff, Volume2, VolumeX, HelpCircle, CheckCircle, Loader2 } from 'lucide-react'
import GrowGuide from './GrowGuide'
import MessageBubble from './MessageBubble'
import AudioWaveform from './AudioWaveform'

interface ChatInterfaceProps {
  session: CoachingSession & { personas: { name: string; profile: { voice?: string } } }
  initialMessages: Message[]
}

export default function ChatInterface({ session, initialMessages }: ChatInterfaceProps) {
  const router = useRouter()
  const supabase = createClient()

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [growStage, setGrowStage] = useState<GrowStage>(session.current_stage)
  const [trustScore, setTrustScore] = useState(session.trust_score)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [isEnding, setIsEnding] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      session_id: session.id,
      role: 'user',
      content: text.trim(),
      grow_stage: growStage,
      trust_delta: null,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      session_id: session.id,
      role: 'assistant',
      content: '',
      grow_stage: growStage,
      trust_delta: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, assistantMessage])

    try {
      let fullContent = ''
      await streamChat(
        {
          session_id: session.id,
          persona_id: session.persona_id,
          message: text.trim(),
          grow_stage: growStage,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          trust_score: trustScore,
        },
        (chunk) => {
          fullContent += chunk
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id ? { ...m, content: fullContent } : m
            )
          )
        },
        (newTrust, delta) => {
          setTrustScore(newTrust)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id ? { ...m, trust_delta: delta } : m
            )
          )
          // TTS 재생
          if (ttsEnabled && fullContent) {
            const voice = session.personas.profile.voice || 'alloy'
            synthesizeSpeech(fullContent, voice).then((buffer) => {
              const audioCtx = new AudioContext()
              audioCtx.decodeAudioData(buffer, (decoded) => {
                const source = audioCtx.createBufferSource()
                source.buffer = decoded
                source.connect(audioCtx.destination)
                source.start()
              })
            }).catch(() => {})
          }
        }
      )
    } catch (e) {
      toast.error('응답 오류: ' + String(e))
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessage.id))
    } finally {
      setIsStreaming(false)
    }
  }, [isStreaming, growStage, messages, session, trustScore, ttsEnabled, toast])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        try {
          const text = await transcribeAudio(audioBlob)
          if (text) handleSend(text)
        } catch {
          toast.error('음성 인식에 실패했습니다.')
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      toast.error('마이크 접근 권한이 필요합니다.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const endSession = async () => {
    setIsEnding(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/session/${session.id}/end`, { method: 'POST' })

      // 평가 요청
      const evalRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          persona_id: session.persona_id,
        }),
      })
      if (evalRes.ok) {
        router.push(`/results/${session.id}`)
      }
    } catch (e) {
      toast.error('세션 종료 오류: ' + String(e))
      setIsEnding(false)
    }
  }

  const stages: GrowStage[] = ['goal', 'reality', 'options', 'will']

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Top bar */}
      <div className="border-b px-6 py-3 flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-semibold text-sm">{session.personas.name}</p>
            <p className="text-xs text-muted-foreground">{messages.length}개 메시지</p>
          </div>
        </div>

        {/* GROW Stage */}
        <div className="flex items-center gap-1">
          {stages.map((stage) => (
            <button
              key={stage}
              onClick={() => setGrowStage(stage)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                growStage === stage
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {GROW_STAGE_LABELS[stage].split(' ')[0]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Trust score */}
          <div className="flex items-center gap-2 min-w-32">
            <span className="text-xs text-muted-foreground whitespace-nowrap">신뢰도 {trustScore.toFixed(1)}</span>
            <Progress value={(trustScore / 10) * 100} className="h-2 w-20" />
          </div>

          {/* GROW Guide */}
          <Dialog>
            <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
              <HelpCircle className="w-4 h-4" />
              가이드
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>GROW 코칭 가이드</DialogTitle>
              </DialogHeader>
              <GrowGuide currentStage={growStage} />
            </DialogContent>
          </Dialog>

          {/* TTS toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={ttsEnabled ? 'bg-blue-50 border-blue-200' : ''}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          {/* End session */}
          <Button
            variant="default"
            size="sm"
            onClick={endSession}
            disabled={isEnding || messages.length < 4}
            className="gap-1.5 bg-green-600 hover:bg-green-700"
          >
            {isEnding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            세션 종료
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">코칭 세션을 시작하세요</p>
            <p className="text-sm">
              현재 단계: <span className="text-primary font-medium">{GROW_STAGE_LABELS[growStage]}</span>
            </p>
            <p className="text-sm mt-1">오른쪽 상단 가이드 버튼에서 표본 질문을 확인하세요.</p>
          </div>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex gap-2 items-center text-muted-foreground text-sm ml-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>응답 생성 중...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t px-6 py-4 bg-background shrink-0">
        {isRecording && <AudioWaveform />}
        <div className="flex gap-3 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="코칭 질문을 입력하세요... (Shift+Enter 줄바꿈)"
            className="flex-1 min-h-[80px] max-h-40 resize-none"
            disabled={isStreaming}
          />
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              className={isRecording ? 'bg-red-50 border-red-200 text-red-500' : ''}
              disabled={isStreaming}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isStreaming}
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
