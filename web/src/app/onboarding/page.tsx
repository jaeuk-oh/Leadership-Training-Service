'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const onboardingSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  rank: z.string().min(1, '직급을 입력하세요'),
  department: z.string().min(1, '부서를 입력하세요'),
})

type OnboardingForm = z.infer<typeof onboardingSchema>

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
  })

  // 기존 프로필 값 프리필 (구글 로그인이면 이름은 이미 채워져 있음)
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, rank, department')
        .eq('id', user.id)
        .single()
      if (profile?.rank && profile?.department) {
        router.replace('/dashboard')
        return
      }
      reset({
        name: profile?.name ?? user.user_metadata?.name ?? user.user_metadata?.full_name ?? '',
        rank: profile?.rank ?? '',
        department: profile?.department ?? '',
      })
    }
    load()
  }, [supabase, router, reset])

  const onSubmit = async (data: OnboardingForm) => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const { error } = await supabase
      .from('profiles')
      .update({ name: data.name, rank: data.rank, department: data.department })
      .eq('id', user.id)
    setLoading(false)

    if (error) {
      toast.error('저장 실패: ' + error.message)
      return
    }
    toast.success('프로필이 저장되었습니다.')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md gap-0 px-8 py-10 shadow-xl ring-foreground/5">
        <CardHeader className="px-0 mb-8 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center font-bold text-white text-xl shadow-sm">G</div>
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-bold">프로필 완성</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              코칭을 시작하기 전에 직급과 부서를 입력해주세요.<br />
              코칭 상대(AI)가 이 정보를 바탕으로 반응합니다.
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
          <CardContent className="px-0 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input id="name" className="h-11" placeholder="홍길동" {...register('name')} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rank">직급 *</Label>
                <Input id="rank" className="h-11" placeholder="팀장" {...register('rank')} />
                {errors.rank && <p className="text-sm text-red-500">{errors.rank.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">부서 *</Label>
                <Input id="department" className="h-11" placeholder="영업팀" {...register('department')} />
                {errors.department && <p className="text-sm text-red-500">{errors.department.message}</p>}
              </div>
            </div>
          </CardContent>
          <CardFooter className="px-0 mt-7">
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? '저장 중...' : '시작하기'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
