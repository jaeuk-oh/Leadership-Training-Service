import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ResultsView from '@/components/evaluation/ResultsView'

export default async function ResultsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [sessionResult, evalResult, messagesResult, rankingResult] = await Promise.all([
    supabase
      .from('coaching_sessions')
      .select('*, personas(name, difficulty)')
      .eq('id', sessionId)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('evaluation_results')
      .select('*')
      .eq('session_id', sessionId)
      .single(),
    supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at'),
    supabase
      .from('evaluation_results')
      .select('trust_score, profiles(name)')
      .order('trust_score', { ascending: false })
      .limit(10),
  ])

  if (!sessionResult.data) notFound()

  return (
    <ResultsView
      session={sessionResult.data}
      evaluation={evalResult.data}
      messages={messagesResult.data ?? []}
      ranking={rankingResult.data ?? []}
    />
  )
}
