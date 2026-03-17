'use client'

import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LogOut, ChevronDown, Menu, Bell, Check, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvitationsForUser, acceptInvitation, declineInvitation } from '@/lib/firestore'
import { Invitation } from '@/types'

export function AppHeader() {
  const { user } = useAuthStore()
  const { currentProject } = useProjectStore()
  const { toggleSidebar } = useUIStore()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  // 받은 초대 목록
  const { data: invitations = [] } = useQuery({
    queryKey: ['my-invitations', user?.email],
    queryFn: () => getInvitationsForUser(user!.email!),
    enabled: !!user?.email,
    refetchInterval: 30000, // 30초마다 폴링
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const acceptMutation = useMutation({
    mutationFn: (invId: string) => acceptInvitation(invId, user!.uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('초대를 수락했습니다! 프로젝트 목록에서 확인하세요.')
    },
    onError: (e: any) => toast.error('수락 실패: ' + e.message),
  })

  const declineMutation = useMutation({
    mutationFn: (invId: string) => declineInvitation(invId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] })
      toast.success('초대를 거절했습니다.')
    },
  })

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

      {/* Right: notifications + user menu */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Invitation bell */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen(!bellOpen)}
            className="relative p-2 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <Bell className="w-5 h-5" style={{ color: 'var(--color-text-sub)' }} />
            {invitations.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#EF4444' }}>
                {invitations.length}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 rounded-xl shadow-xl border z-50 max-h-[400px] overflow-y-auto" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>프로젝트 초대</p>
              </div>

              {invitations.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-text-sub)', opacity: 0.4 }} />
                  <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>새로운 초대가 없습니다</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {invitations.map((inv: Invitation) => (
                    <div key={inv.id} className="p-3 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
                      <div className="flex items-start gap-3">
                        {inv.fromUserPhoto ? (
                          <img src={inv.fromUserPhoto} alt="" className="w-8 h-8 rounded-full shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5" style={{ background: 'var(--color-primary-dark)' }}>
                            {inv.fromUserName?.[0] || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                            <span className="font-medium">{inv.fromUserName}</span>님이
                          </p>
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-primary-dark)' }}>
                            {inv.projectTitle}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-sub)' }}>
                            프로젝트에 초대했습니다 · {inv.role === 'editor' ? '편집자' : '뷰어'}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => acceptMutation.mutate(inv.id)}
                              disabled={acceptMutation.isPending}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-medium hover:opacity-90 disabled:opacity-60"
                              style={{ background: 'var(--color-primary-dark)' }}
                            >
                              <Check className="w-3 h-3" />수락
                            </button>
                            <button
                              onClick={() => declineMutation.mutate(inv.id)}
                              disabled={declineMutation.isPending}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:opacity-70"
                              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}
                            >
                              <X className="w-3 h-3" />거절
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
  )
}
