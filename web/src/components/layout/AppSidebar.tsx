'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BarChart2,
  User,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/persona', label: '페르소나', icon: Users },
  { href: '/session', label: '코칭 세션', icon: MessageSquare },
  { href: '/results', label: '평가/결과', icon: BarChart2 },
  { href: '/feedback', label: '피드백', icon: MessageCircle },
  { href: '/profile', label: '마이페이지', icon: User },
]

const adminItems = [
  { href: '/admin', label: '관리자', icon: ShieldCheck },
]

export default function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-card border-r flex flex-col shrink-0">
      <div className="flex items-center gap-2 px-5 py-4 border-b">
        <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center font-bold text-white text-xs">G</div>
        <span className="font-semibold text-sm">GROW Coach</span>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              pathname.startsWith(href)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
        {isAdmin && (
          <>
            <div className="pt-2 pb-1 px-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">관리자</span>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}
