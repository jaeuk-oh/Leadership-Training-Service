import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-sm">G</div>
          <span className="font-semibold text-lg">GROW 코칭 시뮬레이터</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">로그인</Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-blue-500 hover:bg-blue-600">무료 시작</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-8 pt-24 pb-20 max-w-4xl mx-auto">
        <Badge className="mb-6 bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/20">
          RAG 기반 AI 페르소나 시스템
        </Badge>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          실전처럼 훈련하는<br />
          <span className="text-blue-400">GROW 코칭 시뮬레이터</span>
        </h1>
        <p className="text-xl text-slate-300 mb-10 max-w-2xl leading-relaxed">
          30가지 실제 직장인 페르소나와 1:1 코칭을 실습하세요.
          AI가 상황, 감정, 저항까지 실감나게 재현합니다.
        </p>
        <div className="flex gap-4">
          <Link href="/signup">
            <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-lg px-8 h-12">
              지금 시작하기
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-lg px-8 h-12 border-white/20 text-white hover:bg-white/10">
              로그인
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 pb-24 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'RAG 페르소나',
              desc: '7개 차원 데이터로 구성된 30개+ 실제 직장인 페르소나. 말투, 심리, 저항 패턴까지 실감나게 재현.',
              icon: '🧠',
            },
            {
              title: 'GROW 단계 가이드',
              desc: 'Goal → Reality → Options → Will 단계별 코칭 가이드와 표본 질문으로 체계적 실습.',
              icon: '📈',
            },
            {
              title: '신뢰도 실시간 평가',
              desc: 'AI가 매 턴마다 코칭 품질을 평가. 공감, 열린 질문, GROW 적합도를 즉각 피드백.',
              icon: '⚡',
            },
          ].map((f) => (
            <Card key={f.title} className="bg-white/5 border-white/10">
              <CardContent className="pt-6">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-lg mb-2 text-white">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
