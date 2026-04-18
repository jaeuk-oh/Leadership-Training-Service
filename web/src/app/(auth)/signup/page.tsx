'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const signupSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  email: z.string().email('유효한 이메일을 입력하세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  rank: z.string().optional(),
  department: z.string().optional(),
})

type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupForm) => {
    setLoading(true)
    const { error: signUpError, data: authData } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (signUpError) {
      toast.error('회원가입 실패: ' + signUpError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      await supabase.from('profiles').update({
        name: data.name,
        rank: data.rank || null,
        department: data.department || null,
      }).eq('id', authData.user.id)
    }

    setLoading(false)
    toast.success('회원가입 완료! 이메일을 확인하여 인증을 완료해주세요.')
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">회원가입</CardTitle>
          <CardDescription>GROW 코칭 실습을 시작해보세요</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input id="name" placeholder="홍길동" {...register('name')} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rank">직급</Label>
                <Input id="rank" placeholder="팀장" {...register('rank')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">부서</Label>
                <Input id="department" placeholder="영업팀" {...register('department')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input id="email" type="email" placeholder="name@company.com" {...register('email')} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 *</Label>
              <Input id="password" type="password" placeholder="6자 이상" {...register('password')} />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '처리 중...' : '회원가입'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                로그인
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
