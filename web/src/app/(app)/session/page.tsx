import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GROW_STAGE_LABELS, DIFFICULTY_LABELS } from '@/types'

export default async function SessionListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sessions } = await supabase
    .from('coaching_sessions')
    .select('*, personas(name, difficulty)')
    .eq('user_id', user!.id)
    .order('started_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">코칭 세션</h1>
          <p className="text-muted-foreground mt-1">진행 중이거나 완료된 세션 목록</p>
        </div>
        <Link href="/persona">
          <Button>새 세션</Button>
        </Link>
      </div>

      {sessions && sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((s) => {
            const persona = s.personas as { name: string; difficulty: string } | null
            return (
              <Card key={s.id}>
                <CardContent className="pt-4 pb-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{persona?.name ?? '페르소나'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {persona?.difficulty && (
                        <Badge variant="outline" className="text-xs">
                          {DIFFICULTY_LABELS[persona.difficulty as keyof typeof DIFFICULTY_LABELS]}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {GROW_STAGE_LABELS[s.current_stage as keyof typeof GROW_STAGE_LABELS]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        신뢰도 {s.trust_score?.toFixed(1) ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.status === 'completed' ? 'default' : 'secondary'}>
                      {s.status === 'completed' ? '완료' : s.status === 'active' ? '진행중' : '중단'}
                    </Badge>
                    {s.status === 'active' && (
                      <Link href={`/session/${s.id}`}>
                        <Button size="sm">계속하기</Button>
                      </Link>
                    )}
                    {s.status === 'completed' && (
                      <Link href={`/results/${s.id}`}>
                        <Button size="sm" variant="outline">결과보기</Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
            <p>진행 중인 세션이 없습니다.</p>
            <Link href="/persona" className="mt-3 inline-block">
              <Button size="sm">코칭 시작하기</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
