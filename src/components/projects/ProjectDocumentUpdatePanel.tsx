'use client'

import { useState, useRef } from 'react'
import {
  Upload, FileText, Loader2, CheckCircle, AlertTriangle,
  Plus, Minus, ArrowRight, RefreshCw, X, ChevronDown, ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { updateProject } from '@/lib/firestore'
import { useQueryClient } from '@tanstack/react-query'
import type { Project, ProjectType, AspectRatio, FrameRate } from '@/types'
import type { ParsedDocumentData } from './DocumentUploadPanel'

// ─── 머지 상태 타입 ───────────────────────────────────────

type FieldStatus = 'auto_add' | 'conflict' | 'unchanged' | 'skip'

interface DiffField {
  key: string
  label: string
  status: FieldStatus
  currentValue: string
  newValue: string
  accepted: boolean
  isArray: boolean
  toAdd: string[]        // 배열 필드: 신규 추가될 항목들
}

// ─── 레이블 맵 ────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  title: '작품명',
  titleEn: '영문명',
  type: '타입',
  genre: '장르',
  targetAudience: '타겟 시청자',
  artStyle: '아트 스타일',
  colorPalette: '색상 팔레트',
  moodKeywords: '무드 키워드',
  prohibitedElements: '금지 요소',
  referenceWorks: '레퍼런스 작품',
  aspectRatio: '화면비',
  frameRate: '프레임레이트',
  broadcaster: '방송사/플랫폼',
  runtime: '러닝타임',
  totalEpisodes: '총 화수',
  submissionDeadline: '납품 마감일',
}

const STATUS_CONFIG = {
  auto_add: { label: '신규 입력', color: '#059669', bg: '#D1FAE5', icon: Plus },
  conflict:  { label: '변경 감지', color: '#D97706', bg: '#FEF3C7', icon: AlertTriangle },
  unchanged: { label: '변경 없음', color: '#9CA3AF', bg: '#F3F4F6', icon: CheckCircle },
  skip:      { label: '데이터 없음', color: '#D1D5DB', bg: '#F9FAFB', icon: Minus },
}

// ─── 파싱 결과 → 플랫 객체 변환 ──────────────────────────

function parsedToFlat(data: ParsedDocumentData): Record<string, { value: string; isArray: boolean; items: string[] }> {
  const toItems = (raw: string) =>
    raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : []

  return {
    title:              { value: data.title || '',              isArray: false, items: [] },
    titleEn:            { value: data.titleEn || '',            isArray: false, items: [] },
    type:               { value: data.type || '',               isArray: false, items: [] },
    genre:              { value: data.genre || '',              isArray: true,  items: toItems(data.genre) },
    targetAudience:     { value: data.targetAudience || '',     isArray: false, items: [] },
    artStyle:           { value: data.artStyle || '',           isArray: false, items: [] },
    colorPalette:       { value: '',                            isArray: true,  items: Array.isArray(data.colorPalette) ? data.colorPalette : [] },
    moodKeywords:       { value: data.moodKeywords || '',       isArray: true,  items: toItems(data.moodKeywords) },
    prohibitedElements: { value: data.prohibitedElements || '', isArray: true,  items: toItems(data.prohibitedElements) },
    referenceWorks:     { value: data.referenceWorks || '',     isArray: true,  items: toItems(data.referenceWorks) },
    aspectRatio:        { value: data.aspectRatio || '',        isArray: false, items: [] },
    frameRate:          { value: data.frameRate || '',          isArray: false, items: [] },
    broadcaster:        { value: data.broadcaster || '',        isArray: false, items: [] },
    runtime:            { value: data.runtime || '',            isArray: false, items: [] },
    totalEpisodes:      { value: data.totalEpisodes || '',      isArray: false, items: [] },
    submissionDeadline: { value: data.submissionDeadline || '', isArray: false, items: [] },
  }
}

function projectToFlat(project: Project): Record<string, { value: string; isArray: boolean; items: string[] }> {
  return {
    title:              { value: project.title,                                isArray: false, items: [] },
    titleEn:            { value: project.titleEn,                              isArray: false, items: [] },
    type:               { value: project.type,                                 isArray: false, items: [] },
    genre:              { value: '',                                            isArray: true,  items: project.genre },
    targetAudience:     { value: project.targetAudience,                       isArray: false, items: [] },
    artStyle:           { value: project.artContext.style,                     isArray: false, items: [] },
    colorPalette:       { value: '',                                            isArray: true,  items: project.artContext.colorPalette },
    moodKeywords:       { value: '',                                            isArray: true,  items: project.artContext.moodKeywords },
    prohibitedElements: { value: '',                                            isArray: true,  items: project.artContext.prohibitedElements },
    referenceWorks:     { value: '',                                            isArray: true,  items: project.artContext.referenceWorks },
    aspectRatio:        { value: project.artContext.aspectRatio,               isArray: false, items: [] },
    frameRate:          { value: project.artContext.frameRate,                 isArray: false, items: [] },
    broadcaster:        { value: project.productionInfo.broadcaster,           isArray: false, items: [] },
    runtime:            { value: project.productionInfo.runtime,               isArray: false, items: [] },
    totalEpisodes:      { value: String(project.productionInfo.totalEpisodes), isArray: false, items: [] },
    submissionDeadline: { value: project.productionInfo.submissionDeadline || '', isArray: false, items: [] },
  }
}

// ─── 스마트 머지: diff 계산 ───────────────────────────────

function computeDiff(project: Project, parsed: ParsedDocumentData): DiffField[] {
  const current = projectToFlat(project)
  const next    = parsedToFlat(parsed)
  const fields: DiffField[] = []

  for (const key of Object.keys(FIELD_LABELS)) {
    const cur  = current[key]
    const nxt  = next[key]
    if (!cur || !nxt) continue

    let status: FieldStatus
    let toAdd: string[] = []

    if (nxt.isArray) {
      const newItems = nxt.items.filter(i => i && !cur.items.includes(i))
      toAdd = newItems

      if (nxt.items.length === 0) {
        status = 'skip'
      } else if (newItems.length === 0) {
        status = 'unchanged'
      } else if (cur.items.length === 0) {
        status = 'auto_add'
      } else {
        status = 'conflict'  // 기존 있고 신규 추가될 항목 있음 → 사용자 확인
      }

      fields.push({
        key,
        label: FIELD_LABELS[key],
        status,
        currentValue: cur.items.join(', '),
        newValue: nxt.items.join(', '),
        accepted: status === 'auto_add',
        isArray: true,
        toAdd,
      })
    } else {
      const curVal = cur.value.trim()
      const nxtVal = nxt.value.trim()

      if (!nxtVal) {
        status = 'skip'
      } else if (curVal === nxtVal) {
        status = 'unchanged'
      } else if (!curVal) {
        status = 'auto_add'
      } else {
        status = 'conflict'
      }

      fields.push({
        key,
        label: FIELD_LABELS[key],
        status,
        currentValue: curVal,
        newValue: nxtVal,
        accepted: status === 'auto_add',
        isArray: false,
        toAdd: [],
      })
    }
  }

  return fields
}

// ─── diff 결과를 Project 업데이트 데이터로 변환 ───────────

function buildUpdatePayload(project: Project, diffs: DiffField[]): Partial<Project> {
  const accepted = diffs.filter(d => d.accepted && d.status !== 'unchanged' && d.status !== 'skip')
  if (accepted.length === 0) return {}

  const get = (key: string) => accepted.find(d => d.key === key)

  const newTitle    = get('title')?.newValue    ?? project.title
  const newTitleEn  = get('titleEn')?.newValue  ?? project.titleEn
  const newType     = get('type')?.newValue     ?? project.type
  const newAudience = get('targetAudience')?.newValue ?? project.targetAudience

  // 배열 머지 헬퍼: 기존 + 신규 (중복 제거)
  const mergeArr = (key: string, existing: string[]) => {
    const d = get(key)
    if (!d) return existing
    if (d.isArray) {
      const merged = [...existing, ...d.toAdd]
      return merged.filter((item, idx) => merged.indexOf(item) === idx)
    }
    return d.newValue.split(',').map(s => s.trim()).filter(Boolean)
  }

  // 단일 값 헬퍼
  const scalar = (key: string, fallback: string) => get(key)?.newValue || fallback

  const payload: Partial<Project> = {
    title:          newTitle,
    titleEn:        newTitleEn,
    type:           newType as ProjectType,
    genre:          mergeArr('genre', project.genre),
    targetAudience: newAudience,
    artContext: {
      style:              scalar('artStyle',           project.artContext.style),
      colorPalette:       mergeArr('colorPalette',     project.artContext.colorPalette),
      moodKeywords:       mergeArr('moodKeywords',     project.artContext.moodKeywords),
      prohibitedElements: mergeArr('prohibitedElements', project.artContext.prohibitedElements),
      referenceWorks:     mergeArr('referenceWorks',   project.artContext.referenceWorks),
      aspectRatio:        (scalar('aspectRatio',       project.artContext.aspectRatio)) as AspectRatio,
      frameRate:          (scalar('frameRate',         project.artContext.frameRate)) as FrameRate,
    },
    productionInfo: {
      broadcaster:        scalar('broadcaster',        project.productionInfo.broadcaster),
      runtime:            scalar('runtime',            project.productionInfo.runtime),
      totalEpisodes:      Number(scalar('totalEpisodes', String(project.productionInfo.totalEpisodes))) || project.productionInfo.totalEpisodes,
      submissionDeadline: scalar('submissionDeadline', project.productionInfo.submissionDeadline ?? ''),
    },
  }

  return payload
}

// ─── 메인 컴포넌트 ────────────────────────────────────────

interface Props {
  project: Project
}

type Step = 'idle' | 'uploading' | 'reviewing' | 'applying' | 'done'

const VALID_TYPES = ['animation', 'film', 'short', 'documentary', 'other']
const VALID_ASPECTS = ['16:9', '9:16', '1:1', '2.39:1']
const VALID_FPS = ['24fps', '30fps', '60fps']

export function ProjectDocumentUpdatePanel({ project }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [diffs, setDiffs] = useState<DiffField[]>([])
  const [appliedCount, setAppliedCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const conflictCount  = diffs.filter(d => d.status === 'conflict').length
  const autoAddCount   = diffs.filter(d => d.status === 'auto_add').length
  const acceptedCount  = diffs.filter(d => d.accepted).length

  async function handleUpload() {
    if (!file) return
    setStep('uploading')
    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/document/parse', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? '분석 실패')
      }
      const parsed: ParsedDocumentData = await res.json()

      // 유효성 검증 (신규 생성 로직과 동일)
      if (parsed.type && !VALID_TYPES.includes(parsed.type)) parsed.type = ''
      if (parsed.aspectRatio && !VALID_ASPECTS.includes(parsed.aspectRatio)) parsed.aspectRatio = ''
      if (parsed.frameRate && !VALID_FPS.includes(parsed.frameRate)) parsed.frameRate = ''

      const computed = computeDiff(project, parsed)
      setDiffs(computed)
      setStep('reviewing')
    } catch (e: any) {
      toast.error('문서 분석 실패: ' + e.message)
      setStep('idle')
    }
  }

  function toggleAccepted(key: string) {
    setDiffs(prev => prev.map(d => d.key === key ? { ...d, accepted: !d.accepted } : d))
  }

  async function handleApply() {
    const payload = buildUpdatePayload(project, diffs)
    if (Object.keys(payload).length === 0) {
      toast.info('적용할 변경 사항이 없습니다.')
      return
    }
    setStep('applying')
    try {
      await updateProject(project.id, payload)
      queryClient.invalidateQueries({ queryKey: ['project', project.id] })
      const count = diffs.filter(d => d.accepted && d.status !== 'unchanged').length
      setAppliedCount(count)
      setStep('done')
      toast.success(`${count}개 항목이 업데이트됐습니다!`)
    } catch (e: any) {
      toast.error('업데이트 실패: ' + e.message)
      setStep('reviewing')
    }
  }

  function reset() {
    setStep('idle'); setFile(null); setDiffs([])
  }

  // ── 렌더 ──────────────────────────────────────────────

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      {/* 헤더 토글 */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[var(--color-surface-2)] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EDE9FE' }}>
          <RefreshCw className="w-4.5 h-4.5" style={{ color: '#7C3AED' }} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>문서로 프로젝트 업데이트</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-sub)' }}>
            최신 기획서를 올리면 변경된 내용만 스마트하게 반영합니다
          </p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-sub)' }} />
          : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-sub)' }} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t space-y-4 pt-4" style={{ borderColor: 'var(--color-border)' }}>

              {/* ── idle: 업로드 ── */}
              {step === 'idle' && (
                <>
                  <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>
                    PDF, Word(.docx), 이미지(JPG/PNG) 지원 · HWP는 PDF로 변환 후 업로드
                  </p>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors hover:border-purple-400"
                    style={{ borderColor: file ? '#7C3AED' : 'var(--color-border)', background: 'var(--color-surface-2)' }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={e => setFile(e.target.files?.[0] ?? null)}
                    />
                    {file ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="w-5 h-5" style={{ color: '#7C3AED' }} />
                        <span className="text-sm font-medium" style={{ color: '#7C3AED' }}>{file.name}</span>
                        <button onClick={e => { e.stopPropagation(); setFile(null) }}>
                          <X className="w-4 h-4" style={{ color: '#EF4444' }} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--color-text-sub)' }} />
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                          최신 기획서 파일 선택
                        </p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleUpload}
                    disabled={!file}
                    className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}
                  >
                    문서 분석 시작
                  </button>
                </>
              )}

              {/* ── uploading ── */}
              {step === 'uploading' && (
                <div className="flex flex-col items-center py-8 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7C3AED' }} />
                  <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>
                    문서 분석 중... 기존 프로젝트와 비교하고 있습니다
                  </p>
                </div>
              )}

              {/* ── reviewing: diff ── */}
              {step === 'reviewing' && (
                <>
                  {/* 요약 배지 */}
                  <div className="flex flex-wrap gap-2">
                    {autoAddCount > 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#D1FAE5', color: '#059669' }}>
                        신규 입력 {autoAddCount}개
                      </span>
                    )}
                    {conflictCount > 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#FEF3C7', color: '#D97706' }}>
                        변경 감지 {conflictCount}개 (검토 필요)
                      </span>
                    )}
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                      선택됨 {acceptedCount}개
                    </span>
                  </div>

                  {/* 필드 목록 */}
                  <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                    {diffs.filter(d => d.status !== 'skip' && d.status !== 'unchanged').map(diff => {
                      const cfg = STATUS_CONFIG[diff.status]
                      const Icon = cfg.icon
                      return (
                        <div
                          key={diff.key}
                          className="rounded-xl border overflow-hidden"
                          style={{ borderColor: diff.accepted ? cfg.color : 'var(--color-border)', opacity: diff.status === 'skip' ? 0.4 : 1 }}
                        >
                          <div className="flex items-start gap-2.5 px-3 py-2.5">
                            {/* 체크박스 */}
                            <button
                              onClick={() => toggleAccepted(diff.key)}
                              className="shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 transition-colors"
                              style={{
                                background: diff.accepted ? cfg.color : 'transparent',
                                borderColor: diff.accepted ? cfg.color : 'var(--color-border)',
                              }}
                            >
                              {diff.accepted && <CheckCircle className="w-3 h-3 text-white" />}
                            </button>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{diff.label}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                                  {cfg.label}
                                </span>
                              </div>

                              {/* 현재값 → 새값 */}
                              {diff.status === 'conflict' && !diff.isArray && (
                                <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                                  <span className="line-through truncate max-w-[180px]" style={{ color: '#EF4444' }}>{diff.currentValue || '(없음)'}</span>
                                  <ArrowRight className="w-3 h-3 shrink-0" style={{ color: 'var(--color-text-sub)' }} />
                                  <span className="truncate max-w-[180px] font-medium" style={{ color: '#059669' }}>{diff.newValue}</span>
                                </div>
                              )}

                              {/* 배열: 기존 + 추가될 항목 */}
                              {diff.isArray && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {diff.currentValue && diff.currentValue.split(', ').map((item, i) => (
                                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#6B7280' }}>{item}</span>
                                  ))}
                                  {diff.toAdd.map((item, i) => (
                                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#D1FAE5', color: '#059669' }}>+{item}</span>
                                  ))}
                                </div>
                              )}

                              {/* auto_add 단일 값 */}
                              {diff.status === 'auto_add' && !diff.isArray && (
                                <p className="text-[11px] font-medium" style={{ color: '#059669' }}>{diff.newValue}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* 변경 없음 항목 (접힌 형태) */}
                    {diffs.filter(d => d.status === 'unchanged').length > 0 && (
                      <p className="text-[11px] text-center pt-1" style={{ color: 'var(--color-text-sub)' }}>
                        변경 없는 항목 {diffs.filter(d => d.status === 'unchanged').length}개는 그대로 유지됩니다
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={reset}
                      className="px-4 py-2.5 rounded-xl text-xs border transition-colors hover:bg-[var(--color-surface-2)]"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}
                    >
                      취소
                    </button>
                    <button
                      onClick={handleApply}
                      disabled={acceptedCount === 0}
                      className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}
                    >
                      선택된 {acceptedCount}개 항목 적용
                    </button>
                  </div>
                </>
              )}

              {/* ── applying ── */}
              {step === 'applying' && (
                <div className="flex flex-col items-center py-8 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7C3AED' }} />
                  <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>프로젝트 업데이트 중...</p>
                </div>
              )}

              {/* ── done ── */}
              {step === 'done' && (
                <div className="flex flex-col items-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#D1FAE5' }}>
                    <CheckCircle className="w-6 h-6" style={{ color: '#059669' }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>업데이트 완료!</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-sub)' }}>
                      {appliedCount}개 항목이 반영됐습니다. 페이지를 새로고침하면 확인할 수 있습니다.
                    </p>
                  </div>
                  <button
                    onClick={reset}
                    className="px-4 py-2 rounded-xl text-xs border transition-colors hover:bg-[var(--color-surface-2)]"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}
                  >
                    닫기
                  </button>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
