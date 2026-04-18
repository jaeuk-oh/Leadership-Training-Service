import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ChatInterface from '@/components/chat/ChatInterface'

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: session } = await supabase
    .from('coaching_sessions')
    .select('*, personas(*)')
    .eq('id', sessionId)
    .eq('user_id', user!.id)
    .single()

  if (!session) notFound()

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at')

  return (
    <ChatInterface
      session={session}
      initialMessages={messages ?? []}
    />
  )
}
