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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full blur-[120px] opacity-40" style={{ background: 'var(--color-primary)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] rounded-full blur-[120px] opacity-30" style={{ background: 'var(--color-accent)' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md px-5 py-8 sm:p-10"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5 shadow-xl"
            style={{ background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))' }}
          >
            <span className="text-white text-3xl font-bold">C</span>
          </motion.div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>CreatureStudio</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>AI 기반 애니메이션/영화 제작 워크스테이션</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { icon: '🎬', label: '멀티 프로젝트 관리' },
            { icon: '🤖', label: 'AI 씬 디렉터 에이전트' },
            { icon: '🎨', label: '이미지/영상 프롬프트' },
            { icon: '📋', label: '스토리보드 자동화' },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-2.5 p-3.5 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <span className="text-xl">{f.icon}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{f.label}</span>
            </div>
          ))}
        </div>

        {/* Login */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl font-semibold text-sm shadow-lg transition-colors disabled:opacity-60"
          style={{ background: 'var(--color-primary-dark)', color: 'white' }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#fff" fillOpacity="0.9" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#fff" fillOpacity="0.7" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fff" fillOpacity="0.6" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#fff" fillOpacity="0.8" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? '로그인 중...' : 'Google로 시작하기'}
        </motion.button>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--color-text-sub)' }}>
          로그인 시 서비스 이용약관에 동의합니다
        </p>
      </motion.div>
    </div>
  )
}
