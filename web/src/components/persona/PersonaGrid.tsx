'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Persona } from '@/types'
import { DIFFICULTY_LABELS } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { apiPost } from '@/lib/api'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import type { Difficulty } from '@/types'

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  hard: 'bg-red-100 text-red-700 border-red-200',
}

const ATTITUDE_ICONS: Record<string, string> = {
  cooperative: '😊',
  defensive: '😤',
  avoidant: '😶',
}

interface PersonaGridProps {
  personas: Persona[]
}

export default function PersonaGrid({ personas }: PersonaGridProps) {
  const router = useRouter()
  const supabase = createClient()
  const [filter, setFilter] = useState<'all' | Difficulty>('all')
  const [starting, setStarting] = useState<string | null>(null)

  const filtered = filter === 'all' ? personas : personas.filter((p) => p.difficulty === filter)

  const startSession = async (persona: Persona) => {
    setStarting(persona.id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const session = await apiPost<{ id: string }>('/api/session/start', {
        persona_id: persona.id,
        user_id: user.id,
      })
      router.push(`/session/${session.id}`)
    } catch (e) {
      toast.error('세션 시작 실패: ' + String(e))
      setStarting(null)
    }
  }

  return (
    <div className="space-y-5">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">전체 ({personas.length})</TabsTrigger>
          <TabsTrigger value="easy">초급</TabsTrigger>
          <TabsTrigger value="medium">중급</TabsTrigger>
          <TabsTrigger value="hard">고급</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((persona) => {
          const attitude = persona.profile?.coaching_attitude
          return (
            <Card key={persona.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{persona.name}</CardTitle>
                  <Badge className={`shrink-0 text-xs border ${DIFFICULTY_COLORS[persona.difficulty]}`}>
                    {DIFFICULTY_LABELS[persona.difficulty]}
                  </Badge>
                </div>
                {persona.description && (
                  <CardDescription className="text-xs leading-relaxed">{persona.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1 pb-3">
                <div className="flex flex-wrap gap-1.5">
                  {persona.profile?.job_type && (
                    <Badge variant="outline" className="text-xs">{persona.profile.job_type}</Badge>
                  )}
                  {persona.profile?.rank && (
                    <Badge variant="outline" className="text-xs">{persona.profile.rank}</Badge>
                  )}
                  {attitude && (
                    <Badge variant="outline" className="text-xs">
                      {ATTITUDE_ICONS[attitude]} {attitude === 'cooperative' ? '협조적' : attitude === 'defensive' ? '방어적' : '회피적'}
                    </Badge>
                  )}
                  {persona.profile?.mbti && (
                    <Badge variant="outline" className="text-xs">{persona.profile.mbti}</Badge>
                  )}
                </div>
                {persona.profile?.stress_level !== undefined && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>스트레스</span>
                      <span>{persona.profile.stress_level}/10</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full"
                        style={{ width: `${(persona.profile.stress_level / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => startSession(persona)}
                  disabled={starting === persona.id}
                >
                  {starting === persona.id ? '세션 시작 중...' : '코칭 시작'}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            페르소나가 없습니다. Supabase에 시드 데이터를 업로드해주세요.
          </div>
        )}
      </div>
    </div>
  )
}
