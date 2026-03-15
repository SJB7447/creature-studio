'use client'

import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useProjectStore } from '@/store/projectStore'

export function AppHeader() {
  const { user } = useAuthStore()
  const { currentProject } = useProjectStore()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

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
    <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        {currentProject && (
          <>
            <span className="text-muted-foreground">프로젝트</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-white font-medium">{currentProject.title}</span>
          </>
        )}
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg hover:bg-accent transition-colors"
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || ''}
              className="w-7 h-7 rounded-full"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
              {user?.displayName?.[0] || 'U'}
            </div>
          )}
          <span className="text-sm text-white">{user?.displayName}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-xl z-50">
            <div className="p-2">
              <p className="text-xs text-muted-foreground px-2 py-1.5 truncate">{user?.email}</p>
              <hr className="border-border my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground hover:text-white hover:bg-accent rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
