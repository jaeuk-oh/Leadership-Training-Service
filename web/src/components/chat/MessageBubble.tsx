import type { Message } from '@/types'
import { GROW_STAGE_LABELS } from '@/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      )}>
        {isUser ? '나' : 'AI'}
      </div>

      {/* Bubble */}
      <div className={cn('flex flex-col gap-1 max-w-[70%]', isUser ? 'items-end' : 'items-start')}>
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
