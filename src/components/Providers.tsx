'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { queryClient } from '@/lib/queryClient'
import { seedInitialData } from '@/lib/seedData'
import { saveUserProfile } from '@/lib/firestore'

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore()
  const seeded = useRef(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
