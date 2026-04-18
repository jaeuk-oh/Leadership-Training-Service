import type { Message } from '@/types'
import { GROW_STAGE_LABELS } from '@/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
  personaName?: string
}

function getInitials(name: string): string {
  return name.slice(0, 1)
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

export default function MessageBubble({ message, personaName = '상대' }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const avatarColor = isUser ? '' : getPersonaColor(personaName)

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1 text-white',
        isUser ? 'bg-primary' : avatarColor
      )}>
        {isUser ? '나' : getInitials(personaName)}
      </div>

      {/* Bubble */}
      <div className={cn('flex flex-col gap-1 max-w-[70%]', isUser ? 'items-end' : 'items-start')}>
        {!isUser && (
          <span className="text-xs font-medium text-muted-foreground px-1">{personaName}</span>
        )}
        <div className={cn(
          'px-4 py-3 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted rounded-tl-sm'
        )}>
          {message.content || <span className="opacity-50">…</span>}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2">
          {message.grow_stage && (
            <span className="text-xs text-muted-foreground">
              {GROW_STAGE_LABELS[message.grow_stage].split(' ')[0]}
            </span>
          )}
          {message.trust_delta !== null && message.trust_delta !== undefined && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs h-5 px-1.5 gap-0.5',
                message.trust_delta > 0
                  ? 'border-green-200 text-green-600'
                  : message.trust_delta < 0
                  ? 'border-red-200 text-red-500'
                  : 'border-muted text-muted-foreground'
              )}
            >
              {message.trust_delta > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : message.trust_delta < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {message.trust_delta > 0 ? '+' : ''}{message.trust_delta.toFixed(1)}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
