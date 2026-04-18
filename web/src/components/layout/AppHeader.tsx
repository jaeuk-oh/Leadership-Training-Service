'use client'

import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Coins, LogOut, UserIcon } from 'lucide-react'
import DarkModeToggle from './DarkModeToggle'

interface AppHeaderProps {
  user: User
  profile: Profile | null
}

export default function AppHeader({ user, profile }: AppHeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile?.name
    ? profile.name.slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <header className="h-14 border-b flex items-center justify-between px-6 bg-background">
      <div />
      <div className="flex items-center gap-3">
        <DarkModeToggle />
        {profile && (
          <Badge variant="secondary" className="gap-1.5">
            <Coins className="w-3.5 h-3.5 text-yellow-500" />
            <span>{profile.points.toLocaleString()}P</span>
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" className="relative h-8 w-8 rounded-full p-0" />}>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-blue-100 text-blue-700">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{profile?.name ?? '사용자'}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <UserIcon className="w-4 h-4 mr-2" />
              마이페이지
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-500 focus:text-red-500">
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
