'use client'

import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Wand2, Layers, User, Sparkles, Film, Zap,
  ArrowRight, ChevronRight, CheckCircle, Play,
} from 'lucide-react'

// ─── 데이터 ────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Wand2,
    title: 'AI 씬 이미지 자동 생성',
    desc: '씬 설명을 입력하면 Gemini & Imagen 3가 스토리보드 이미지 4장을 즉시 생성합니다.',
    color: '#7C3AED', bg: 'rgba(124,58,237,0.08)',
  },
  {
    icon: User,
    title: '캐릭터 레퍼런스 시스템',
    desc: '캐릭터 정보를 한 번 등록하면, 모든 씬에서 동일한 외형으로 일관성 있게 생성됩니다.',
    color: '#0EA5E9', bg: 'rgba(14,165,233,0.08)',
  },
  {
    icon: Layers,
    title: '에피소드 & 씬 체계 관리',
    desc: '시리즈 전체 구조를 에피소드/씬 단위로 관리하고, 상태를 실시간으로 추적합니다.',
    color: '#10B981', bg: 'rgba(16,185,129,0.08)',
  },
  {
    icon: Sparkles,
    title: 'AI 에이전트 스크립트 작성',
    desc: '씬 정보를 기반으로 AI가 대사·지문·카메라 지시까지 포함한 스크립트를 자동 작성합니다.',
    color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',
  },
  {
    icon: Film,
    title: '멀티 모델 이미지 라우팅',
    desc: 'Gemini Flash·Pro, Imagen 3 등 상황에 맞는 최적 모델을 자동 선택해 품질과 비용을 최적화합니다.',
    color: '#EF4444', bg: 'rgba(239,68,68,0.08)',
  },
  {
    icon: Zap,
    title: '크레딧 기반 투명 과금',
    desc: '사용한 만큼만 지불합니다. 이미지 생성 8CR, 고품질 18CR — 요금이 명확합니다.',
    color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)',
  },
]

const STEPS = [
  {
    n: '01',
    title: '프로젝트 & 캐릭터 설정',
    desc: '프로젝트를 만들고 캐릭터 정보(외형, 스타일, 색상)를 등록합니다. AI가 이 정보를 학습합니다.',
  },
  {
    n: '02',
    title: 'AI로 씬 이미지 생성',
    desc: '에피소드와 씬을 구성하고, AI 에이전트가 스크립트와 이미지 프롬프트를 자동으로 생성합니다.',
  },
  {
    n: '03',
    title: '스토리보드 완성 & 내보내기',
    desc: '마음에 드는 이미지를 확정하고, PDF·영상·문서 형식으로 스토리보드를 완성합니다.',
  },
]

const PACKAGES = [
  { credits: 100,   amount: '1,500',  label: '스타터',  desc: '맛보기 체험' },
  { credits: 500,   amount: '6,900',  label: '베이직',  desc: '소규모 제작', popular: true },
  { credits: 1_000, amount: '12,900', label: '스탠다드', desc: '시리즈 제작' },
  { credits: 3_000, amount: '35,900', label: '프로',    desc: '스튜디오 제작' },
]

// ─── 섹션 애니메이션 훅 ──────────────────────────────────────
function useFadeInView() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return { ref, inView }
}

// ─── 구글 로그인 버튼 ────────────────────────────────────────
function GoogleLoginButton({ label = 'Google로 무료 시작하기', size = 'lg' }: { label?: string; size?: 'sm' | 'lg' }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    try {
      setLoading(true)
      await signInWithPopup(auth, googleProvider)
      router.push('/dashboard')
    } catch (e: any) {
      if (e.code !== 'auth/popup-closed-by-user') toast.error('로그인 실패: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const base = 'inline-flex items-center justify-center gap-2.5 font-semibold rounded-xl transition-all hover:opacity-90 active:scale-95'
  const sizes = size === 'lg'
    ? 'px-7 py-4 text-base'
    : 'px-5 py-2.5 text-sm'

  return (
    <button onClick={handleLogin} disabled={loading}
      className={`${base} ${sizes} disabled:opacity-60`}
      style={{ background: '#7C3AED', color: 'white' }}>
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#fff" fillOpacity=".9" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#fff" fillOpacity=".7" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#fff" fillOpacity=".6" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#fff" fillOpacity=".8" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      )}
      {loading ? '로그인 중...' : label}
    </button>
  )
}

// ─── 메인 랜딩 페이지 ─────────────────────────────────────────
export function LandingPage() {
  const features = useFadeInView()
  const steps    = useFadeInView()
  const pricing  = useFadeInView()

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>

      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md"
        style={{ background: 'rgba(var(--color-bg-rgb, 255,255,255), 0.85)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: '#7C3AED' }}>C</div>
            <span className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>CreatureStudio</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: 'var(--color-text-sub)' }}>
            <a href="#features" className="hover:opacity-70 transition-opacity">기능</a>
            <a href="#how" className="hover:opacity-70 transition-opacity">작동 방식</a>
            <a href="#pricing" className="hover:opacity-70 transition-opacity">요금제</a>
          </nav>
          <GoogleLoginButton label="무료 시작" size="sm" />
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 px-5 overflow-hidden text-center">
        {/* Background orbs */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px] opacity-20 pointer-events-none"
          style={{ background: '#7C3AED' }} />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] rounded-full blur-[140px] opacity-15 pointer-events-none"
          style={{ background: '#06B6D4' }} />

        <div className="relative max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mb-6"
              style={{ background: 'rgba(124,58,237,0.1)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.2)' }}>
              <Sparkles className="w-3 h-3" /> Gemini & Imagen 3 탑재 · 무료 200 CR 제공
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-5"
            style={{ color: 'var(--color-text)' }}>
            AI로 스토리보드를<br />
            <span style={{ color: '#7C3AED' }}>10배 빠르게</span> 완성하세요
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl mb-8 max-w-2xl mx-auto leading-relaxed"
            style={{ color: 'var(--color-text-sub)' }}>
            애니메이션·영화 제작자를 위한 AI 프로덕션 워크스테이션.<br className="hidden sm:block" />
            씬 설명 하나로 이미지 생성부터 스크립트 작성까지 자동으로.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <GoogleLoginButton />
            <a href="#how"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-xl text-base font-semibold border transition-all hover:opacity-70"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}>
              <Play className="w-4 h-4" /> 작동 방식 보기
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-4 text-xs" style={{ color: 'var(--color-text-sub)' }}>
            신용카드 불필요 · 가입 즉시 200 CR 무료 제공
          </motion.p>

          {/* Preview card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-14 rounded-2xl border overflow-hidden shadow-2xl mx-auto max-w-3xl"
            style={{ borderColor: 'rgba(124,58,237,0.2)', background: 'var(--color-surface)' }}>
            {/* Mock browser bar */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 mx-4 h-6 rounded-md" style={{ background: 'var(--color-border)' }} />
            </div>
            {/* Mock content */}
            <div className="p-5 grid grid-cols-3 gap-3">
              {[
                { c: '#7C3AED', label: '씬 01 · 도입부', h: 'h-28' },
                { c: '#0EA5E9', label: '씬 02 · 갈등 시작', h: 'h-28' },
                { c: '#10B981', label: '씬 03 · 클라이막스', h: 'h-28' },
              ].map((s, i) => (
                <div key={i} className={`${s.h} rounded-xl flex flex-col items-center justify-center gap-2`}
                  style={{ background: s.c + '15', border: `1px solid ${s.c}30` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: s.c }}>
                    <Film className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: s.c }}>{s.label}</span>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5 flex items-center gap-2">
              <div className="flex-1 h-8 rounded-lg" style={{ background: 'var(--color-surface-2)' }} />
              <div className="px-4 h-8 rounded-lg flex items-center gap-1.5 text-xs font-semibold text-white"
                style={{ background: '#7C3AED' }}>
                <Wand2 className="w-3.5 h-3.5" /> AI 생성
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div ref={features.ref} className="text-center mb-12">
            <motion.h2 initial={{ opacity: 0, y: 20 }} animate={features.inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-4xl font-extrabold mb-3" style={{ color: 'var(--color-text)' }}>
              제작에 필요한 모든 것
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={features.inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-base" style={{ color: 'var(--color-text-sub)' }}>
              기획부터 완성까지, CreatureStudio 하나로 끝냅니다.
            </motion.p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={features.inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.07 }}
                  className="p-5 rounded-2xl border transition-all hover:shadow-md"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: f.bg }}>
                    <Icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--color-text)' }}>{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>{f.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-20 px-5" style={{ background: 'var(--color-surface)' }}>
        <div className="max-w-5xl mx-auto">
          <div ref={steps.ref} className="text-center mb-12">
            <motion.h2 initial={{ opacity: 0, y: 20 }} animate={steps.inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-4xl font-extrabold mb-3" style={{ color: 'var(--color-text)' }}>
              3단계로 스토리보드 완성
            </motion.h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <motion.div key={s.n}
                initial={{ opacity: 0, y: 20 }}
                animate={steps.inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative p-6 rounded-2xl border"
                style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}>
                {i < 2 && (
                  <ChevronRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 z-10"
                    style={{ color: '#7C3AED' }} />
                )}
                <div className="text-3xl font-black mb-3 opacity-10" style={{ color: '#7C3AED' }}>{s.n}</div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--color-text)' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <div ref={pricing.ref} className="text-center mb-12">
            <motion.h2 initial={{ opacity: 0, y: 20 }} animate={pricing.inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-4xl font-extrabold mb-3" style={{ color: 'var(--color-text)' }}>
              사용한 만큼만 지불하세요
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={pricing.inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-base" style={{ color: 'var(--color-text-sub)' }}>
              가입 시 200 CR 무료 · 이미지 생성 8~18 CR · 스크립트 작성 10 CR
            </motion.p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {PACKAGES.map((p, i) => (
              <motion.div key={p.label}
                initial={{ opacity: 0, y: 20 }}
                animate={pricing.inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="relative p-5 rounded-2xl border flex flex-col items-center text-center"
                style={{
                  background: p.popular ? '#7C3AED' : 'var(--color-surface)',
                  borderColor: p.popular ? '#7C3AED' : 'var(--color-border)',
                }}>
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2.5 py-1 rounded-full">
                    가장 인기
                  </span>
                )}
                <div className="text-xs font-semibold mb-1" style={{ color: p.popular ? 'rgba(255,255,255,0.7)' : 'var(--color-text-sub)' }}>
                  {p.label}
                </div>
                <div className="flex items-end gap-0.5 mb-1">
                  <Zap className="w-4 h-4 mb-0.5" style={{ color: p.popular ? '#FDE68A' : '#F59E0B' }} />
                  <span className="text-2xl font-extrabold" style={{ color: p.popular ? 'white' : 'var(--color-text)' }}>
                    {p.credits.toLocaleString()}
                  </span>
                  <span className="text-xs mb-0.5 ml-0.5" style={{ color: p.popular ? 'rgba(255,255,255,0.7)' : 'var(--color-text-sub)' }}>CR</span>
                </div>
                <div className="text-lg font-bold mb-1" style={{ color: p.popular ? 'white' : 'var(--color-text)' }}>
                  ₩{p.amount}
                </div>
                <div className="text-[11px]" style={{ color: p.popular ? 'rgba(255,255,255,0.6)' : 'var(--color-text-sub)' }}>
                  {p.desc}
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={pricing.inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6 flex flex-wrap justify-center gap-4 text-sm"
            style={{ color: 'var(--color-text-sub)' }}>
            {['크레딧 만료 없음', '언제든 추가 구매 가능', 'TossPayments 안전 결제'].map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                {t}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 px-5 text-center" style={{ background: '#7C3AED' }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            지금 바로 시작해보세요
          </h2>
          <p className="text-purple-200 text-base mb-8">
            가입 즉시 200 크레딧 무료 제공.<br />
            신용카드 없이 바로 AI 이미지 생성을 경험하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <GoogleLoginButton label="Google로 무료 시작하기" />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-5 border-t" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ background: '#7C3AED' }}>C</div>
            <span className="font-bold" style={{ color: 'var(--color-text)' }}>CreatureStudio</span>
          </div>
          <div className="flex gap-5 text-sm" style={{ color: 'var(--color-text-sub)' }}>
            <a href="#" className="hover:opacity-70">이용약관</a>
            <a href="#" className="hover:opacity-70">개인정보처리방침</a>
            <a href="#" className="hover:opacity-70">문의하기</a>
          </div>
          <div className="text-xs" style={{ color: 'var(--color-text-sub)' }}>
            © 2026 CreatureStudio. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
