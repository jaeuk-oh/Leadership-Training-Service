import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PersonaGrid from '@/components/persona/PersonaGrid'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function PersonaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const query = supabase
    .from('personas')
    .select('*')
    .order('difficulty')

  const { data: personas, error: personaError } = user
    ? await query.or(`is_preset.eq.true,created_by.eq.${user.id}`)
    : await query.eq('is_preset', true)

  if (personaError) console.error('[persona page error]', personaError)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">페르소나 선택</h1>
          <p className="text-muted-foreground mt-1">
            코칭을 실습할 페르소나를 선택하세요. 각 페르소나는 실제 직장 상황을 반영합니다.
          </p>
        </div>
        <Link href="/persona/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            커스텀 만들기
          </Button>
        </Link>
      </div>
      <PersonaGrid personas={personas ?? []} />
    </div>
  )
}
