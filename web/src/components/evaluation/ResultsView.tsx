'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CoachingSession, EvaluationResult, Message } from '@/types'
import { DIFFICULTY_LABELS } from '@/types'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trophy, MessageSquare, TrendingUp } from 'lucide-react'

interface ResultsViewProps {
  session: CoachingSession & { personas: { name: string; difficulty: string } }
  evaluation: EvaluationResult | null
  messages: Message[]
  ranking: { trust_score: number; profiles: { name: string } | { name: string }[] | null }[]
}

export default function ResultsView({ session, evaluation, messages, ranking }: ResultsViewProps) {
  const [tab, setTab] = useState('result')

  const radarData = evaluation
    ? [
        { subject: '목표 명확화', value: evaluation.goal_clarity, fullMark: 10 },
        { subject: '경청/공감', value: evaluation.active_listening, fullMark: 10 },
        { subject: '질문 수준', value: evaluation.question_quality, fullMark: 10 },
        { subject: '실행 의지', value: evaluation.commitment, fullMark: 10 },
      ]
    : []

  const avgScore = evaluation
    ? ((evaluation.goal_clarity + evaluation.active_listening + evaluation.question_quality + evaluation.commitment) / 4).toFixed(1)
    : '—'

  const barData = [
    { name: '내 점수', trust: evaluation?.trust_score ?? 0 },
    {
      name: '전체 평균',
      trust: ranking.length
        ? ranking.reduce((a, r) => a + r.trust_score, 0) / ranking.length
        : 0,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">코칭 결과</h1>
          <p className="text-muted-foreground mt-1">
            {session.personas.name} ·{' '}
            <Badge variant="outline">{DIFFICULTY_LABELS[session.personas.difficulty as keyof typeof DIFFICULTY_LABELS]}</Badge>
          </p>
        </div>
        <Link href="/persona">
          <Button>새 세션 시작</Button>
        </Link>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="result">평가 결과</TabsTrigger>
          <TabsTrigger value="conversation">대화 내역</TabsTrigger>
          <TabsTrigger value="ranking">랭킹</TabsTrigger>
        </TabsList>

        <TabsContent value="result" className="space-y-6 mt-4">
          {evaluation ? (
            <>
              {/* Score overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: '목표 명확화', value: evaluation.goal_clarity },
                  { label: '경청/공감', value: evaluation.active_listening },
                  { label: '질문 수준', value: evaluation.question_quality },
                  { label: '실행 의지', value: evaluation.commitment },
                ].map(({ label, value }) => (
                  <Card key={label}>
                    <CardContent className="pt-5 text-center">
                      <p className="text-3xl font-bold text-primary">{value.toFixed(1)}</p>
                      <p className="text-sm text-muted-foreground mt-1">{label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Radar chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      종합 역량 (평균 {avgScore})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                        <Radar name="점수" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Trust bar chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">신뢰도 비교</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 10]} />
                        <Tooltip />
                        <Bar dataKey="trust" name="신뢰도" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* GPT comment */}
              {evaluation.gpt_comment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">AI 코칭 피드백</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">{evaluation.gpt_comment}</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                평가 결과가 없습니다. 세션을 완료하면 자동으로 생성됩니다.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="conversation" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                전체 대화 ({messages.length}개 메시지)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {msg.role === 'user' ? '나' : 'AI'}
                    </div>
                    <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                신뢰도 TOP 10
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ranking.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <span className={`w-7 text-center font-bold text-sm ${i < 3 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm">{(Array.isArray(r.profiles) ? r.profiles[0]?.name : r.profiles?.name) ?? '익명'}</span>
                    <span className="font-semibold text-primary">{r.trust_score.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
