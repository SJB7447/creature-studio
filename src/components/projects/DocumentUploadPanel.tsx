'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  X,
  Users,
  Film,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

export interface ParsedDocumentData {
  title: string
  titleEn: string
  type: string
  genre: string
  targetAudience: string
  artStyle: string
  colorPalette: string[]
  moodKeywords: string
  prohibitedElements: string
  referenceWorks: string
  broadcaster: string
  runtime: string
  totalEpisodes: string
  aspectRatio: string
  frameRate: string
  submissionDeadline: string
  synopsis: string
  characters: { name: string; role: string; appearance: string; emotionalRole?: string }[]
  episodes: { number: number; title: string; synopsis: string; targetEmotion?: string }[]
  checklist: {
    hasTitle: boolean
    hasTitleEn: boolean
    hasGenre: boolean
    hasTargetAudience: boolean
    hasArtStyle: boolean
    hasColorPalette: boolean
    hasMoodKeywords: boolean
    hasProhibitedElements: boolean
    hasReferenceWorks: boolean
    hasCharacters: boolean
    hasEpisodes: boolean
    hasSynopsis: boolean
    hasBroadcaster: boolean
    hasRuntime: boolean
    hasTotalEpisodes: boolean
    hasAspectRatio: boolean
    hasFrameRate: boolean
    hasSubmissionDeadline: boolean
  }
  documentType: string
  summary: string
  confidence: string
}

interface DocumentUploadPanelProps {
  onApply: (data: ParsedDocumentData) => void
}

const CHECKLIST_LABELS: Record<string, string> = {
  hasTitle: '작품명',
  hasTitleEn: '영문명',
  hasGenre: '장르',
  hasTargetAudience: '타겟 시청자',
  hasArtStyle: '아트 스타일',
  hasColorPalette: '색상 팔레트',
  hasMoodKeywords: '무드 키워드',
  hasProhibitedElements: '금지 요소',
  hasReferenceWorks: '레퍼런스',
  hasCharacters: '캐릭터 정보',
  hasEpisodes: '에피소드 구성',
  hasSynopsis: '시놉시스',
  hasBroadcaster: '방송사/플랫폼',
  hasRuntime: '러닝타임',
  hasTotalEpisodes: '총 화수',
  hasAspectRatio: '화면비',
  hasFrameRate: '프레임레이트',
  hasSubmissionDeadline: '마감일',
}

export default function DocumentUploadPanel({ onApply }: DocumentUploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedDocumentData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setError(null)
    setParsed(null)
    setParsing(true)

    try {
      const formData = new FormData()
      formData.append('file', f)

      const res = await fetch('/api/document/parse', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || '분석 실패')
      }

      setParsed(json.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setParsing(false)
    }
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setIsDragging(false), [])

  const reset = () => {
    setFile(null)
    setParsed(null)
    setError(null)
    setParsing(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const checklistEntries = parsed
    ? Object.entries(parsed.checklist)
    : []
  const foundCount = checklistEntries.filter(([, v]) => v).length
  const totalCount = checklistEntries.length

  return (
    <div className="mb-6">
      <AnimatePresence mode="wait">
        {/* Upload area - show when no file */}
        {!file && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-border hover:border-purple-500/50 hover:bg-accent/50'
            }`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.webp"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  기획안 또는 스토리보드 업로드
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-sub)' }}>
                  PDF, TXT, DOCX, 이미지(PNG/JPG) 파일을 드래그하거나 클릭하여 업로드
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-purple-400">
                <Sparkles className="w-3.5 h-3.5" />
                AI가 자동으로 분석하여 프로젝트 정보를 채워줍니다
              </div>
            </div>
          </motion.div>
        )}

        {/* Parsing state */}
        {file && parsing && (
          <motion.div
            key="parsing"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-border rounded-2xl p-6"
            style={{ background: 'var(--color-surface)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>문서 분석 중...</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-sub)' }}>
                  {file.name} ({(file.size / 1024).toFixed(1)}KB)
                </p>
              </div>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-accent overflow-hidden">
              <motion.div
                className="h-full bg-purple-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '80%' }}
                transition={{ duration: 8, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )}

        {/* Error state */}
        {file && !parsing && error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-red-500/30 rounded-2xl p-5 bg-red-500/5"
          >
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">분석 실패</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-sub)' }}>{error}</p>
              </div>
              <button onClick={reset} style={{ color: 'var(--color-text-sub)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={reset}
              className="mt-3 text-xs text-purple-400 hover:text-purple-300 underline underline-offset-2"
            >
              다른 파일로 다시 시도
            </button>
          </motion.div>
        )}

        {/* Parsed result */}
        {file && !parsing && parsed && (
          <motion.div
            key="parsed"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-green-500/30 rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-surface)' }}
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                <FileText className="w-4.5 h-4.5 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{file.name}</p>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-[10px] font-medium text-purple-400 shrink-0">
                    {parsed.documentType}
                  </span>
                </div>
                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--color-text-sub)' }}>
                  {parsed.summary}
                </p>
              </div>
              <button onClick={reset} className="shrink-0" style={{ color: 'var(--color-text-sub)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Checklist */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text-sub)' }}>
                    인식된 항목 ({foundCount}/{totalCount})
                  </p>
                  {parsed.confidence && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      parsed.confidence === 'high' ? 'bg-green-500/15 text-green-400' :
                      parsed.confidence === 'medium' ? 'bg-yellow-500/15 text-yellow-500' :
                      'bg-red-500/15 text-red-400'
                    }`}>
                      {parsed.confidence === 'high' ? '높은 정확도' :
                       parsed.confidence === 'medium' ? '보통 정확도' : '낮은 정확도'}
                    </span>
                  )}
                </div>
                <div className="h-1.5 w-24 rounded-full bg-accent overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(foundCount / totalCount) * 100}%`,
                      background: foundCount / totalCount > 0.7 ? '#22c55e' : foundCount / totalCount > 0.4 ? '#eab308' : '#ef4444',
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {checklistEntries.map(([key, found]) => (
                  <div
                    key={key}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs ${
                      found
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-accent/50'
                    }`}
                    style={!found ? { color: 'var(--color-text-sub)' } : undefined}
                  >
                    {found ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    {CHECKLIST_LABELS[key] || key}
                  </div>
                ))}
              </div>

              {/* Color palette preview */}
              {parsed.colorPalette && parsed.colorPalette.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-sub)' }}>팔레트:</span>
                  <div className="flex gap-1">
                    {parsed.colorPalette.map((color, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-md border"
                        style={{ background: color, borderColor: 'var(--color-border)' }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Detail toggle */}
            {(parsed.characters.length > 0 || parsed.episodes.length > 0 || parsed.synopsis) && (
              <div className="border-t border-border">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-xs transition-colors"
                  style={{ color: 'var(--color-text-sub)' }}
                >
                  <span>상세 분석 결과 보기</span>
                  {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3">
                        {/* Synopsis */}
                        {parsed.synopsis && (
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>
                              <BookOpen className="w-3.5 h-3.5" />
                              시놉시스
                            </div>
                            <p className="text-xs leading-relaxed bg-accent/50 p-3 rounded-lg" style={{ color: 'var(--color-text)' }}>
                              {parsed.synopsis}
                            </p>
                          </div>
                        )}

                        {/* Characters */}
                        {parsed.characters.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>
                              <Users className="w-3.5 h-3.5" />
                              캐릭터 ({parsed.characters.length}명)
                            </div>
                            <div className="space-y-1.5">
                              {parsed.characters.map((c, i) => (
                                <div key={i} className="flex items-start gap-2 bg-accent/50 p-2.5 rounded-lg">
                                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-400 shrink-0 mt-0.5">
                                    {c.name?.[0] || '?'}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{c.name}</p>
                                    <p className="text-[11px]" style={{ color: 'var(--color-text-sub)' }}>{c.role}</p>
                                    {c.appearance && (
                                      <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-sub)', opacity: 0.7 }}>{c.appearance}</p>
                                    )}
                                    {c.emotionalRole && (
                                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-[10px] text-purple-400">{c.emotionalRole}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Episodes */}
                        {parsed.episodes.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>
                              <Film className="w-3.5 h-3.5" />
                              에피소드 ({parsed.episodes.length}화)
                            </div>
                            <div className="space-y-1">
                              {parsed.episodes.map((ep, i) => (
                                <div key={i} className="flex items-start gap-2 bg-accent/50 p-2.5 rounded-lg">
                                  <span className="text-[10px] font-bold text-purple-400 w-5 text-center shrink-0 mt-0.5">
                                    {ep.number}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs truncate font-medium" style={{ color: 'var(--color-text)' }}>{ep.title}</p>
                                      {ep.targetEmotion && (
                                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-blue-500/10 text-[10px] text-blue-400">{ep.targetEmotion}</span>
                                      )}
                                    </div>
                                    {ep.synopsis && (
                                      <p className="text-[11px] line-clamp-2 mt-0.5" style={{ color: 'var(--color-text-sub)' }}>{ep.synopsis}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Apply button */}
            <div className="p-4 border-t border-border">
              <button
                onClick={() => onApply(parsed)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                분석 결과를 프로젝트에 적용
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
