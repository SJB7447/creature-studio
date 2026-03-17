'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Film, Users, Settings, LayoutGrid, Library, Download, Clapperboard, X } from 'lucide-react'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'

const navItems = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { currentProject, currentEpisode, currentScene } = useProjectStore()
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  const projectNav = currentProject ? [
    { href: `/projects/${currentProject.id}`, label: '에피소드', icon: Film },
    { href: `/projects/${currentProject.id}/characters`, label: '캐릭터', icon: Users },
    { href: `/projects/${currentProject.id}/library`, label: '라이브러리', icon: Library },
    { href: `/projects/${currentProject.id}/export`, label: '내보내기', icon: Download },
    { href: `/projects/${currentProject.id}/settings`, label: '설정', icon: Settings },
  ] : []

  const episodeNav = currentProject && currentEpisode ? [
    ...(currentScene ? [{
      href: `/projects/${currentProject.id}/episodes/${currentEpisode.id}/scenes/${currentScene.id}`,
      label: '씬 에디터',
      icon: Clapperboard,
    }] : []),
    {
      href: `/projects/${currentProject.id}/episodes/${currentEpisode.id}/storyboard`,
      label: '스토리보드',
      icon: LayoutGrid,
    },
  ] : []

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  function handleNavClick() {
    setSidebarOpen(false)
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'w-56 border-r flex flex-col shrink-0 z-50',
          // Mobile: fixed overlay, hidden by default
          'fixed inset-y-0 left-0 transition-transform duration-200 lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={handleNavClick}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary-dark)' }}>
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>CreatureStudio</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:opacity-70 lg:hidden"
          >
            <X className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive(item.href)
                  ? 'font-medium'
                  : 'hover:bg-[var(--color-surface-2)]'
              )}
              style={{
                background: isActive(item.href) ? 'var(--color-surface-2)' : undefined,
                color: isActive(item.href) ? 'var(--color-primary-dark)' : 'var(--color-text-sub)',
              }}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}

          {currentProject && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-[11px] px-3 mb-2 truncate font-semibold" style={{ color: 'var(--color-text-sub)' }}>
                {currentProject.title}
              </p>
              {projectNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive(item.href) ? 'font-medium' : 'hover:bg-[var(--color-surface-2)]'
                  )}
                  style={{
                    background: isActive(item.href) ? 'var(--color-surface-2)' : undefined,
                    color: isActive(item.href) ? 'var(--color-primary-dark)' : 'var(--color-text-sub)',
                  }}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          {episodeNav.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-[11px] px-3 mb-2 truncate font-semibold" style={{ color: 'var(--color-text-sub)' }}>
                EP.{currentEpisode?.number} {currentEpisode?.title}
              </p>
              {episodeNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive(item.href) ? 'font-medium' : 'hover:bg-[var(--color-surface-2)]'
                  )}
                  style={{
                    background: isActive(item.href) ? 'var(--color-surface-2)' : undefined,
                    color: isActive(item.href) ? 'var(--color-primary-dark)' : 'var(--color-text-sub)',
                  }}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </nav>
      </aside>
    </>
  )
}
