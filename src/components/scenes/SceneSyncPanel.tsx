'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import {
  X, Upload, FileText, Loader2, CheckCircle2,
  AlertCircle, RefreshCw, Plus, Edit3, Minus,
} from 'lucide-react'
import { toast } from 'sonner'
import { createScene, updateScene } from '@/lib/firestore'
import { Scene, Episode } from '@/types'
import { cn } from '@/lib/utils'

interface ParsedScene {
  number: number
  title: string
  location: string
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | 'interior'
  characters: string[]
  actionDescription: string
  backgroundDescription: string
  emotionKeywords: string[]
  soundDesign: string
  directorNote: string
  timeStart: string
  timeEnd: string
}

type DiffStatus = 'new' | 'updated' | 'unchanged'

interface SceneDiff {
  parsed: ParsedScene
  existing: Scene | null
  status: DiffStatus
  selected: boolean
  changedFields: (keyof ParsedScene)[]
}

const FIELD_LABELS: Partial<Record<keyof ParsedScene, string>> = {
  title: '제목',
  location: '장소',
  actionDescription: '액션',
  backgroundDescription: '배경 묘사',
  emotionKeywords: '감정 키워드',
  soundDesign: '사운드',
  directorNote: '연출 노트',
  timeOfDay: '시간대',
}

const CHANGED_FIELDS_COMPARE: (keyof ParsedScene)[] = [
  'title', 'location', 'actionDescription', 'backgroundDescription',
  'emotionKeywords', 'soundDesign', 'directorNote',
]

function computeDiff(parsed: ParsedScene[], existing: Scene[]): SceneDiff[] {
  const existingMap = new Map(existing.map(s => [s.number, s]))

  return parsed.map(p => {
    const ex = existingMap.get(p.number) ?? null
    if (!ex) {
      return { parsed: p, existing: null, status: 'new' as DiffStatus, selected: true, changedFields: [] }
    }

    const changedFields: (keyof ParsedScene)[] = []
    for (const field of CHANGED_FIELDS_COMPARE) {
      const pv = p[field]
      const ev = (ex as any)[field]
      if (!pv) continue
      if (Array.isArray(pv) && Array.isArray(ev)) {
        if (JSON.stringify(pv) !== JSON.stringify(ev)) changedFields.push(field)
      } else if (pv !== ev) {
        changedFields.push(field)
      }
    }

    const status: DiffStatus = changedFields.length > 0 ? 'updated' : 'unchanged'
    return { parsed: p, existing: ex, status, selected: status !== 'unchanged', changedFields }
  }).sort((a, b) => a.parsed.number - b.parsed.number)
}

const STATUS_CONFIG = {
  new: { label: '신규', color: '#10B981', bg: '#ECFDF5', icon: Plus },
  updated: { label: '수정', color: '#F59E0B', bg: '#FFFBEB', icon: Edit3 },
  unchanged: { label: '동일', color: '#6B7280', bg: 'var(--color-surface-2)', icon: Minus },
}

function getDisplayValue(field: keyof ParsedScene, obj: ParsedScene | Scene | null): string {
  if (!obj) return ''
  const val = (obj as any)[field]
  if (Array.isArray(val)) return val.join(', ')
  return val ?? ''
}

export function SceneSyncPanel({
  open, onClose, projectId, episodeId, episode, existingScenes,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  episodeId: string
  episode: Episode
  existingScenes: Scene[]
}) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [stage, setStage] = useState<'upload' | 'review' | 'done'>('upload')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [diffs, setDiffs] = useState<SceneDiff[]>([])
  const [applying, setApplying] = useState(false)
  const [fileName, setFileName] = useState('')

  async function parseFile(file: File) {
    setParseError(null)
    setParsing(true)
    setFileName(file.name)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('episodeNumber', String(episode.number))
      formData.append('episodeTitle', episode.title)
      formData.append('episodeSynopsis', episode.synopsis || '')

      const res = await fetch('/api/document/parse-scenes', { method: 'POST', body: formData })
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || '문서 분석에 실패했습니다.')
      }

      const parsedScenes: ParsedScene[] = json.data?.scenes ?? []
      if (parsedScenes.length === 0) {
        throw new Error('문서에서 씬 정보를 찾을 수 없습니다. 씬 목록이 포함된 기획안이나 대본을 업로드해주세요.')
      }

      setDiffs(computeDiff(parsedScenes, existingScenes))
      setStage('review')
    } catch (e: any) {
      setParseError(e.message)
    } finally {
      setParsing(false)
    }
  }

  const handleFileSelect = useCallback((file: File) => {
    const allowed = ['application/pdf', 'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword', 'image/png', 'image/jpeg', 'image/webp']
    if (!allowed.includes(file.type)) {
      setParseError('PDF, TXT, DOCX, 이미지 파일만 업로드 가능합니다.')
      return
    }
    parseFile(file)
  }, [existingScenes, episode])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  function toggleSelect(idx: number) {
    setDiffs(prev => prev.map((d, i) =>
      i === idx && d.status !== 'unchanged' ? { ...d, selected: !d.selected } : d
    ))
  }

  function toggleAll(val: boolean) {
    setDiffs(prev => prev.map(d => d.status !== 'unchanged' ? { ...d, selected: val } : d))
  }

  async function applyChanges() {
    const toApply = diffs.filter(d => d.selected && d.status !== 'unchanged')
    if (toApply.length === 0) {
      toast.error('적용할 항목이 없습니다.')
      return
    }

    setApplying(true)
    let created = 0
    let updated = 0

    try {
      await Promise.all(toApply.map(async d => {
        if (d.status === 'new') {
          await createScene(projectId, episodeId, {
            episodeId,
            projectId,
            number: d.parsed.number,
            title: d.parsed.title,
            location: d.parsed.location,
            timeOfDay: d.parsed.timeOfDay,
            timeStart: d.parsed.timeStart,
            timeEnd: d.parsed.timeEnd,
            characters: d.parsed.characters,
            cameraMovement: 'static',
            cameraAngle: 'eye_level',
            lighting: '',
            colorGrade: '',
            emotionKeywords: d.parsed.emotionKeywords,
            backgroundDescription: d.parsed.backgroundDescription,
            actionDescription: d.parsed.actionDescription,
            dialogues: [],
            soundDesign: d.parsed.soundDesign,
            directorNote: d.parsed.directorNote,
            isAITransformScene: false,
            assets: {},
            status: 'draft',
          })
          created++
        } else if (d.status === 'updated' && d.existing) {
          const patch: Partial<Scene> = {}
          for (const field of d.changedFields) {
            ;(patch as any)[field] = (d.parsed as any)[field]
          }
          await updateScene(projectId, episodeId, d.existing.id, patch)
          updated++
        }
      }))

      queryClient.invalidateQueries({ queryKey: ['scenes', projectId, episodeId] })
      toast.success(`${created > 0 ? `${created}개 생성` : ''}${created > 0 && updated > 0 ? ', ' : ''}${updated > 0 ? `${updated}개 수정` : ''} 완료!`)
      setStage('done')
    } catch (e: any) {
      toast.error('적용 실패: ' + e.message)
    } finally {
      setApplying(false)
    }
  }

  function handleClose() {
    setStage('upload')
    setDiffs([])
    setParseError(null)
    setFileName('')
    onClose()
  }

  const selectableCount = diffs.filter(d => d.status !== 'unchanged').length
  const selectedCount = diffs.filter(d => d.selected && d.status !== 'unchanged').length
  const newCount = diffs.filter(d => d.status === 'new').length
  const updatedCount = diffs.filter(d => d.status === 'updated').length
  const unchangedCount = diffs.filter(d => d.status === 'unchanged').length

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative z-10 w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', maxHeight: '90vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4" style={{ color: '#7C3AED' }} />
              <div>
                <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>기획안으로 씬 업데이트</h2>
                <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>EP.{episode.number} {episode.title}</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
              <X className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
            </button>
          </div>

          {/* Stage indicator */}
          <div className="flex items-center gap-2 px-5 py-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
            {(['upload', 'review', 'done'] as const).map((s, i) => {
              const labels = ['① 문서 업로드', '② 씬 검토', '③ 적용 완료']
              const active = s === stage
              const done = (['upload', 'review', 'done'] as const).indexOf(stage) > i
              return (
                <span key={s} className="text-xs font-medium px-2 py-0.5 rounded-full transition-colors"
                  style={{
                    background: active ? '#EDE9FE' : done ? '#D1FAE5' : 'transparent',
                    color: active ? '#7C3AED' : done ? '#059669' : 'var(--color-text-sub)',
                  }}
                >{labels[i]}</span>
              )
            })}
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 p-5">

            {/* ── Stage: upload ── */}
            {stage === 'upload' && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>
                  기획안이나 대본(PDF/DOCX/TXT/이미지)을 업로드하면 씬 목록을 자동 추출해 기존 씬과 비교합니다.
                </p>

                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => !parsing && fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
                  style={{
                    borderColor: dragOver ? '#7C3AED' : parsing ? '#7C3AED' : 'var(--color-border)',
                    background: dragOver ? '#EDE9FE22' : parsing ? '#EDE9FE11' : 'var(--color-surface-2)',
                  }}
                >
                  {parsing ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7C3AED' }} />
                      <p className="text-sm font-medium" style={{ color: '#7C3AED' }}>씬 목록 분석 중...</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>{fileName}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="w-8 h-8" style={{ color: 'var(--color-text-sub)' }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>파일을 드래그하거나 클릭해서 업로드</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-sub)' }}>PDF · DOCX · TXT · PNG · JPG</p>
                      </div>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.docx,.doc,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = '' }}
                />

                {parseError && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl border" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
                    <p className="text-sm" style={{ color: '#DC2626' }}>{parseError}</p>
                  </div>
                )}

                <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: '#EDE9FE33', border: '1px solid #C4B5FD' }}>
                  <FileText className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#7C3AED' }} />
                  <div className="text-xs space-y-0.5" style={{ color: '#7C3AED' }}>
                    <p className="font-semibold">잘 인식되는 문서 형식</p>
                    <p>씬 번호(S1, 씬1) + 장소/상황이 구분된 기획안 또는 대본</p>
                    <p>기존 씬은 씬 번호(number)를 기준으로 매칭됩니다.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Stage: review ── */}
            {stage === 'review' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#ECFDF5', color: '#059669' }}>신규 {newCount}개</span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#FFFBEB', color: '#D97706' }}>수정 {updatedCount}개</span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-sub)' }}>동일 {unchangedCount}개</span>
                  <span className="ml-auto text-xs" style={{ color: 'var(--color-text-sub)' }}>{fileName}</span>
                </div>

                {selectableCount > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCount === selectableCount}
                      onChange={e => toggleAll(e.target.checked)}
                      className="w-3.5 h-3.5 accent-purple-600"
                    />
                    <span className="text-xs" style={{ color: 'var(--color-text-sub)' }}>전체 선택 ({selectedCount}/{selectableCount})</span>
                  </label>
                )}

                <div className="space-y-2">
                  {diffs.map((d, idx) => {
                    const cfg = STATUS_CONFIG[d.status]
                    const Icon = cfg.icon
                    const isSelectable = d.status !== 'unchanged'

                    return (
                      <div
                        key={d.parsed.number}
                        onClick={() => isSelectable && toggleSelect(idx)}
                        className={cn('p-3.5 rounded-xl border transition-all', isSelectable ? 'cursor-pointer' : 'opacity-60')}
                        style={{
                          background: d.selected && isSelectable ? '#F5F3FF' : cfg.bg,
                          borderColor: d.selected && isSelectable ? '#A78BFA' : 'var(--color-border)',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {isSelectable ? (
                            <input type="checkbox" checked={d.selected} onChange={() => toggleSelect(idx)}
                              onClick={e => e.stopPropagation()} className="mt-0.5 w-3.5 h-3.5 accent-purple-600 shrink-0" />
                          ) : <div className="w-3.5 shrink-0" />}

                          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: cfg.color + '22' }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                style={{ background: cfg.color + '22', color: cfg.color }}>{cfg.label}</span>
                              <span className="text-xs font-bold" style={{ color: 'var(--color-text-sub)' }}>S{d.parsed.number}</span>
                              <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{d.parsed.title}</span>
                            </div>

                            {/* Diff fields for updated items */}
                            {d.status === 'updated' && d.changedFields.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {d.changedFields.slice(0, 3).map(field => (
                                  <div key={field} className="text-[11px] space-y-0.5">
                                    <span className="font-medium" style={{ color: 'var(--color-text-sub)' }}>{FIELD_LABELS[field] ?? field}</span>
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-start gap-1.5 p-1.5 rounded" style={{ background: '#FEE2E2' }}>
                                        <span className="text-red-400 font-bold shrink-0">−</span>
                                        <span className="line-through truncate" style={{ color: '#DC2626' }}>
                                          {getDisplayValue(field, d.existing)}
                                        </span>
                                      </div>
                                      <div className="flex items-start gap-1.5 p-1.5 rounded" style={{ background: '#DCFCE7' }}>
                                        <span className="text-green-500 font-bold shrink-0">+</span>
                                        <span className="truncate" style={{ color: '#16A34A' }}>
                                          {getDisplayValue(field, d.parsed)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {d.changedFields.length > 3 && (
                                  <p className="text-[11px]" style={{ color: 'var(--color-text-sub)' }}>
                                    외 {d.changedFields.length - 3}개 필드 변경
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Preview for new scenes */}
                            {d.status === 'new' && (
                              <div className="mt-1 space-y-0.5">
                                {d.parsed.location && (
                                  <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>📍 {d.parsed.location}</p>
                                )}
                                {d.parsed.actionDescription && (
                                  <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-sub)' }}>
                                    {d.parsed.actionDescription}
                                  </p>
                                )}
                              </div>
                            )}

                            {d.status === 'unchanged' && (
                              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-sub)' }}>변경 없음</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Stage: done ── */}
            {stage === 'done' && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#D1FAE5' }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: '#059669' }} />
                </div>
                <div className="text-center">
                  <p className="font-semibold" style={{ color: 'var(--color-text)' }}>씬 업데이트 완료!</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-sub)' }}>씬 목록에 반영되었습니다.</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t flex items-center gap-3 shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            {stage === 'upload' && (
              <button onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border text-sm transition-colors hover:opacity-70"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}>취소</button>
            )}

            {stage === 'review' && (
              <>
                <button
                  onClick={() => { setStage('upload'); setDiffs([]); setFileName(''); setParseError(null) }}
                  className="py-2.5 px-4 rounded-xl border text-sm transition-colors hover:opacity-70"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}
                >다시 업로드</button>
                <button
                  onClick={applyChanges}
                  disabled={applying || selectedCount === 0}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{ background: selectedCount > 0 ? '#7C3AED' : 'var(--color-text-sub)' }}
                >
                  {applying
                    ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />적용 중...</span>
                    : `선택 항목 적용 (${selectedCount}개)`}
                </button>
              </>
            )}

            {stage === 'done' && (
              <button onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{ background: '#7C3AED' }}>닫기</button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
