'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { CoachingSession, Message, GrowStage } from '@/types'
import { GROW_STAGE_LABELS } from '@/types'
import { streamChat, transcribeAudio, synthesizeSpeech, apiPost } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { Send, Mic, MicOff, Volume2, VolumeX, CheckCircle, Loader2, ChevronRight, ChevronLeft, BookOpen } from 'lucide-react'
import GrowGuide from './GrowGuide'
import MessageBubble from './MessageBubble'
import AudioWaveform from './AudioWaveform'
import { cn } from '@/lib/utils'

interface ChatInterfaceProps {
  session: CoachingSession & { personas: { name: string; profile: { voice?: string } } }
  initialMessages: Message[]
}

function getPersonaColor(name: string): string {
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
  ]
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % colors.length
  return colors[hash]
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
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [guideOpen, setGuideOpen] = useState(true)
  const [guideSheetOpen, setGuideSheetOpen] = useState(false)
  const [isGreeting, setIsGreeting] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const greetingCalledRef = useRef(false)

  const personaName = session.personas.name
  const personaColor = getPersonaColor(personaName)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 세션 시작 인사: 메시지가 없을 때 AI가 먼저 인사
  useEffect(() => {
    if (initialMessages.length > 0 || greetingCalledRef.current) return
    greetingCalledRef.current = true

    const sendGreeting = async () => {
      setIsGreeting(true)
      const greetingMessage: Message = {
        id: crypto.randomUUID(),
        session_id: session.id,
        role: 'assistant',
        content: '',
        grow_stage: growStage,
        trust_delta: null,
        created_at: new Date().toISOString(),
      }
      setMessages([greetingMessage])

      try {
        let fullContent = ''
        await streamChat(
          {
            session_id: session.id,
            persona_id: session.persona_id,
            message: '__GREETING__',
            grow_stage: growStage,
            history: [],
            trust_score: trustScore,
          },
          (chunk) => {
            fullContent += chunk
            setMessages([{ ...greetingMessage, content: fullContent }])
          },
          (newTrust) => {
            setTrustScore(newTrust)
          }
        )
      } catch {
        setMessages([])
      } finally {
        setIsGreeting(false)
      }
    }

    sendGreeting()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming || isGreeting) return

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
      toast.error(e instanceof Error ? e.message : '응답 오류: ' + String(e))
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessage.id))
    } finally {
      setIsStreaming(false)
    }
  }, [isStreaming, isGreeting, growStage, messages, session, trustScore, ttsEnabled])

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
      await apiPost(`/api/session/${session.id}/end`, {})
      await apiPost('/api/evaluation', {
        session_id: session.id,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        persona_id: session.persona_id,
      })
      router.push(`/results/${session.id}`)
    } catch (e) {
      toast.error('세션 종료 오류: ' + (e instanceof Error ? e.message : String(e)))
      setIsEnding(false)
    }
  }

  const stages: GrowStage[] = ['goal', 'reality', 'options', 'will']
  const isTyping = (isStreaming || isGreeting) && messages[messages.length - 1]?.content === ''

  return (
    <div className="flex flex-col h-full -m-4 sm:-m-6">
      {/* Top bar */}
      <div className="border-b px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2 bg-background shrink-0">
        {/* Persona info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0', personaColor)}>
            {personaName.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{personaName}</p>
            <p className="text-xs text-muted-foreground">
              {isTyping
                ? <span className="flex items-center gap-1 text-primary"><span className="animate-pulse">●</span> 입력 중...</span>
                : `${messages.length}개 메시지`
              }
            </p>
          </div>
        </div>

        {/* GROW Stage — 모바일에선 전체 폭 별도 행에서 가로 스크롤 */}
        <div className="order-last w-full sm:order-none sm:w-auto flex items-center gap-1 overflow-x-auto">
          {stages.map((stage) => (
            <button
              key={stage}
              onClick={() => setGrowStage(stage)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                growStage === stage
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {GROW_STAGE_LABELS[stage].split(' ')[0]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Trust score — 모바일에선 숫자만, 데스크톱은 진행바까지 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">신뢰도 {trustScore.toFixed(1)}</span>
            <Progress value={(trustScore / 10) * 100} className="hidden sm:block h-2 w-20" />
          </div>

          {/* TTS toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={ttsEnabled ? 'bg-blue-50 border-blue-200' : ''}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          {/* Guide toggle — 데스크톱: 인라인 패널 토글 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGuideOpen(!guideOpen)}
            className={cn('hidden md:inline-flex gap-1.5', guideOpen && 'bg-muted')}
          >
            {guideOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            가이드
          </Button>

          {/* Guide — 모바일: 드로어 오버레이 */}
          <Sheet open={guideSheetOpen} onOpenChange={setGuideSheetOpen}>
            <SheetTrigger
              render={<Button variant="outline" size="sm" className="md:hidden" aria-label="GROW 가이드" />}
            >
              <BookOpen className="w-4 h-4" />
            </SheetTrigger>
            <SheetContent side="right" className="w-80 max-w-[85vw] overflow-y-auto px-4 py-4">
              <SheetTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">GROW 가이드</SheetTitle>
              <GrowGuide
                currentStage={growStage}
                onSelectQuestion={(q) => { setInput(q); setGuideSheetOpen(false) }}
              />
            </SheetContent>
          </Sheet>

          {/* End session */}
          <Button
            variant="default"
            size="sm"
            onClick={endSession}
            disabled={isEnding || messages.length < 4}
            className="gap-1.5 bg-green-600 hover:bg-green-700"
          >
            {isEnding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            <span className="hidden sm:inline">세션 종료</span>
          </Button>
        </div>
      </div>

      {/* Body: messages + guide panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 space-y-4">
          {messages.length === 0 && !isGreeting && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">코칭 세션을 시작하세요</p>
              <p className="text-sm">
                현재 단계: <span className="text-primary font-medium">{GROW_STAGE_LABELS[growStage]}</span>
              </p>
            </div>
          )}
          {messages
            .filter((m, i) => !(isTyping && i === messages.length - 1 && m.role === 'assistant' && m.content === ''))
            .map((message) => (
              <MessageBubble key={message.id} message={message} personaName={personaName} />
            ))}
          {isTyping && (
            <div className="flex gap-3 items-start">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-1', personaColor)}>
                {personaName.slice(0, 1)}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground px-1">{personaName}</span>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Guide side panel — 데스크톱 전용 (모바일은 상단 드로어 사용) */}
        {guideOpen && (
          <div className="hidden md:block w-64 border-l bg-background/50 overflow-y-auto px-4 py-4 shrink-0">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">GROW 가이드</p>
            <GrowGuide
              currentStage={growStage}
              onSelectQuestion={(q) => setInput(q)}
            />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t px-3 sm:px-6 py-3 sm:py-4 bg-background shrink-0">
        {isRecording && <AudioWaveform />}
        <div className="flex gap-2 sm:gap-3 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="코칭 질문을 입력하세요... (Shift+Enter 줄바꿈)"
            className="flex-1 min-h-[60px] sm:min-h-[80px] max-h-40 resize-none"
            disabled={isStreaming || isGreeting}
          />
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              className={isRecording ? 'bg-red-50 border-red-200 text-red-500' : ''}
              disabled={isStreaming || isGreeting}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isStreaming || isGreeting}
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
