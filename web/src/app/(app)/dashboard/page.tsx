import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DIFFICULTY_LABELS, GROW_STAGE_LABELS } from '@/types'
import { PlayCircle, TrendingUp, Award, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [sessionsResult, evalResult] = await Promise.all([
    supabase
      .from('coaching_sessions')
      .select('*, personas(name, difficulty)')
      .eq('user_id', user!.id)
      .order('started_at', { ascending: false })
      .limit(5),
    supabase
      .from('evaluation_results')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const sessions = sessionsResult.data ?? []
  const latestEval = evalResult.data?.[0]
  const completedCount = sessions.filter((s) => s.status === 'completed').length
  const avgTrust = sessions.length
    ? (sessions.reduce((a, s) => a + (s.trust_score ?? 0), 0) / sessions.length).toFixed(1)
    : '—'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-muted-foreground mt-1">GROW 코칭 실습 현황</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '총 세션', value: sessions.length, icon: Clock, color: 'text-blue-500' },
          { label: '완료 세션', value: completedCount, icon: PlayCircle, color: 'text-green-500' },
          { label: '평균 신뢰도', value: avgTrust, icon: TrendingUp, color: 'text-purple-500' },
          {
            label: '최고 점수',
            value: latestEval
              ? ((latestEval.goal_clarity + latestEval.active_listening + latestEval.question_quality + latestEval.commitment) / 4).toFixed(1)
              : '—',
            icon: Award,
            color: 'text-yellow-500',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold mt-0.5">{value}</p>
                </div>
                <Icon className={`w-8 h-8 ${color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Start new session CTA */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
        <CardContent className="pt-6 pb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">새 코칭 세션 시작</h2>
            <p className="text-blue-100 mt-1 text-sm">페르소나를 선택하고 GROW 코칭을 실습해보세요.</p>
          </div>
          <Link href="/persona">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
              시작하기
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 세션</CardTitle>
            <CardDescription>최근 5개 코칭 세션</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{(s.personas as { name: string } | null)?.name ?? '페르소나'}</p>
                      <p className="text-xs text-muted-foreground">
                        {GROW_STAGE_LABELS[s.current_stage as keyof typeof GROW_STAGE_LABELS]} ·{' '}
                        신뢰도 {s.trust_score?.toFixed(1) ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.status === 'completed' ? 'default' : 'secondary'}>
                      {s.status === 'completed' ? '완료' : s.status === 'active' ? '진행중' : '중단'}
                    </Badge>
                    {s.status === 'active' && (
                      <Link href={`/session/${s.id}`}>
                        <Button size="sm" variant="outline">계속하기</Button>
                      </Link>
                    )}
                    {s.status === 'completed' && (
                      <Link href={`/results/${s.id}`}>
                        <Button size="sm" variant="outline">결과보기</Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
