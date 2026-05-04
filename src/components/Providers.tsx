'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { onIdTokenChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { queryClient } from '@/lib/queryClient'
import { seedInitialData } from '@/lib/seedData'
import { saveUserProfile } from '@/lib/firestore'

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore()
  const seeded = useRef(false)
  const supabaseSynced = useRef<string | null>(null)  // 마지막 sync된 uid 추적

  useEffect(() => {
    // onIdTokenChanged: 로그인/로그아웃뿐 아니라 토큰 갱신(~1시간) 시에도 호출됨
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        })

        // 유저 프로필 저장 (초대 시 이메일 검색용)
        saveUserProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
        }).catch(() => {})

        // Supabase users 테이블 upsert (uid 변경 시에만 실행)
        if (supabaseSynced.current !== firebaseUser.uid) {
          supabaseSynced.current = firebaseUser.uid
          fetch('/api/user/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName,
            }),
          }).catch(e => console.error('[Supabase sync]', e))
        }

        // 최초 1회 시드 데이터 생성
        if (!seeded.current) {
          seeded.current = true
          try {
            await seedInitialData(firebaseUser.uid)
          } catch (e) {
            console.error('[Seed] 시드 데이터 생성 실패:', e)
          }
        }
      } else {
        setUser(null)
        supabaseSynced.current = null
      }
      setLoading(false)
    })
    return unsubscribe
  }, [setUser, setLoading])

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}
