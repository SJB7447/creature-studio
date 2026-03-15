'use client'

import { useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleGoogleLogin() {
    try {
      setLoading(true)
      await signInWithPopup(auth, googleProvider)
      router.push('/dashboard')
    } catch (error: any) {
      toast.error('로그인 실패: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md p-8"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 mb-4 shadow-2xl shadow-purple-500/20"
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L36 28H4L20 4Z" fill="white" fillOpacity="0.9" />
              <circle cx="20" cy="30" r="6" fill="white" fillOpacity="0.7" />
            </svg>
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-1">CreatureStudio</h1>
          <p className="text-muted-foreground text-sm">AI 기반 애니메이션/영화 제작 워크스테이션</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { icon: '🎬', label: '멀티 프로젝트 관리' },
            { icon: '🤖', label: 'AI 씬 디렉터 에이전트' },
            { icon: '🎨', label: '이미지/영상 프롬프트' },
            { icon: '📋', label: '스토리보드 자동화' },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 border border-border">
              <span className="text-xl">{f.icon}</span>
              <span className="text-xs text-foreground/80 font-medium">{f.label}</span>
            </div>
          ))}
        </div>

        {/* Login Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl bg-white text-gray-900 font-semibold text-sm shadow-lg hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? '로그인 중...' : 'Google로 시작하기'}
        </motion.button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          로그인 시 서비스 이용약관에 동의합니다
        </p>
      </motion.div>
    </div>
  )
}
