'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X, Upload, FileText, Loader2, CheckCircle2,
  AlertCircle, RefreshCw, Plus, Edit3, Minus,
} from 'lucide-react'
import { toast } from 'sonner'
import { createEpisode, updateEpisode } from '@/lib/firestore'
import { Episode } from '@/types'
import { cn } from '@/lib/utils'

// 파싱된 에피소드 데이터 형식
interface ParsedEpisode {
  number: number
  title: string
  synopsis: string
  targetEmotion?: string
}

type DiffStatus = 'new' | 'updated' | 'unchanged'

interface EpisodeDiff {
  parsed: ParsedEpisode
  existing: Episode | null
  status: DiffStatus
  selected: boolean
  // 변경된 필드 목록
  changedFields: ('title' | 'synopsis' | 'targetEmotion')[]
}

function computeDiff(parsed: ParsedEpisode[], existing: Episode[]): EpisodeDiff[] {
  const existingMap = new Map(existing.map(e => [e.number, e]))

  return parsed.map(p => {
    const ex = existingMap.get(p.number) ?? null
    if (!ex) {
      return { parsed: p, existing: null, status: 'new' as DiffStatus, selected: true, changedFields: [] }
    }

    const changedFields: ('title' | 'synopsis' | 'targetEmotion')[] = []
    if (p.title && p.title !== ex.title) changedFields.push('title')
    if (p.synopsis && p.synopsis !== ex.synopsis) changedFields.push('synopsis')
    if (p.targetEmotion && p.targetEmotion !== ex.targetEmotion) changedFields.push('targetEmotion')

    const status: DiffStatus = changedFields.length > 0 ? 'updated' : 'unchanged'
    return { parsed: p, existing: ex, status, selected: status !== 'unchanged', changedFields }
  }).sort((a, b) => a.parsed.number - b.parsed.number)
}

const STATUS_CONFIG = {
  new: { label: '신규', color: '#10B981', bg: '#ECFDF5', icon: Plus },
  updated: { label: '수정', color: '#F59E0B', bg: '#FFFBEB', icon: Edit3 },
  unchanged: { label: '동일', color: '#6B7280', bg: 'var(--color-surface-2)', icon: Minus },
}

const FIELD_LABELS = {
  title: '제목',
  synopsis: '줄거리',
  targetEmotion: '타겟 감정',
}

export function EpisodeSyncPanel({
  open, onClose, projectId, existingEpisodes, projectRuntime,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  existingEpisodes: Episode[]
  projectRuntime?: string
}) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [stage, setStage] = useState<'upload' | 'review' | 'done'>('upload')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [diffs, setDiffs] = useState<EpisodeDiff[]>([])
  const [applying, setApplying] = useState(false)
  const [fileName, setFileName] = useState('')

  async function parseFile(file: File) {
    setParseError(null)
    setParsing(true)
    setFileName(file.name)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/document/parse', { method: 'POST', body: formData })
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || '문서 분석에 실패했습니다.')
      }

      const parsedEpisodes: ParsedEpisode[] = json.data?.episodes ?? []
      if (parsedEpisodes.length === 0) {
        throw new Error('문서에서 에피소드 정보를 찾을 수 없습니다. 회차 제목과 줄거리가 포함된 기획안을 업로드해주세요.')
      }

      setDiffs(computeDiff(parsedEpisodes, existingEpisodes))
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
  }, [existingEpisodes])

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
          await createEpisode(projectId, {
            projectId,
            number: d.parsed.number,
            title: d.parsed.title,
            synopsis: d.parsed.synopsis || '',
            targetEmotion: d.parsed.targetEmotion || '',
            coreMessage: '',
            runtime: projectRuntime || '',
            status: 'draft',
            sceneCount: 0,
          })
          created++
        } else if (d.status === 'updated' && d.existing) {
          const patch: Partial<Episode> = {}
          if (d.changedFields.includes('title')) patch.title = d.parsed.title
          if (d.changedFields.includes('synopsis')) patch.synopsis = d.parsed.synopsis
          if (d.changedFields.includes('targetEmotion')) patch.targetEmotion = d.parsed.targetEmotion!
          await updateEpisode(projectId, d.existing.id, patch)
          updated++
        }
      }))

      queryClient.invalidateQueries({ queryKey: ['episodes', projectId] })
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative z-10 w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            maxHeight: '90vh',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4" style={{ color: '#7C3AED' }} />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>기획안으로 에피소드 업데이트</h2>
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
              <X className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
            </button>
          </div>

          {/* Stage indicator */}
          <div className="flex items-center gap-2 px-5 py-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
            {(['upload', 'review', 'done'] as const).map((s, i) => {
              const labels = ['① 문서 업로드', '② 변경 검토', '③ 적용 완료']
              const active = s === stage
              const done = (['upload', 'review', 'done'] as const).indexOf(stage) > i
              return (
                <span key={s} className="text-xs font-medium px-2 py-0.5 rounded-full transition-colors"
                  style={{
                    background: active ? '#EDE9FE' : done ? '#D1FAE5' : 'transparent',
                    color: active ? '#7C3AED' : done ? '#059669' : 'var(--color-text-sub)',
                  }}
                >
                  {labels[i]}
                </span>
              )
            })}
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 p-5">

            {/* ── Stage: upload ── */}
            {stage === 'upload' && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>
                  기획안(PDF/DOCX/TXT/이미지)을 업로드하면 에피소드 정보를 자동으로 인식해 기존 에피소드와 비교합니다.
                </p>

                {/* Drop zone */}
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
                      <p className="text-sm font-medium" style={{ color: '#7C3AED' }}>기획안 분석 중...</p>
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

                {/* Tip */}
                <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: '#EDE9FE33', borderColor: '#C4B5FD', border: '1px solid' }}>
                  <FileText className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#7C3AED' }} />
                  <div className="text-xs space-y-0.5" style={{ color: '#7C3AED' }}>
                    <p className="font-semibold">잘 인식되는 기획안 형식</p>
                    <p>회차별 제목 + 줄거리가 구분된 문서 (예: 1화 &quot;제목&quot; — 줄거리...)</p>
                    <p>기존 에피소드는 화수(number)를 기준으로 매칭됩니다.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Stage: review ── */}
            {stage === 'review' && (
              <div className="space-y-4">
                {/* Summary badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#ECFDF5', color: '#059669' }}>신규 {newCount}개</span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#FFFBEB', color: '#D97706' }}>수정 {updatedCount}개</span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-sub)' }}>동일 {unchangedCount}개</span>
                  <span className="ml-auto text-xs" style={{ color: 'var(--color-text-sub)' }}>{fileName}</span>
                </div>

                {/* Select all */}
                {selectableCount > 0 && (
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCount === selectableCount}
                        onChange={e => toggleAll(e.target.checked)}
                        className="w-3.5 h-3.5 accent-purple-600"
                      />
                      <span className="text-xs" style={{ color: 'var(--color-text-sub)' }}>전체 선택 ({selectedCount}/{selectableCount})</span>
                    </label>
                  </div>
                )}

                {/* Diff list */}
                <div className="space-y-2">
                  {diffs.map((d, idx) => {
                    const cfg = STATUS_CONFIG[d.status]
                    const Icon = cfg.icon
                    const isSelectable = d.status !== 'unchanged'

                    return (
                      <div
                        key={d.parsed.number}
                        onClick={() => isSelectable && toggleSelect(idx)}
                        className={cn(
                          'p-3.5 rounded-xl border transition-all',
                          isSelectable ? 'cursor-pointer' : 'opacity-60',
                          d.selected && isSelectable ? 'border-purple-400' : '',
                        )}
                        style={{
                          background: d.selected && isSelectable ? '#F5F3FF' : cfg.bg,
                          borderColor: d.selected && isSelectable ? '#A78BFA' : 'var(--color-border)',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          {isSelectable && (
                            <input
                              type="checkbox"
                              checked={d.selected}
                              onChange={() => toggleSelect(idx)}
                              onClick={e => e.stopPropagation()}
                              className="mt-0.5 w-3.5 h-3.5 accent-purple-600 shrink-0"
                            />
                          )}
                          {!isSelectable && <div className="w-3.5 shrink-0" />}

                          {/* Status icon */}
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: cfg.color + '22' }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                style={{ background: cfg.color + '22', color: cfg.color }}>
                                {cfg.label}
                              </span>
                              <span className="text-xs font-bold" style={{ color: 'var(--color-text-sub)' }}>
                                {d.parsed.number}화
                              </span>
                              <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                                {d.parsed.title}
                              </span>
                            </div>

                            {/* Show diff for updated items */}
                            {d.status === 'updated' && d.changedFields.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {d.changedFields.map(field => (
                                  <div key={field} className="text-[11px] space-y-0.5">
                                    <span className="font-medium" style={{ color: 'var(--color-text-sub)' }}>{FIELD_LABELS[field]}</span>
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-start gap-1.5 p-1.5 rounded" style={{ background: '#FEE2E2' }}>
                                        <span className="text-red-400 font-bold shrink-0">−</span>
                                        <span className="line-through" style={{ color: '#DC2626' }}>
                                          {field === 'title' ? d.existing?.title
                                            : field === 'synopsis' ? d.existing?.synopsis
                                            : d.existing?.targetEmotion}
                                        </span>
                                      </div>
                                      <div className="flex items-start gap-1.5 p-1.5 rounded" style={{ background: '#DCFCE7' }}>
                                        <span className="text-green-500 font-bold shrink-0">+</span>
                                        <span style={{ color: '#16A34A' }}>
                                          {field === 'title' ? d.parsed.title
                                            : field === 'synopsis' ? d.parsed.synopsis
                                            : d.parsed.targetEmotion}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Synopsis preview for new items */}
                            {d.status === 'new' && d.parsed.synopsis && (
                              <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-text-sub)' }}>
                                {d.parsed.synopsis}
                              </p>
                            )}

                            {/* Unchanged hint */}
                            {d.status === 'unchanged' && (
                              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-sub)' }}>변경 없음</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {diffs.length === 0 && (
                  <div className="text-center py-8" style={{ color: 'var(--color-text-sub)' }}>
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">문서에서 에피소드를 찾을 수 없습니다.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Stage: done ── */}
            {stage === 'done' && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#D1FAE5' }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: '#059669' }} />
                </div>
                <div className="text-center">
                  <p className="font-semibold" style={{ color: 'var(--color-text)' }}>에피소드 업데이트 완료!</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-sub)' }}>에피소드 목록에 반영되었습니다.</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t flex items-center gap-3 shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            {stage === 'upload' && (
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border text-sm transition-colors hover:opacity-70"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}
              >취소</button>
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
                    ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> 적용 중...</span>
                    : `선택 항목 적용 (${selectedCount}개)`
                  }
                </button>
              </>
            )}

            {stage === 'done' && (
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{ background: '#7C3AED' }}
              >닫기</button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
