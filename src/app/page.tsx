'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { LandingPage } from '@/components/landing/LandingPage'

export default function Home() {
  const { user, loading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LandingPage />
  }

  return null
}
