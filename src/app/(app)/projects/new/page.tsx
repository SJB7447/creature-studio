'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { createProject } from '@/lib/firestore'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { ChevronRight, ChevronLeft, Check, Film, Palette, Tv, User } from 'lucide-react'
import { ProjectType, ProjectStatus } from '@/types'

interface FormData {
  title: string
  titleEn: string
  type: ProjectType
  genre: string
  targetAudience: string
  status: ProjectStatus
  artStyle: string
  moodKeywords: string
  prohibitedElements: string
  referenceWorks: string
  aspectRatio: '16:9' | '9:16' | '1:1' | '2.39:1'
  frameRate: '24fps' | '30fps' | '60fps'
  broadcaster: string
  runtime: string
  totalEpisodes: number
  submissionDeadline: string
}

const STEPS = [
  { id: 0, label: '기본 정보', icon: Film },
  { id: 1, label: '아트 컨텍스트', icon: Palette },
  { id: 2, label: '제작 정보', icon: Tv },
]

export default function NewProjectPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [step, setStep] = useState(0)
  const { register, handleSubmit, trigger, getValues } = useForm<FormData>({
    defaultValues: {
      type: 'animation',
      status: 'development',
      aspectRatio: '16:9',
      frameRate: '24fps',
      totalEpisodes: 1,
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return createProject({
        title: data.title,
        titleEn: data.titleEn,
        type: data.type,
        genre: data.genre.split(',').map(g => g.trim()).filter(Boolean),
        targetAudience: data.targetAudience,
        status: data.status,
        artContext: {
          style: data.artStyle,
          colorPalette: [],
          moodKeywords: data.moodKeywords.split(',').map(k => k.trim()).filter(Boolean),
          prohibitedElements: data.prohibitedElements.split(',').map(e => e.trim()).filter(Boolean),
          referenceWorks: data.referenceWorks.split(',').map(r => r.trim()).filter(Boolean),
          aspectRatio: data.aspectRatio,
          frameRate: data.frameRate,
        },
        productionInfo: {
          broadcaster: data.broadcaster,
          runtime: data.runtime,
          totalEpisodes: Number(data.totalEpisodes),
          submissionDeadline: data.submissionDeadline || undefined,
        },
        ownerId: user!.uid,
        collaborators: [],
      })
    },
    onSuccess: (projectId) => {
      toast.success('프로젝트가 생성되었습니다!')
      router.push(`/projects/${projectId}`)
    },
    onError: (e: any) => toast.error('생성 실패: ' + e.message),
  })

  async function nextStep() {
    const fields: Record<number, (keyof FormData)[]> = {
      0: ['title', 'titleEn'],
      1: [],
      2: [],
    }
    const valid = await trigger(fields[step])
    if (valid) setStep(s => s + 1)
  }

  const inputCls = "w-full px-3 py-2.5 rounded-lg bg-accent border border-border text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500 transition-colors"
  const selectCls = "w-full px-3 py-2.5 rounded-lg bg-accent border border-border text-white text-sm focus:outline-none focus:border-purple-500"
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1.5"

  return (
    <div className="min-h-full p-6 flex items-start justify-center">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">새 프로젝트 만들기</h1>
          <p className="text-muted-foreground text-sm">프로젝트 정보를 입력하면 AI 생성에 자동 반영됩니다.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                step === i ? 'bg-purple-600 text-white' :
                step > i ? 'bg-green-500/20 text-green-400' :
                'bg-accent text-muted-foreground'
              }`}>
                {step > i ? <Check className="w-3 h-3" /> : <s.icon className="w-3 h-3" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-6 ${step > i ? 'bg-green-500/50' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(d => createMutation.mutate(d))}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Step 0: Basic Info */}
            {step === 0 && (
              <div className="space-y-4 p-6 rounded-2xl border border-border bg-card">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>작품명 *</label>
                    <input {...register('title', { required: true })} placeholder="상상동물병원" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>영문명 *</label>
                    <input {...register('titleEn', { required: true })} placeholder="Imagination Animal Hospital" className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>타입</label>
                    <select {...register('type')} className={selectCls}>
                      <option value="animation">애니메이션</option>
                      <option value="film">영화</option>
                      <option value="short">단편</option>
                      <option value="documentary">다큐멘터리</option>
                      <option value="other">기타</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>제작 상태</label>
                    <select {...register('status')} className={selectCls}>
                      <option value="development">개발 중</option>
                      <option value="preproduction">프리프로덕션</option>
                      <option value="production">제작 중</option>
                      <option value="postproduction">후반 작업</option>
                      <option value="completed">완성</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>장르 (쉼표로 구분)</label>
                  <input {...register('genre')} placeholder="감정코칭, 판타지, 힐링" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>타겟 시청자</label>
                  <input {...register('targetAudience')} placeholder="유아/초등 저학년 + 부모" className={inputCls} />
                </div>
              </div>
            )}

            {/* Step 1: Art Context */}
            {step === 1 && (
              <div className="space-y-4 p-6 rounded-2xl border border-border bg-card">
                <div>
                  <label className={labelCls}>아트 스타일</label>
                  <input {...register('artStyle')} placeholder="파스텔 톤, 3D 클레이, 부드러운 빛" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>무드 키워드 (쉼표 구분)</label>
                  <input {...register('moodKeywords')} placeholder="따뜻함, 안전함, 치유" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>금지 요소 (쉼표 구분)</label>
                  <input {...register('prohibitedElements')} placeholder="공포, 날카로운 선, 폭력" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>레퍼런스 작품 (쉼표 구분)</label>
                  <input {...register('referenceWorks')} placeholder="코코멜론, 뽀로로, Bluey" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>화면 비율</label>
                    <select {...register('aspectRatio')} className={selectCls}>
                      <option value="16:9">16:9 (와이드)</option>
                      <option value="9:16">9:16 (세로)</option>
                      <option value="1:1">1:1 (정방형)</option>
                      <option value="2.39:1">2.39:1 (시네마스코프)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>프레임레이트</label>
                    <select {...register('frameRate')} className={selectCls}>
                      <option value="24fps">24fps (영화)</option>
                      <option value="30fps">30fps (방송)</option>
                      <option value="60fps">60fps (게임/스포츠)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Production Info */}
            {step === 2 && (
              <div className="space-y-4 p-6 rounded-2xl border border-border bg-card">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>방송사/플랫폼</label>
                    <input {...register('broadcaster')} placeholder="EBS" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>러닝타임</label>
                    <input {...register('runtime')} placeholder="10분" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>총 화수</label>
                    <input type="number" min={1} {...register('totalEpisodes')} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>납품 마감일 (선택)</label>
                  <input type="date" {...register('submissionDeadline')} className={inputCls} />
                </div>

                {/* Summary preview */}
                <div className="mt-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs font-medium text-purple-400 mb-2">프로젝트 요약</p>
                  <div className="text-sm text-white space-y-1">
                    <p><span className="text-muted-foreground">제목:</span> {getValues('title') || '—'}</p>
                    <p><span className="text-muted-foreground">장르:</span> {getValues('genre') || '—'}</p>
                    <p><span className="text-muted-foreground">아트:</span> {getValues('artStyle') || '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-6">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-white hover:bg-accent text-sm transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />이전
              </button>
            )}
            <div className="flex-1" />
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition-colors"
              >
                다음<ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition-colors disabled:opacity-60"
              >
                {createMutation.isPending ? '생성 중...' : (
                  <><Check className="w-4 h-4" />프로젝트 생성</>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
