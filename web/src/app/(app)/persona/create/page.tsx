'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiPost } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const personaSchema = z.object({
  name: z.string().min(2, '이름을 입력하세요'),
  description: z.string().optional(),
  gender: z.string().optional(),
  age_group: z.string().optional(),
  rank: z.string().optional(),
  job_type: z.string().optional(),
  mbti: z.string().optional(),
  coaching_attitude: z.enum(['cooperative', 'defensive', 'avoidant']).optional(),
  work_concerns: z.string().optional(),
  career_concerns: z.string().optional(),
  values: z.string().optional(),
  past_experiences: z.string().optional(),
})

type PersonaForm = z.infer<typeof personaSchema>

export default function CreatePersonaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [stressLevel, setStressLevel] = useState(5)
  const [motivationLevel, setMotivationLevel] = useState(5)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PersonaForm>({
    resolver: zodResolver(personaSchema),
  })

  const onSubmit = async (data: PersonaForm) => {
    setLoading(true)
    try {
      await apiPost('/api/personas', {
        name: data.name,
        description: data.description,
        difficulty: stressLevel >= 7 ? 'hard' : stressLevel >= 4 ? 'medium' : 'easy',
        is_preset: false,
        profile: {
          gender: data.gender,
          age_group: data.age_group,
          rank: data.rank,
          job_type: data.job_type,
          mbti: data.mbti,
          coaching_attitude: data.coaching_attitude,
          work_concerns: data.work_concerns,
          career_concerns: data.career_concerns,
          values: data.values,
          past_experiences: data.past_experiences,
          stress_level: stressLevel,
          motivation_level: motivationLevel,
        },
      })
      toast.success('페르소나가 생성되었습니다!')
      router.push('/persona')
    } catch (e) {
      toast.error('생성 실패: ' + String(e))
    } finally {
      setLoading(false)
    }
  }

  const attitude = watch('coaching_attitude')

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">커스텀 페르소나 만들기</h1>
        <p className="text-muted-foreground mt-1">나만의 코칭 대상 페르소나를 설정하세요</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* 기본 정보 */}
        <Card>
          <CardHeader><CardTitle className="text-base">기본 정보</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>페르소나 이름 *</Label>
              <Input {...register('name')} placeholder="예: 김철수 (과장, 번아웃 중)" />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea {...register('description')} placeholder="이 페르소나의 상황을 간략히 설명하세요" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>성별</Label>
                <Select onValueChange={(v) => setValue('gender', v as string)}>
                  <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="남">남</SelectItem>
                    <SelectItem value="여">여</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>연령대</Label>
                <Select onValueChange={(v) => setValue('age_group', v as string)}>
                  <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    {['20대 초반','20대 중반','20대 후반','30대 초반','30대 중반','30대 후반','40대 초반','40대 중반','40대 후반','50대+'].map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>직급</Label>
                <Input {...register('rank')} placeholder="과장, 팀장, 대리..." />
              </div>
              <div className="space-y-2">
                <Label>직군</Label>
                <Input {...register('job_type')} placeholder="영업, 개발, HR..." />
              </div>
              <div className="space-y-2">
                <Label>MBTI</Label>
                <Input {...register('mbti')} placeholder="INTJ" maxLength={4} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 심리 상태 */}
        <Card>
          <CardHeader><CardTitle className="text-base">심리 상태</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>스트레스 수준</Label>
                <span className="text-sm font-medium text-muted-foreground">{stressLevel}/10</span>
              </div>
              <Slider
                value={[stressLevel]}
                onValueChange={(v) => setStressLevel(Array.isArray(v) ? v[0] : v as number)}
                min={1} max={10} step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>낮음</span><span>높음</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>동기부여 수준</Label>
                <span className="text-sm font-medium text-muted-foreground">{motivationLevel}/10</span>
              </div>
              <Slider
                value={[motivationLevel]}
                onValueChange={(v) => setMotivationLevel(Array.isArray(v) ? v[0] : v as number)}
                min={1} max={10} step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>코칭 태도</Label>
              <div className="flex gap-2">
                {[
                  { value: 'cooperative', label: '😊 협조적' },
                  { value: 'defensive', label: '😤 방어적' },
                  { value: 'avoidant', label: '😶 회피적' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('coaching_attitude', value as 'cooperative' | 'defensive' | 'avoidant')}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      attitude === value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-input hover:bg-accent'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 업무 상황 */}
        <Card>
          <CardHeader><CardTitle className="text-base">업무 상황</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>업무 고민</Label>
              <Textarea {...register('work_concerns')} placeholder="현재 겪고 있는 업무상 어려움..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>커리어 고민</Label>
              <Textarea {...register('career_concerns')} placeholder="커리어 관련 고민..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>가치관</Label>
              <Input {...register('values')} placeholder="성장, 안정, 인정..." />
            </div>
            <div className="space-y-2">
              <Label>배경 스토리</Label>
              <Textarea {...register('past_experiences')} placeholder="과거 경험, 현재 상황..." rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* 난이도 미리보기 */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm font-medium">예상 난이도</p>
            <p className="text-xs text-muted-foreground">스트레스 수준 + 코칭 태도 기반</p>
          </div>
          <Badge className={`${
            stressLevel >= 7 || attitude === 'defensive'
              ? 'bg-red-100 text-red-700'
              : stressLevel >= 4 || attitude === 'avoidant'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {stressLevel >= 7 || attitude === 'defensive' ? '고급' : stressLevel >= 4 ? '중급' : '초급'}
          </Badge>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />생성 중...</> : '페르소나 생성'}
        </Button>
      </form>
    </div>
  )
}
