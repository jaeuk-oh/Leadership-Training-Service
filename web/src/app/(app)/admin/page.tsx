import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Activity, TrendingUp } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  const [usersResult, sessionsResult, evalResult] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('coaching_sessions').select('*, personas(name), profiles(name)').order('started_at', { ascending: false }).limit(50),
    supabase.from('evaluation_results').select('trust_score').limit(1000),
  ])

  const users = usersResult.data ?? []
  const sessions = sessionsResult.data ?? []
  const evals = evalResult.data ?? []
  const avgTrust = evals.length
    ? (evals.reduce((a, e) => a + e.trust_score, 0) / evals.length).toFixed(1)
    : '—'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '총 회원', value: users.length, icon: Users, color: 'text-blue-500' },
          { label: '총 세션', value: sessions.length, icon: Activity, color: 'text-green-500' },
          { label: '평균 신뢰도', value: avgTrust, icon: TrendingUp, color: 'text-purple-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
                <Icon className={`w-8 h-8 ${color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users table */}
      <Card>
        <CardHeader><CardTitle className="text-base">회원 목록</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                <div>
                  <p className="font-medium">{u.name ?? '(이름 없음)'}</p>
                  <p className="text-xs text-muted-foreground">{u.rank} · {u.department}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{u.points}P</span>
                  {u.is_admin && <Badge className="bg-purple-100 text-purple-700 text-xs">관리자</Badge>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sessions table */}
      <Card>
        <CardHeader><CardTitle className="text-base">최근 세션</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                <div>
                  <p className="font-medium">{(s.profiles as { name: string } | null)?.name ?? '사용자'}</p>
                  <p className="text-xs text-muted-foreground">{(s.personas as { name: string } | null)?.name} · {s.current_stage}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">신뢰도 {s.trust_score?.toFixed(1)}</span>
                  <Badge variant={s.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                    {s.status === 'completed' ? '완료' : '진행중'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
