'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useCreditStore } from '@/store/creditStore'
import { createProject } from '@/lib/firestore'
import { toast } from 'sonner'
import {
  Sparkles, Film, BookOpen, GraduationCap, Tv2, ChevronRight,
  ChevronLeft, Wand2, Layers, User, CheckCircle, Zap, Clapperboard,
} from 'lucide-react'

// ─── 타입 ─────────────────────────────────────────────────────
type ProductionType = 'animation' | 'short_film' | 'web_drama' | 'education' | 'other'

interface OnboardingState {
  productionType: ProductionType | null
  projectTitle: string
  projectGenre: string[]
}

// ─── 상수 ─────────────────────────────────────────────────────
const PRODUCTION_TYPES = [
  { id: 'animation',  label: '애니메이션',   icon: Sparkles, desc: '2D/3D 애니메이션 시리즈' },
  { id: 'short_film', label: '단편 영화',     icon: Film,     desc: '실사 또는 혼합 매체' },
  { id: 'web_drama',  label: '웹 드라마',     icon: Tv2,      desc: '웹 시리즈 & 웹툰 원작' },
  { id: 'education',  label: '교육 콘텐츠',  icon: GraduationCap, desc: '어린이 & 학습 콘텐츠' },
  { id: 'other',      label: '기타',          icon: BookOpen,  desc: '그 외 영상 프로젝트' },
] as const

const GENRES = ['판타지', '힐링', '코미디', '드라마', '액션', '미스터리', '로맨스', '교육']

const FEATURES = [
  {
    icon: Wand2,
    title: 'AI 이미지 생성',
    desc: '씬 설명만 입력하면 AI가 스토리보드 이미지를 자동으로 생성합니다.',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    icon: User,
    title: '캐릭터 레퍼런스 시스템',
    desc: '캐릭터 정보를 등록하면 씬마다 일관된 외형으로 이미지가 생성됩니다.',
    color: '#0EA5E9',
    bg: '#F0F9FF',
  },
  {
    icon: Layers,
    title: '에피소드 · 씬 구성',
    desc: '에피소드와 씬을 체계적으로 관리하고 AI 에이전트로 스크립트를 자동 작성합니다.',
    color: '#10B981',
    bg: '#ECFDF5',
  },
]

// ─── 온보딩 페이지 ─────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { setCredits, setOnboardingCompleted } = useCreditStore()

  const [step, setStep] = useState(1)
  const [state, setState] = useState<OnboardingState>({
    productionType: null,
    projectTitle: '',
    projectGenre: [],
  })
  const [creating, setCreating] = useState(false)
  const [bonusAmount, setBonusAmount] = useState(0)

  const totalSteps = 5

  async function handleComplete() {
    if (!user?.uid) return
    setCreating(true)
    try {
      // 1. 첫 프로젝트 생성 (제목이 있을 때만)
      if (state.projectTitle.trim()) {
        await createProject({
          title:          state.projectTitle.trim(),
          titleEn:        '',
          type:           'animation',
          genre:          state.projectGenre,
          targetAudience: '',
          status:         'in_development',
          ownerId:        user.uid,
          collaborators:  [],
          artContext: {
            style:              '',
            colorPalette:       [],
            moodKeywords:       [],
            prohibitedElements: [],
            referenceWorks:     [],
            aspectRatio:        '16:9',
            frameRate:          '24fps',
          },
          productionInfo: {
            broadcaster:   '',
            runtime:       '',
            totalEpisodes: 1,
          },
        })
      }

      // 2. 온보딩 완료 API
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, productionType: state.productionType }),
      })
      const data = await res.json()
      if (data.bonusGiven) {
        setBonusAmount(data.bonusAmount)
        if (data.remainingCredits != null) setCredits(data.remainingCredits)
      }

      setOnboardingCompleted(true)
      setStep(5)
    } catch (e: any) {
      toast.error('오류가 발생했습니다: ' + e.message)
    } finally {
      setCreating(false)
    }
  }

  function toggleGenre(g: string) {
    setState(s => ({
      ...s,
      projectGenre: s.projectGenre.includes(g)
        ? s.projectGenre.filter(x => x !== g)
        : [...s.projectGenre, g],
    }))
  }

  const variants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%)' }}>

      {/* Progress bar */}
      <div className="w-full max-w-md mb-6">
        <div className="flex items-center justify-between text-xs mb-2" style={{ color: '#7C3AED' }}>
          <span className="font-medium">CreatureStudio 시작하기</span>
          <span>{Math.min(step, 4)} / 4</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E9D5FF' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: '#7C3AED' }}
            animate={{ width: `${(Math.min(step, 4) / 4) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl shadow-xl border overflow-hidden"
        style={{ background: 'white', borderColor: '#E9D5FF' }}>

        <AnimatePresence mode="wait">
          {/* ── STEP 1: Welcome ── */}
          {step === 1 && (
            <motion.div key="step1" variants={variants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3 }} className="p-8 text-center">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: '#7C3AED' }}>
                <Clapperboard className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: '#1E1B4B' }}>
                CreatureStudio에<br />오신 걸 환영합니다!
              </h1>
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#6B7280' }}>
                AI로 스토리보드를 만들고, 캐릭터를 관리하고,<br />
                에피소드 전체를 체계적으로 제작하세요.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { label: 'AI 이미지 생성', icon: '🎨' },
                  { label: '캐릭터 관리', icon: '👤' },
                  { label: '스토리보드', icon: '🎬' },
                ].map(f => (
                  <div key={f.label} className="p-3 rounded-xl text-center"
                    style={{ background: '#F5F3FF' }}>
                    <div className="text-2xl mb-1">{f.icon}</div>
                    <div className="text-[11px] font-medium" style={{ color: '#7C3AED' }}>{f.label}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(2)}
                className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2"
                style={{ background: '#7C3AED' }}>
                시작하기 <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ── STEP 2: Production Type ── */}
          {step === 2 && (
            <motion.div key="step2" variants={variants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3 }} className="p-8">
              <h2 className="text-xl font-bold mb-1" style={{ color: '#1E1B4B' }}>어떤 콘텐츠를 만드시나요?</h2>
              <p className="text-sm mb-5" style={{ color: '#6B7280' }}>AI가 제작 유형에 맞게 최적화됩니다.</p>
              <div className="space-y-2 mb-6">
                {PRODUCTION_TYPES.map(type => {
                  const Icon = type.icon
                  const selected = state.productionType === type.id
                  return (
                    <button key={type.id}
                      onClick={() => setState(s => ({ ...s, productionType: type.id as ProductionType }))}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left"
                      style={{
                        borderColor: selected ? '#7C3AED' : '#E5E7EB',
                        background: selected ? '#F5F3FF' : 'white',
                      }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: selected ? '#7C3AED' : '#F3F4F6' }}>
                        <Icon className="w-4.5 h-4.5" style={{ color: selected ? 'white' : '#6B7280' }} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: selected ? '#7C3AED' : '#1E1B4B' }}>
                          {type.label}
                        </div>
                        <div className="text-xs" style={{ color: '#9CA3AF' }}>{type.desc}</div>
                      </div>
                      {selected && <CheckCircle className="w-4 h-4 ml-auto" style={{ color: '#7C3AED' }} />}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl border font-semibold text-sm flex items-center justify-center gap-1"
                  style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
                  <ChevronLeft className="w-4 h-4" /> 이전
                </button>
                <button onClick={() => setStep(3)} disabled={!state.productionType}
                  className="flex-1 py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-1 disabled:opacity-40"
                  style={{ background: '#7C3AED' }}>
                  다음 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: First Project ── */}
          {step === 3 && (
            <motion.div key="step3" variants={variants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3 }} className="p-8">
              <h2 className="text-xl font-bold mb-1" style={{ color: '#1E1B4B' }}>첫 프로젝트를 만들어볼까요?</h2>
              <p className="text-sm mb-5" style={{ color: '#6B7280' }}>나중에 추가하거나 이름을 바꿀 수 있어요.</p>

              <div className="mb-4">
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#374151' }}>
                  프로젝트 이름 *
                </label>
                <input
                  value={state.projectTitle}
                  onChange={e => setState(s => ({ ...s, projectTitle: e.target.value }))}
                  placeholder="예: 토닥토닥 도티 선생님"
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm focus:outline-none transition-colors"
                  style={{
                    borderColor: state.projectTitle ? '#7C3AED' : '#E5E7EB',
                    color: '#1E1B4B',
                  }}
                />
              </div>

              <div className="mb-6">
                <label className="block text-xs font-medium mb-2" style={{ color: '#374151' }}>
                  장르 (선택, 복수 가능)
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(g => {
                    const sel = state.projectGenre.includes(g)
                    return (
                      <button key={g} onClick={() => toggleGenre(g)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all"
                        style={{
                          borderColor: sel ? '#7C3AED' : '#E5E7EB',
                          background: sel ? '#7C3AED' : 'white',
                          color: sel ? 'white' : '#6B7280',
                        }}>
                        {g}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-xl border font-semibold text-sm flex items-center justify-center gap-1"
                  style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
                  <ChevronLeft className="w-4 h-4" /> 이전
                </button>
                <button onClick={() => setStep(4)}
                  disabled={!state.projectTitle.trim()}
                  className="flex-1 py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-1 disabled:opacity-40"
                  style={{ background: '#7C3AED' }}>
                  다음 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <button onClick={() => setStep(4)}
                className="w-full mt-2 py-2 text-xs text-center"
                style={{ color: '#9CA3AF' }}>
                건너뛰기
              </button>
            </motion.div>
          )}

          {/* ── STEP 4: Feature Tour ── */}
          {step === 4 && (
            <motion.div key="step4" variants={variants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3 }} className="p-8">
              <h2 className="text-xl font-bold mb-1" style={{ color: '#1E1B4B' }}>핵심 기능 소개</h2>
              <p className="text-sm mb-5" style={{ color: '#6B7280' }}>이런 기능으로 제작을 돕습니다.</p>
              <div className="space-y-3 mb-6">
                {FEATURES.map((f, i) => {
                  const Icon = f.icon
                  return (
                    <motion.div key={f.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 p-4 rounded-xl"
                      style={{ background: f.bg }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: f.color }}>
                        <Icon className="w-4.5 h-4.5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold mb-0.5" style={{ color: f.color }}>{f.title}</div>
                        <div className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>{f.desc}</div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(3)}
                  className="flex-1 py-3 rounded-xl border font-semibold text-sm flex items-center justify-center gap-1"
                  style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
                  <ChevronLeft className="w-4 h-4" /> 이전
                </button>
                <button onClick={handleComplete} disabled={creating}
                  className="flex-1 py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: '#7C3AED' }}>
                  {creating
                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />준비 중...</>
                    : <>시작하기 <ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 5: Complete ── */}
          {step === 5 && (
            <motion.div key="step5" variants={variants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3 }} className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: '#ECFDF5' }}>
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#1E1B4B' }}>준비 완료!</h2>
              <p className="text-sm mb-5" style={{ color: '#6B7280' }}>
                CreatureStudio의 모든 기능을 사용할 수 있습니다.
              </p>

              {bonusAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl mb-6 mx-auto"
                  style={{ background: '#FEF9C3', border: '1px solid #FDE047' }}>
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <span className="font-bold text-base" style={{ color: '#92400E' }}>
                    웰컴 보너스 +{bonusAmount} CR 지급!
                  </span>
                </motion.div>
              )}

              <button
                onClick={() => router.replace('/dashboard')}
                className="w-full py-3 rounded-xl text-white font-semibold text-base"
                style={{ background: '#7C3AED' }}>
                CreatureStudio 시작하기 🎬
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
