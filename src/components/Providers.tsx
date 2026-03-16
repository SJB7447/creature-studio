'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { queryClient } from '@/lib/queryClient'
import { seedInitialData } from '@/lib/seedData'

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore()
  const seeded = useRef(false)

  useEffect(() => {
    // Handle redirect result from signInWithRedirect
    getRedirectResult(auth).catch(() => {})

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        })

        // 최초 1회 시드 데이터 생성
        if (!seeded.current) {
          seeded.current = true
          try {
            await seedInitialData(firebaseUser.uid)
          } catch (e) {
            // 시드 실패 시 무시 (기존 데이터 있으면 스킵됨)
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
