'use client'

import { useState, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { createProject } from '@/lib/firestore'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Check, Film, Palette, Tv, X, Plus } from 'lucide-react'
import { ProjectType, ProjectStatus } from '@/types'
import DocumentUploadPanel, { ParsedDocumentData } from '@/components/projects/DocumentUploadPanel'

const STEPS = [
  { id: 0, label: '기본 정보', icon: Film },
  { id: 1, label: '아트 컨텍스트', icon: Palette },
  { id: 2, label: '제작 정보', icon: Tv },
]

const TYPE_OPTIONS: { value: ProjectType; label: string; icon: string; desc: string }[] = [
  { value: 'animation', label: '애니메이션', icon: '🎬', desc: 'TV/Web 시리즈 애니메이션' },
  { value: 'film', label: '영화', icon: '🎥', desc: '장편/단편 극영화' },
  { value: 'short', label: '단편', icon: '🎞️', desc: '숏폼/실험 영상' },
  { value: 'documentary', label: '다큐멘터리', icon: '📹', desc: '다큐멘터리/교육 영상' },
  { value: 'other', label: '기타', icon: '📁', desc: '기타 영상 프로젝트' },
]

const ASPECT_OPTIONS = [
  { value: '16:9', label: '16:9 와이드' },
  { value: '9:16', label: '9:16 세로' },
  { value: '1:1', label: '1:1 정방형' },
  { value: '2.39:1', label: '2.39:1 시네마' },
]

const FPS_OPTIONS = [
  { value: '24fps', label: '24fps 영화' },
  { value: '30fps', label: '30fps 방송' },
  { value: '60fps', label: '60fps 게임' },
]

const DEFAULT_PALETTE = ['#F8E8FF', '#FFE4E1', '#E0F4FF', '#FFF0C8', '#D4F4DD', '#C0C0D0']

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('')
  function add(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = input.trim().replace(/,$/, '')
      if (val && !tags.includes(val)) onChange([...tags, val])
      setInput('')
    }
  }
  return (
    <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border min-h-[42px]" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {tags.map(t => (
        <span key={t} className="tag-chip" style={{ background: 'var(--color-accent)', color: 'var(--color-primary-dark)' }}>
          {t}
          <button onClick={() => onChange(tags.filter(x => x !== t))} className="hover:opacity-70"><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={add}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] text-sm bg-transparent outline-none"
        style={{ color: 'var(--color-text)' }}
      />
    </div>
  )
}

function ColorPalette({ colors, onChange }: { colors: string[]; onChange: (c: string[]) => void }) {
  return (
    <div className="flex gap-2">
      {colors.map((c, i) => (
        <label key={i} className="relative group cursor-pointer">
          <div className="w-10 h-10 rounded-xl border-2 shadow-sm" style={{ background: c, borderColor: 'var(--color-border)' }} />
          <input
            type="color"
            value={c}
            onChange={e => { const next = [...colors]; next[i] = e.target.value; onChange(next) }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
      ))}
    </div>
  )
}

export default function NewProjectPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [step, setStep] = useState(0)

  // Form state
  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [type, setType] = useState<ProjectType>('animation')
  const [genreTags, setGenreTags] = useState<string[]>([])
  const [targetAudience, setTargetAudience] = useState('')
  const [broadcaster, setBroadcaster] = useState('')
  const [artStyle, setArtStyle] = useState('')
  const [colorPalette, setColorPalette] = useState(DEFAULT_PALETTE)
  const [moodTags, setMoodTags] = useState<string[]>([])
  const [prohibitedTags, setProhibitedTags] = useState<string[]>([])
  const [referenceTags, setReferenceTags] = useState<string[]>([])
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [frameRate, setFrameRate] = useState('24fps')
  const [runtime, setRuntime] = useState('')
  const [totalEpisodes, setTotalEpisodes] = useState(1)
  const [submissionDeadline, setSubmissionDeadline] = useState('')

  const createMutation = useMutation({
    mutationFn: async () => {
      return createProject({
        title, titleEn, type,
        genre: genreTags,
        targetAudience,
        status: 'development' as ProjectStatus,
        artContext: {
          style: artStyle,
          colorPalette,
          moodKeywords: moodTags,
          prohibitedElements: prohibitedTags,
          referenceWorks: referenceTags,
          aspectRatio: aspectRatio as any,
          frameRate: frameRate as any,
        },
        productionInfo: {
          broadcaster,
          runtime,
          totalEpisodes,
          ...(submissionDeadline ? { submissionDeadline } : {}),
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

  function handleApplyParsed(data: ParsedDocumentData) {
    if (data.title) setTitle(data.title)
    if (data.titleEn) setTitleEn(data.titleEn)
    if (data.type && TYPE_OPTIONS.some(t => t.value === data.type)) setType(data.type as ProjectType)
    if (data.genre) setGenreTags(data.genre.split(',').map(s => s.trim()).filter(Boolean))
    if (data.targetAudience) setTargetAudience(data.targetAudience)
    if (data.artStyle) setArtStyle(data.artStyle)
    if (data.moodKeywords) setMoodTags(data.moodKeywords.split(',').map(s => s.trim()).filter(Boolean))
    if (data.prohibitedElements) setProhibitedTags(data.prohibitedElements.split(',').map(s => s.trim()).filter(Boolean))
    if (data.referenceWorks) setReferenceTags(data.referenceWorks.split(',').map(s => s.trim()).filter(Boolean))
    if (data.broadcaster) setBroadcaster(data.broadcaster)
    if (data.runtime) setRuntime(data.runtime)
    if (data.totalEpisodes) {
      const num = Number(data.totalEpisodes)
      if (!isNaN(num) && num > 0) setTotalEpisodes(num)
    }
    // 색상 팔레트
    if (Array.isArray(data.colorPalette) && data.colorPalette.length > 0) {
      const validColors = data.colorPalette.filter(c => /^#[0-9A-Fa-f]{3,8}$/.test(c))
      if (validColors.length > 0) {
        // 6색 슬롯에 맞춰 채움
        const palette = [...validColors]
        while (palette.length < 6) palette.push(DEFAULT_PALETTE[palette.length] || '#CCCCCC')
        setColorPalette(palette.slice(0, 6))
      }
    }
    // 화면비
    if (data.aspectRatio && ASPECT_OPTIONS.some(a => a.value === data.aspectRatio)) {
      setAspectRatio(data.aspectRatio)
    }
    // 프레임레이트
    if (data.frameRate && FPS_OPTIONS.some(f => f.value === data.frameRate)) {
      setFrameRate(data.frameRate)
    }
    // 납품 마감일
    if (data.submissionDeadline && /^\d{4}-\d{2}-\d{2}$/.test(data.submissionDeadline)) {
      setSubmissionDeadline(data.submissionDeadline)
    }

    const checklist = data.checklist
    const found = checklist ? Object.values(checklist).filter(Boolean).length : 0
    const total = checklist ? Object.keys(checklist).length : 0
    toast.success(`기획안 분석 완료! ${found}/${total}개 항목이 자동 입력되었습니다.`)
  }

  function nextStep() {
    if (step === 0 && !title.trim()) { toast.error('작품명을 입력하세요.'); return }
    setStep(s => s + 1)
  }

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors"
  const inputStyle = { background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 flex items-start justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>새 프로젝트 만들기</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>기획안을 업로드하면 자동으로 정보를 인식합니다. 직접 입력도 가능합니다.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: step === i ? 'var(--color-primary-dark)' : step > i ? '#D1FAE5' : 'var(--color-surface-2)',
                  color: step === i ? 'white' : step > i ? '#059669' : 'var(--color-text-sub)',
                }}
              >
                {step > i ? <Check className="w-3 h-3" /> : <s.icon className="w-3 h-3" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div className="h-px w-6" style={{ background: step > i ? '#86EFAC' : 'var(--color-border)' }} />
              )}
            </div>
          ))}
        </div>

        {/* Document Upload */}
        <DocumentUploadPanel onApply={handleApplyParsed} />

        <form onSubmit={e => { e.preventDefault(); createMutation.mutate() }}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

              {/* Step 0: Basic */}
              {step === 0 && (
                <div className="space-y-5 p-6 rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>작품명 *</label>
                      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="상상동물병원" className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>영문명</label>
                      <input value={titleEn} onChange={e => setTitleEn(e.target.value)} placeholder="Imagination Animal Hospital" className={inputCls} style={inputStyle} />
                    </div>
                  </div>

                  {/* Type cards */}
                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-sub)' }}>타입</label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {TYPE_OPTIONS.map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setType(t.value)}
                          className="p-3 rounded-xl border text-center transition-all"
                          style={{
                            borderColor: type === t.value ? 'var(--color-primary-dark)' : 'var(--color-border)',
                            background: type === t.value ? '#EDE9FE' : 'var(--color-surface)',
                          }}
                        >
                          <div className="text-2xl mb-1">{t.icon}</div>
                          <div className="text-xs font-medium" style={{ color: type === t.value ? 'var(--color-primary-dark)' : 'var(--color-text)' }}>{t.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>장르 태그</label>
                    <TagInput tags={genreTags} onChange={setGenreTags} placeholder="감정코칭, 판타지, 힐링 (Enter로 추가)" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>타겟 시청자</label>
                    <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="유아/초등 저학년 + 부모" className={inputCls} style={inputStyle} />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>방송사/플랫폼</label>
                    <input value={broadcaster} onChange={e => setBroadcaster(e.target.value)} placeholder="EBS, YouTube, Netflix..." className={inputCls} style={inputStyle} />
                  </div>
                </div>
              )}

              {/* Step 1: Art Context */}
              {step === 1 && (
                <div className="space-y-5 p-6 rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>아트 스타일</label>
                    <textarea
                      value={artStyle}
                      onChange={e => setArtStyle(e.target.value)}
                      placeholder="파스텔 톤, 3D 클레이 질감, 부드러운 빛, 둥근 형태..."
                      rows={3}
                      className={`${inputCls} resize-none`}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-sub)' }}>색상 팔레트 (클릭하여 변경)</label>
                    <ColorPalette colors={colorPalette} onChange={setColorPalette} />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>무드 키워드</label>
                    <TagInput tags={moodTags} onChange={setMoodTags} placeholder="따뜻함, 안전함, 치유 (Enter로 추가)" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>금지 요소</label>
                    <TagInput tags={prohibitedTags} onChange={setProhibitedTags} placeholder="공포, 폭력, 어두운 색 (Enter로 추가)" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>레퍼런스 작품</label>
                    <TagInput tags={referenceTags} onChange={setReferenceTags} placeholder="코코멜론, 뽀로로, Bluey (Enter로 추가)" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-sub)' }}>화면 비율</label>
                      <div className="grid grid-cols-2 gap-2">
                        {ASPECT_OPTIONS.map(a => (
                          <button
                            key={a.value}
                            type="button"
                            onClick={() => setAspectRatio(a.value)}
                            className="px-3 py-2 rounded-xl border text-xs font-medium transition-all"
                            style={{
                              borderColor: aspectRatio === a.value ? 'var(--color-primary-dark)' : 'var(--color-border)',
                              background: aspectRatio === a.value ? '#EDE9FE' : 'var(--color-surface)',
                              color: aspectRatio === a.value ? 'var(--color-primary-dark)' : 'var(--color-text-sub)',
                            }}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-sub)' }}>프레임레이트</label>
                      <div className="grid grid-cols-1 gap-2">
                        {FPS_OPTIONS.map(f => (
                          <button
                            key={f.value}
                            type="button"
                            onClick={() => setFrameRate(f.value)}
                            className="px-3 py-2 rounded-xl border text-xs font-medium transition-all"
                            style={{
                              borderColor: frameRate === f.value ? 'var(--color-primary-dark)' : 'var(--color-border)',
                              background: frameRate === f.value ? '#EDE9FE' : 'var(--color-surface)',
                              color: frameRate === f.value ? 'var(--color-primary-dark)' : 'var(--color-text-sub)',
                            }}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Production */}
              {step === 2 && (
                <div className="space-y-5 p-6 rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>방송사/플랫폼</label>
                      <input value={broadcaster} onChange={e => setBroadcaster(e.target.value)} placeholder="EBS" className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>러닝타임</label>
                      <input value={runtime} onChange={e => setRuntime(e.target.value)} placeholder="10분" className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>총 화수</label>
                      <input type="number" min={1} value={totalEpisodes} onChange={e => setTotalEpisodes(Number(e.target.value))} className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>납품 마감일 (선택)</label>
                    <input type="date" value={submissionDeadline} onChange={e => setSubmissionDeadline(e.target.value)} className={inputCls} style={inputStyle} />
                  </div>

                  {/* Summary */}
                  <div className="p-4 rounded-xl" style={{ background: '#EDE9FE' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-primary-dark)' }}>프로젝트 요약</p>
                    <div className="text-sm space-y-1" style={{ color: 'var(--color-text)' }}>
                      <p><span style={{ color: 'var(--color-text-sub)' }}>제목:</span> {title || '—'}</p>
                      <p><span style={{ color: 'var(--color-text-sub)' }}>장르:</span> {genreTags.join(', ') || '—'}</p>
                      <p><span style={{ color: 'var(--color-text-sub)' }}>아트:</span> {artStyle || '—'}</p>
                      <p><span style={{ color: 'var(--color-text-sub)' }}>방송사:</span> {broadcaster || '—'} · {totalEpisodes}화</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-6">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm transition-colors hover:bg-[var(--color-surface-2)]"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}
              >
                <ChevronLeft className="w-4 h-4" />이전
              </button>
            )}
            <div className="flex-1" />
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-medium text-sm transition-colors hover:opacity-90"
                style={{ background: 'var(--color-primary-dark)' }}
              >
                다음<ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-medium text-sm transition-colors hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--color-primary-dark)' }}
              >
                {createMutation.isPending ? '생성 중...' : <><Check className="w-4 h-4" />프로젝트 생성</>}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
