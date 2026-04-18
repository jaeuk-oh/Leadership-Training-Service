import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle } from 'lucide-react'

export default async function FeedbackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: requests } = await supabase
    .from('feedback_requests')
    .select('*, coaching_sessions(*, personas(name))')
    .eq('requester_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">피드백</h1>
        <p className="text-muted-foreground mt-1">동료에게 익명 피드백을 요청하세요</p>
      </div>

      {requests && requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map((r) => {
            const session = r.coaching_sessions as { personas: { name: string } } | null
            return (
              <Card key={r.id}>
                <CardContent className="pt-4 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{session?.personas?.name ?? '세션'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <Badge variant={r.status === 'completed' ? 'default' : 'secondary'}>
                    {r.status === 'completed' ? '완료' : '대기중'}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
            <p>피드백 요청 내역이 없습니다.</p>
            <p className="text-sm mt-1">코칭 결과 페이지에서 피드백을 요청할 수 있습니다.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
