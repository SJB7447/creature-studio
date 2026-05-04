'use client'

import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LogOut, ChevronDown, Menu, HelpCircle } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { HelpModal } from '@/components/help/HelpModal'
import { CreditBadge } from '@/components/credits/CreditBadge'
import { useCreditStore } from '@/store/creditStore'
import { useCredits } from '@/hooks/useCredits'

export function AppHeader() {
  const { user } = useAuthStore()
  const { currentProject } = useProjectStore()
  const { toggleSidebar } = useUIStore()
  const { setShowChargeModal } = useCreditStore()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 크레딧 잔액 초기화 및 주기적 갱신
  useCredits()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    try {
      await signOut(auth)
      router.push('/')
      toast.success('로그아웃되었습니다.')
    } catch {
      toast.error('로그아웃 실패')
    }
  }

  return (
    <>
    <header className="h-14 border-b flex items-center justify-between px-4 sm:px-6 shrink-0" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {/* Left: hamburger + breadcrumb */}
      <div className="flex items-center gap-2 text-sm min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors lg:hidden shrink-0"
        >
          <Menu className="w-5 h-5" style={{ color: 'var(--color-text)' }} />
        </button>
        {currentProject && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline" style={{ color: 'var(--color-text-sub)' }}>프로젝트</span>
            <span className="hidden sm:inline" style={{ color: 'var(--color-border)' }}>/</span>
            <span className="font-medium truncate" style={{ color: 'var(--color-text)' }}>{currentProject.title}</span>
          </div>
        )}
      </div>

      {/* Right: credit badge + notifications + user menu */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Credit badge */}
        <CreditBadge onClick={() => setShowChargeModal(true)} />

        {/* Help button */}
        <button
          onClick={() => setHelpOpen(true)}
          className="p-2 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors"
          title="도움말"
        >
          <HelpCircle className="w-5 h-5" style={{ color: 'var(--color-text-sub)' }} />
        </button>

        {/* Notification bell (invitations + activity) */}
        <NotificationBell />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 sm:gap-2.5 py-1.5 px-2 sm:px-3 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--color-primary-dark)' }}>
                {user?.displayName?.[0] || 'U'}
              </div>
            )}
            <span className="text-sm hidden sm:inline" style={{ color: 'var(--color-text)' }}>{user?.displayName}</span>
            <ChevronDown className="w-3.5 h-3.5 hidden sm:block" style={{ color: 'var(--color-text-sub)' }} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-xl shadow-xl border z-50" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="p-2">
                <p className="text-xs px-2 py-1.5 truncate" style={{ color: 'var(--color-text-sub)' }}>{user?.email}</p>
                <hr style={{ borderColor: 'var(--color-border)' }} className="my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-lg hover:bg-[var(--color-surface-2)] transition-colors"
                  style={{ color: 'var(--color-text-sub)' }}
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

    <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}
