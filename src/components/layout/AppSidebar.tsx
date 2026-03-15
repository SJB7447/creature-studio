'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Film, Users, Settings } from 'lucide-react'
import { useProjectStore } from '@/store/projectStore'

const navItems = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { currentProject } = useProjectStore()

  return (
    <aside className="w-56 border-r border-border bg-card flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L36 28H4L20 4Z" fill="white" fillOpacity="0.9" />
              <circle cx="20" cy="30" r="6" fill="white" fillOpacity="0.7" />
            </svg>
          </div>
          <span className="font-bold text-white text-sm">CreatureStudio</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === item.href
                ? 'bg-accent text-white font-medium'
                : 'text-muted-foreground hover:text-white hover:bg-accent/50'
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}

        {/* Current project sub-nav */}
        {currentProject && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground px-3 mb-2 truncate font-medium">
              {currentProject.title}
            </p>
            {[
              { href: `/projects/${currentProject.id}`, label: '에피소드', icon: Film },
              { href: `/projects/${currentProject.id}/characters`, label: '캐릭터', icon: Users },
              { href: `/projects/${currentProject.id}/settings`, label: '설정', icon: Settings },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                  pathname === item.href
                    ? 'bg-accent text-white font-medium'
                    : 'text-muted-foreground hover:text-white hover:bg-accent/50'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </aside>
  )
}
