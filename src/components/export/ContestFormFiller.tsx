'use client'

import { useState, useRef } from 'react'
import {
  Upload, Link, Loader2, CheckCircle, Download, Edit3, AlertCircle,
  FileText, Globe, ChevronDown, ChevronUp, Sparkles, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import type { ContestFormField, AnalyzeResponse } from '@/app/api/contest-form/analyze/route'
import type { Project, Character, Episode } from '@/types'

interface Props {
  project: Project
  characters: Character[]
  episodes: Episode[]
  /** EBS 패키지에 포함할 DOCX Blob을 전달하는 콜백 */
  onDocxReady?: (blob: Blob, filename: string) => void
}

type Step = 'input' | 'analyzing' | 'review' | 'generating' | 'done'

export function ContestFormFiller({ project, characters, episodes, onDocxReady }: Props) {
  const [step, setStep] = useState<Step>('input')
  const [inputMode, setInputMode] = useState<'file' | 'url'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set())
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 프로젝트 데이터를 API에 넘길 형태로 직렬화
  function buildProjectData() {
    return {
      title: project.title,
      titleEn: project.titleEn,
      type: project.type,
      genre: project.genre,
      targetAudience: project.targetAudience,
      broadcaster: project.productionInfo.broadcaster,
      runtime: project.productionInfo.runtime,
      totalEpisodes: project.productionInfo.totalEpisodes,
      submissionDeadline: project.productionInfo.submissionDeadline,
      artStyle: project.artContext.style,
      moodKeywords: project.artContext.moodKeywords,
      referenceWorks: project.artContext.referenceWorks,
      characters: characters.map(c =>
        `${c.name}(${c.nameEn}): ${c.role} — ${c.appearance.base}`
      ).join('\n'),
      episodes: episodes.map(e =>
        `EP.${e.number} <${e.title}>: ${e.synopsis}`
      ).join('\n'),
    }
  }

  async function handleAnalyze() {
    if (inputMode === 'file' && !file) { toast.error('파일을 선택해주세요.'); return }
    if (inputMode === 'url' && !url.trim()) { toast.error('URL을 입력해주세요.'); return }

    setStep('analyzing')
    try {
      const fd = new FormData()
      fd.append('projectData', JSON.stringify(buildProjectData()))
      if (inputMode === 'file' && file) {
        fd.append('file', file)
      } else {
        fd.append('url', url.trim())
      }

      const res = await fetch('/api/contest-form/analyze', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? '분석 실패')
      }
      const data: AnalyzeResponse = await res.json()
      setResult(data)
      setStep('review')
    } catch (e: any) {
      toast.error('분석 실패: ' + e.message)
      setStep('input')
    }
  }

  async function handleGenerate() {
    if (!result) return
    setStep('generating')
    try {
      const res = await fetch('/api/contest-form/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contestName: result.contestName,
          fields: result.fields,
          projectTitle: project.title,
        }),
      })
      if (!res.ok) throw new Error('문서 생성 실패')
      const blob = await res.blob()
      setDocxBlob(blob)
      onDocxReady?.(blob, `${result.contestName}_신청서_${project.titleEn}.docx`)
      setStep('done')
      toast.success('신청서 DOCX가 생성됐습니다!')
    } catch (e: any) {
      toast.error('생성 실패: ' + e.message)
      setStep('review')
    }
  }

  function handleDownload() {
    if (!docxBlob || !result) return
    const url = URL.createObjectURL(docxBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.contestName}_신청서_${project.titleEn}.docx`
    a.click()
    URL.revokeObjectURL(url)
  }

  function updateField(id: string, value: string) {
    if (!result) return
    setResult({ ...result, fields: result.fields.map(f => f.id === id ? { ...f, value } : f) })
  }

  function toggleExpand(id: string) {
    setExpandedFields(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filledCount = result?.fields.filter(f => f.value.trim()).length ?? 0
  const totalCount = result?.fields.length ?? 0

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      {/* 헤더 */}
      <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--color-border)', background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#7C3AED' }}>
          <Sparkles className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: '#5B21B6' }}>공모전 신청서 자동 작성</p>
          <p className="text-xs" style={{ color: '#7C3AED' }}>신청서 양식을 올리면 AI가 프로젝트 데이터로 자동 작성합니다</p>
        </div>
        {step !== 'input' && (
          <button
            onClick={() => { setStep('input'); setResult(null); setFile(null); setUrl(''); setDocxBlob(null) }}
            className="ml-auto p-1.5 rounded-lg hover:bg-white/60 transition-colors"
          >
            <X className="w-4 h-4" style={{ color: '#7C3AED' }} />
          </button>
        )}
      </div>

      <div className="p-5">
        <AnimatePresence mode="wait">

          {/* ── Step 1: 입력 ── */}
          {step === 'input' && (
            <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* 지원 포맷 안내 */}
              <div className="flex items-start gap-2 p-3 rounded-xl border" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                <p className="text-xs" style={{ color: '#92400E' }}>
                  지원 형식: <strong>PDF, Word(.docx), 이미지(JPG/PNG), URL 링크</strong><br />
                  HWP는 지원되지 않습니다. PDF로 변환 후 업로드해주세요.
                </p>
              </div>

              {/* 탭: 파일 / URL */}
              <div className="flex gap-1 p-0.5 rounded-xl border" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}>
                {(['file', 'url'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setInputMode(mode)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors"
                    style={{
                      background: inputMode === mode ? 'white' : 'transparent',
                      color: inputMode === mode ? '#7C3AED' : 'var(--color-text-sub)',
                      boxShadow: inputMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : undefined,
                    }}
                  >
                    {mode === 'file' ? <><Upload className="w-3.5 h-3.5" /> 파일 업로드</> : <><Globe className="w-3.5 h-3.5" /> URL 입력</>}
                  </button>
                ))}
              </div>

              {/* 파일 업로드 */}
              {inputMode === 'file' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors hover:border-purple-400"
                  style={{ borderColor: file ? '#7C3AED' : 'var(--color-border)', background: file ? '#FAFAF9' : 'var(--color-surface-2)' }}
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
                      <Upload className="w-7 h-7 mx-auto mb-2" style={{ color: 'var(--color-text-sub)' }} />
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>클릭하여 신청서 파일 선택</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-sub)' }}>PDF, DOCX, JPG, PNG</p>
                    </>
                  )}
                </div>
              )}

              {/* URL 입력 */}
              {inputMode === 'url' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
                    <Link className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-sub)' }} />
                    <input
                      type="url"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      placeholder="https://www.ebs.co.kr/... 공모전 신청 페이지 URL"
                      className="flex-1 bg-transparent text-sm outline-none"
                      style={{ color: 'var(--color-text)' }}
                    />
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>공모전 신청 요강 페이지 URL을 입력하면 양식을 자동 분석합니다.</p>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={inputMode === 'file' ? !file : !url.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}
              >
                <Sparkles className="w-4 h-4" />
                AI로 양식 분석 및 자동 작성
              </button>
            </motion.div>
          )}

          {/* ── Step 2: 분석 중 ── */}
          {step === 'analyzing' && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#EDE9FE' }}>
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#7C3AED' }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>양식 분석 중...</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-sub)' }}>AI가 신청서 항목을 파악하고 프로젝트 데이터로 자동 작성 중입니다</p>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: 필드 검토 ── */}
          {step === 'review' && result && (
            <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* 요약 헤더 */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{result.contestName}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-sub)' }}>
                    총 {totalCount}개 항목 · <span style={{ color: '#059669' }}>{filledCount}개 자동 작성됨</span>
                    {totalCount - filledCount > 0 && <span style={{ color: '#DC2626' }}> · {totalCount - filledCount}개 미작성</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-24 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(filledCount / totalCount) * 100}%`, background: '#7C3AED' }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: '#7C3AED' }}>{Math.round((filledCount / totalCount) * 100)}%</span>
                </div>
              </div>

              {/* 필드 목록 */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {result.fields.map(field => {
                  const isExpanded = expandedFields.has(field.id)
                  const isEmpty = !field.value.trim()
                  return (
                    <div
                      key={field.id}
                      className="rounded-xl border overflow-hidden"
                      style={{
                        borderColor: isEmpty ? '#FCA5A5' : '#C4B5FD',
                        background: isEmpty ? '#FFF5F5' : '#FAFAF9',
                      }}
                    >
                      {/* 항목 헤더 */}
                      <div
                        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer"
                        onClick={() => toggleExpand(field.id)}
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isEmpty ? 'bg-red-400' : 'bg-green-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{field.label}</span>
                            {field.required && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: '#FEE2E2', color: '#DC2626' }}>필수</span>}
                            {field.autoFilled && !isEmpty && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: '#D1FAE5', color: '#059669' }}>AI 작성</span>}
                          </div>
                          {!isExpanded && field.value && (
                            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--color-text-sub)' }}>{field.value}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Edit3 className="w-3 h-3" style={{ color: 'var(--color-text-sub)' }} />
                          {isExpanded
                            ? <ChevronUp className="w-3.5 h-3.5" style={{ color: 'var(--color-text-sub)' }} />
                            : <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--color-text-sub)' }} />}
                        </div>
                      </div>

                      {/* 편집 영역 */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t space-y-1.5" style={{ borderColor: '#E5E7EB', background: 'white' }}>
                          {field.description && (
                            <p className="text-[10px] italic" style={{ color: 'var(--color-text-sub)' }}>{field.description}</p>
                          )}
                          {field.type === 'textarea' ? (
                            <textarea
                              value={field.value}
                              onChange={e => updateField(field.id, e.target.value)}
                              rows={5}
                              placeholder="내용을 입력하세요..."
                              className="w-full px-2.5 py-2 rounded-lg border text-xs resize-y outline-none"
                              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                            />
                          ) : (
                            <input
                              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                              value={field.value}
                              onChange={e => updateField(field.id, e.target.value)}
                              placeholder="내용을 입력하세요..."
                              className="w-full px-2.5 py-2 rounded-lg border text-xs outline-none"
                              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 미작성 경고 */}
              {totalCount - filledCount > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl border" style={{ background: '#FFF5F5', borderColor: '#FCA5A5' }}>
                  <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#DC2626' }} />
                  <p className="text-xs" style={{ color: '#991B1B' }}>
                    {totalCount - filledCount}개 항목이 비어있습니다. 직접 입력하거나 그대로 생성할 수 있습니다.
                  </p>
                </div>
              )}

              <button
                onClick={handleGenerate}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}
              >
                <FileText className="w-4 h-4" />
                DOCX 신청서 생성
              </button>
            </motion.div>
          )}

          {/* ── Step 4: 생성 중 ── */}
          {step === 'generating' && (
            <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#EDE9FE' }}>
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#7C3AED' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>DOCX 문서 생성 중...</p>
            </motion.div>
          )}

          {/* ── Step 5: 완료 ── */}
          {step === 'done' && result && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex flex-col items-center py-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#D1FAE5' }}>
                  <CheckCircle className="w-7 h-7" style={{ color: '#059669' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>신청서 생성 완료!</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-sub)' }}>
                    {result.contestName} · {filledCount}/{totalCount}개 항목 작성
                  </p>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
              >
                <Download className="w-4 h-4" />
                DOCX 다운로드
              </button>

              {onDocxReady && (
                <p className="text-[11px] text-center" style={{ color: 'var(--color-text-sub)' }}>
                  ✓ EBS 패키지에 자동 포함됩니다
                </p>
              )}

              <button
                onClick={() => { setStep('input'); setResult(null); setFile(null); setUrl(''); setDocxBlob(null) }}
                className="w-full py-2 rounded-xl text-xs border transition-colors hover:bg-[var(--color-surface-2)]"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}
              >
                다른 양식 작성하기
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
