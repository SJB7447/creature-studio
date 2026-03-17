'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Loader2, ImageIcon, FileText, X, Sparkles, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export type ReferenceContextType = 'character' | 'background' | 'scene' | 'storyboard' | 'style'

interface ReferenceUploadButtonProps {
  contextType: ReferenceContextType
  additionalContext?: string
  onResult: (data: any) => void
  label?: string
  compact?: boolean
}

const CONTEXT_LABELS: Record<ReferenceContextType, { label: string; desc: string; icon: string }> = {
  character: { label: '캐릭터 레퍼런스', desc: '캐릭터 이미지나 설정 문서를 업로드하면 외형, 스타일, 감정 상태를 자동 분석합니다', icon: '🎭' },
  background: { label: '배경 레퍼런스', desc: '배경/환경 이미지를 업로드하면 장소, 조명, 색감을 자동 분석합니다', icon: '🏞️' },
  scene: { label: '씬 레퍼런스', desc: '씬 이미지나 콘티를 업로드하면 카메라, 액션, 감정을 자동 분석합니다', icon: '🎬' },
  storyboard: { label: '스토리보드 레퍼런스', desc: '스토리보드를 업로드하면 프레임별 정보를 자동 추출합니다', icon: '🖼️' },
  style: { label: '스타일 레퍼런스', desc: '아트 스타일 레퍼런스를 업로드하면 색상, 톤, 질감을 자동 분석합니다', icon: '🎨' },
}

export default function ReferenceUploadButton({
  contextType,
  additionalContext,
  onResult,
  label,
  compact = false,
}: ReferenceUploadButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const ctx = CONTEXT_LABELS[contextType]

  const analyze = useCallback(async (file: File) => {
    setIsAnalyzing(true)
    setFileName(file.name)

    // Show image preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('contextType', contextType)
      if (additionalContext) formData.append('additionalContext', additionalContext)

      const res = await fetch('/api/reference/analyze', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '분석 실패')

      onResult(json.data)
      toast.success('레퍼런스 분석 완료! 결과가 적용되었습니다.')
    } catch (e: any) {
      toast.error('분석 실패: ' + e.message)
    } finally {
      setIsAnalyzing(false)
    }
  }, [contextType, additionalContext, onResult])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setShowPanel(true)
      analyze(file)
    }
    if (inputRef.current) inputRef.current.value = ''
  }, [analyze])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      setShowPanel(true)
      analyze(file)
    }
  }, [analyze])

  const reset = () => {
    setPreview(null)
    setFileName(null)
    setShowPanel(false)
  }

  // Compact mode: just a button
  if (compact) {
    return (
      <>
        <input ref={inputRef} type="file" className="hidden"
          accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.webp"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all hover:border-purple-400 hover:bg-purple-50 disabled:opacity-50"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary-dark)' }}
          title={ctx.desc}
        >
          {isAnalyzing ? (
            <><Loader2 className="w-3 h-3 animate-spin" />분석 중...</>
          ) : (
            <><Upload className="w-3 h-3" />{label || '레퍼런스'}</>
          )}
        </button>

        {/* Inline analyzing indicator */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg" style={{ background: '#EDE9FE' }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--color-primary-dark)' }} />
                <span className="text-[11px]" style={{ color: 'var(--color-primary-dark)' }}>
                  {fileName && `${fileName} `}레퍼런스 분석 중...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }

  // Full mode: panel with drag-drop
  return (
    <div>
      <input ref={inputRef} type="file" className="hidden"
        accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.webp"
        onChange={handleFile}
      />

      <AnimatePresence mode="wait">
        {!showPanel ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:border-purple-400 hover:bg-purple-50/30"
            style={{ borderColor: 'var(--color-border)' }}
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: '#EDE9FE' }}>
                {ctx.icon}
              </div>
              <div className="text-left">
                <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                  {label || ctx.label}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-sub)' }}>
                  {ctx.desc}
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: isAnalyzing ? 'var(--color-primary)' : '#86EFAC', background: 'var(--color-surface)' }}
          >
            <div className="p-3 flex items-center gap-3">
              {/* Preview or icon */}
              {preview ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border" style={{ borderColor: 'var(--color-border)' }}>
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: isAnalyzing ? '#EDE9FE' : '#D1FAE5' }}>
                  {isAnalyzing ? (
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-primary-dark)' }} />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" style={{ color: '#059669' }} />
                  )}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
                  {fileName}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: isAnalyzing ? 'var(--color-primary-dark)' : '#059669' }}>
                  {isAnalyzing ? 'AI가 레퍼런스를 분석하고 있어요...' : '분석 완료 — 결과가 폼에 적용되었습니다'}
                </p>
              </div>

              {!isAnalyzing && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors"
                    title="다른 레퍼런스 업로드"
                  >
                    <Upload className="w-3.5 h-3.5" style={{ color: 'var(--color-text-sub)' }} />
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors"
                    title="닫기"
                  >
                    <X className="w-3.5 h-3.5" style={{ color: 'var(--color-text-sub)' }} />
                  </button>
                </div>
              )}
            </div>

            {/* Progress bar while analyzing */}
            {isAnalyzing && (
              <div className="px-3 pb-3">
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'var(--color-primary-dark)' }}
                    initial={{ width: '0%' }}
                    animate={{ width: '85%' }}
                    transition={{ duration: 6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
