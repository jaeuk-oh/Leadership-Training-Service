'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Coins, Loader2 } from 'lucide-react'

const profileSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  rank: z.string().optional(),
  department: z.string().optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      if (data) reset({ name: data.name ?? '', rank: data.rank ?? '', department: data.department ?? '' })
      setLoading(false)
    }
    load()
  }, [])

  const onSubmit = async (data: ProfileForm) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update(data).eq('id', user.id)
    setSaving(false)
    if (error) {
      toast.error('저장 실패: ' + error.message)
    } else {
      toast.success('저장 완료')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">마이페이지</h1>
        <p className="text-muted-foreground mt-1">프로필 정보를 관리하세요</p>
      </div>

      {/* Points card */}
      <Card>
        <CardContent className="pt-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">보유 포인트</p>
            <p className="text-3xl font-bold mt-0.5">{profile?.points.toLocaleString() ?? 0}P</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
            <Coins className="w-6 h-6 text-yellow-500" />
          </div>
        </CardContent>
      </Card>

      {/* Profile form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">프로필 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>이름</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>직급</Label>
                <Input {...register('rank')} placeholder="팀장" />
              </div>
              <div className="space-y-2">
                <Label>부서</Label>
                <Input {...register('department')} placeholder="영업팀" />
              </div>
            </div>
            {profile?.is_admin && (
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">관리자</Badge>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
