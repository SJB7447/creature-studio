'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getProject, getEpisode, getScenes, getCharacters, getConfirmedAssets,
  updateSceneAssets,
} from '@/lib/firestore'
import { uploadGeneratedImage } from '@/lib/storage'
import {
  Scene, Project, Character, ConfirmedAsset, GeneratedImage,
} from '@/types'
import { IMAGEN_MODELS, ImagenModelId } from '@/lib/imagen'
import {
  CharacterController, CharacterSelection,
  buildCharacterPromptSuffix, initCharacterSelections,
} from './CharacterController'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wand2, Image, Loader2, Download, ZoomIn, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, Layers, User, Sparkles, RefreshCw, Info, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Download helper ──────────────────────────────────────
async function downloadImage(url: string, filename: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch {
    // fallback: open in new tab
    window.open(url, '_blank')
  }
}

function buildFilename(sceneNumber: number, cutNumber: number, candidateIndex: number, roundNumber?: number): string {
  const cutStr = cutNumber === 0 ? '대표' : `컷${String(cutNumber).padStart(2, '0')}`
  const roundStr = roundNumber !== undefined ? `_이력${roundNumber}` : ''
  return `S${String(sceneNumber).padStart(2, '0')}_${cutStr}${roundStr}_후보${candidateIndex + 1}.png`
}

// ─── Model selector ──────────────────────────────────────
function ModelSelector({
  value, onChange, hasReferenceImages,
}: {
  value: ImagenModelId
  onChange: (v: ImagenModelId) => void
  hasReferenceImages: boolean
}) {
  return (
    <div className="flex gap-1 p-0.5 rounded-xl border" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}>
      {(Object.values(IMAGEN_MODELS)).map(m => {
        const disabled = m.id === 'imagen3' && hasReferenceImages
        return (
          <button
            key={m.id}
            onClick={() => !disabled && onChange(m.id)}
            disabled={disabled}
            title={disabled ? 'Imagen 3은 레퍼런스 이미지를 지원하지 않습니다' : m.desc}
            className={cn(
              'flex-1 py-1.5 px-1 rounded-lg text-[10px] font-semibold transition-colors relative',
              disabled && 'opacity-40 cursor-not-allowed',
            )}
            style={{
              background: value === m.id ? 'white' : 'transparent',
              color: value === m.id ? '#7C3AED' : 'var(--color-text-sub)',
              boxShadow: value === m.id ? '0 1px 3px rgba(0,0,0,0.1)' : undefined,
            }}
          >
            {m.label}
            {m.recommended === 'hero' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Cut selector bar ─────────────────────────────────────
function CutSelector({
  scene, selectedCut, generatedMap, onSelect,
}: {
  scene: Scene
  selectedCut: number
  generatedMap: Record<number, GeneratedImage>
  onSelect: (n: number) => void
}) {
  const cuts = scene.assets.imagePromptCuts ?? []
  if (cuts.length === 0) return null

  return (
    <div className="flex gap-1 flex-wrap">
      <button
        onClick={() => onSelect(0)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-colors"
        style={{
          background: selectedCut === 0 ? '#7C3AED' : 'var(--color-surface)',
          color: selectedCut === 0 ? 'white' : 'var(--color-text-sub)',
          borderColor: selectedCut === 0 ? '#7C3AED' : 'var(--color-border)',
        }}
      >
        대표
        {generatedMap[0] && <CheckCircle className="w-2.5 h-2.5" />}
      </button>
      {cuts.map(cut => (
        <button
          key={cut.cutNumber}
          onClick={() => onSelect(cut.cutNumber)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-colors"
          style={{
            background: selectedCut === cut.cutNumber ? '#7C3AED' : 'var(--color-surface)',
            color: selectedCut === cut.cutNumber ? 'white' : 'var(--color-text-sub)',
            borderColor: selectedCut === cut.cutNumber ? '#7C3AED' : 'var(--color-border)',
          }}
        >
          {cut.cutNumber}컷
          <span className="opacity-60">{cut.timeStart}</span>
          {generatedMap[cut.cutNumber] && <CheckCircle className="w-2.5 h-2.5" />}
        </button>
      ))}
    </div>
  )
}

// ─── Candidate grid (2×2 selection) ──────────────────────
function CandidateGrid({
  image,
  sceneNumber,
  cutNumber,
  onSelect,
}: {
  image: GeneratedImage
  sceneNumber: number
  cutNumber: number
  onSelect: (index: number) => void
}) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const candidates = image.candidates ?? [image.url]

  return (
    <>
      {/* header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5" style={{ color: '#7C3AED' }} />
          <span className="text-[11px] font-semibold" style={{ color: '#7C3AED' }}>
            생성 완료 · {candidates.length}장 후보
          </span>
          <span className="text-[10px]" style={{ color: '#A78BFA' }}>
            · {IMAGEN_MODELS[image.model as ImagenModelId]?.label ?? image.model}
          </span>
        </div>
        {/* Download selected */}
        <button
          onClick={() => downloadImage(image.url, buildFilename(sceneNumber, cutNumber, image.selectedIndex ?? 0))}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors hover:bg-[var(--color-surface-2)]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}
          title="선택된 이미지 다운로드"
        >
          <Download className="w-3 h-3" /> 저장
        </button>
      </div>

      {/* 2×2 grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {candidates.map((url, idx) => (
          <div key={idx} className="relative group">
            <button
              onClick={() => onSelect(idx)}
              className="w-full rounded-lg overflow-hidden border-2 transition-all"
              style={{
                borderColor: image.selectedIndex === idx ? '#7C3AED' : 'transparent',
                boxShadow: image.selectedIndex === idx ? '0 0 0 1px #7C3AED' : undefined,
              }}
            >
              <img
                src={url}
                alt={`후보 ${idx + 1}`}
                className="w-full object-cover"
                style={{ aspectRatio: '16/9', background: '#1a1a2e' }}
              />
            </button>
            {/* selected badge */}
            {image.selectedIndex === idx && (
              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white pointer-events-none"
                style={{ background: '#7C3AED' }}>
                선택됨
              </div>
            )}
            {/* action buttons (hover) */}
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => downloadImage(url, buildFilename(sceneNumber, cutNumber, idx))}
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.55)' }}
                title={`후보 ${idx + 1} 다운로드`}
              >
                <Download className="w-3 h-3 text-white" />
              </button>
              <button
                onClick={() => setLightboxIdx(idx)}
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.55)' }}
              >
                <ZoomIn className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
            {/* index badge */}
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.55)' }}>
              {idx + 1}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--color-text-sub)' }}>
        클릭하여 선택 · 호버 후 아이콘으로 다운로드/확대
      </p>

      {/* lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.88)' }}
          onClick={() => setLightboxIdx(null)}
        >
          <div className="relative max-w-5xl w-full" onClick={e => e.stopPropagation()}>
            <img
              src={candidates[lightboxIdx]}
              alt="크게보기"
              className="max-w-full max-h-[80vh] rounded-xl object-contain mx-auto block"
            />
            <button
              onClick={() => setLightboxIdx(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="mt-3 flex justify-center gap-2">
              <button
                onClick={() => { onSelect(lightboxIdx); setLightboxIdx(null) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ background: '#7C3AED' }}
              >
                <CheckCircle className="w-4 h-4" /> 이 이미지 선택
              </button>
              <button
                onClick={() => downloadImage(candidates[lightboxIdx], buildFilename(sceneNumber, cutNumber, lightboxIdx))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border"
                style={{ background: 'white', color: '#374151', borderColor: '#D1D5DB' }}
              >
                <Download className="w-4 h-4" /> 다운로드
              </button>
            </div>
            <p className="text-center text-[10px] mt-1.5 text-gray-400">
              {buildFilename(sceneNumber, cutNumber, lightboxIdx)}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

// ─── History round thumbnails ─────────────────────────────
function HistorySection({
  history, sceneNumber, cutNumber,
}: {
  history: GeneratedImage['history']
  sceneNumber: number
  cutNumber: number
}) {
  const [open, setOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{ url: string; filename: string } | null>(null)

  if (!history || history.length === 0) return null

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-[10px] font-semibold"
        style={{ color: 'var(--color-text-sub)' }}
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        이전 생성 기록 {history.length}회
      </button>

      {open && (
        <div className="mt-2 space-y-3">
          {[...history].reverse().map((round, ri) => {
            const roundNumber = history.length - ri
            return (
              <div key={ri} className="p-2.5 rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
                <p className="text-[9px] mb-2 font-semibold" style={{ color: 'var(--color-text-sub)' }}>
                  라운드 {roundNumber} · {round.model} · {new Date(round.createdAt).toLocaleString('ko')}
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {round.candidates.map((url, ci) => (
                    <div key={ci} className="relative group rounded-lg overflow-hidden border-2"
                      style={{ borderColor: round.selectedIndex === ci ? '#7C3AED' : 'transparent', aspectRatio: '16/9' }}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {round.selectedIndex === ci && (
                        <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded flex items-center justify-center pointer-events-none"
                          style={{ background: 'rgba(124,58,237,0.8)' }}>
                          <CheckCircle className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      {/* action buttons on hover */}
                      <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,0.45)' }}>
                        <button
                          onClick={() => setLightbox({ url, filename: buildFilename(sceneNumber, cutNumber, ci, roundNumber) })}
                          className="w-6 h-6 rounded-md flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.6)' }}
                        >
                          <ZoomIn className="w-3 h-3 text-white" />
                        </button>
                        <button
                          onClick={() => downloadImage(url, buildFilename(sceneNumber, cutNumber, ci, roundNumber))}
                          className="w-6 h-6 rounded-md flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.6)' }}
                        >
                          <Download className="w-3 h-3 text-white" />
                        </button>
                      </div>
                      {/* index badge */}
                      <div className="absolute bottom-0.5 right-0.5 px-1 rounded text-[8px] font-bold text-white pointer-events-none"
                        style={{ background: 'rgba(0,0,0,0.55)' }}>
                        {ci + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* History lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.88)' }}
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-5xl w-full" onClick={e => e.stopPropagation()}>
            <img
              src={lightbox.url}
              alt="크게보기"
              className="max-w-full max-h-[80vh] rounded-xl object-contain mx-auto block"
            />
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="mt-3 flex justify-center">
              <button
                onClick={() => downloadImage(lightbox.url, lightbox.filename)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border"
                style={{ background: 'white', color: '#374151', borderColor: '#D1D5DB' }}
              >
                <Download className="w-4 h-4" /> 다운로드
              </button>
            </div>
            <p className="text-center text-[10px] mt-1.5 text-gray-400">{lightbox.filename}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Per-scene card ───────────────────────────────────────
function SceneImageCard({
  scene, project, allCharacters, confirmedAssets,
}: {
  scene: Scene
  project: Project
  allCharacters: Character[]
  confirmedAssets: ConfirmedAsset[]
}) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [selectedCut, setSelectedCut] = useState(0)
  const [model, setModel] = useState<ImagenModelId>('gemini-flash')
  const [saving, setSaving] = useState(false)

  // Firestore에 저장된 이미지로 초기 상태 복원 (구 데이터 호환: candidates/selectedIndex 없을 수 있음)
  const [generatedMap, setGeneratedMap] = useState<Record<number, GeneratedImage>>(() => {
    const saved = scene.assets.generatedImages ?? []
    return Object.fromEntries(saved.map(img => [img.cutNumber, {
      ...img,
      candidates: img.candidates ?? [img.url],
      selectedIndex: img.selectedIndex ?? 0,
    }]))
  })

  const [generatingCut, setGeneratingCut] = useState<number | null>(null)

  const [charSelections, setCharSelections] = useState<CharacterSelection[]>(() =>
    initCharacterSelections(scene.characters, allCharacters, scene.emotionKeywords)
  )

  const hasPrompts = !!(scene.assets.imagePrompt || (scene.assets.imagePromptCuts?.length ?? 0) > 0)

  // 현재 선택된 컷의 프롬프트 가져오기
  function getActivePrompt(): { main: string; negative: string } {
    if (selectedCut === 0) {
      return {
        main: scene.assets.imagePrompt?.imagen || scene.assets.imagePrompt?.base || '',
        negative: scene.assets.imagePrompt?.negativePrompt || '',
      }
    }
    const cut = scene.assets.imagePromptCuts?.find(c => c.cutNumber === selectedCut)
    return {
      main: cut?.prompts.imagen || cut?.prompts.base || '',
      negative: cut?.prompts.negativePrompt || '',
    }
  }

  async function handleGenerate() {
    const { main: basePrompt, negative: negativePrompt } = getActivePrompt()
    if (!basePrompt) { toast.error('이미지 프롬프트가 없습니다. 씬 에디터에서 먼저 AI를 실행해주세요.'); return }

    setGeneratingCut(selectedCut)
    try {
      const { promptSuffix, referenceImageUrls } = buildCharacterPromptSuffix(
        charSelections, allCharacters, confirmedAssets
      )

      const finalPrompt = basePrompt + promptSuffix
      const hasRef = referenceImageUrls.length > 0
      const finalModel: ImagenModelId = hasRef && model === 'imagen3' ? 'gemini-flash' : model

      // 1. 이미지 4장 생성 API 호출
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          negativePrompt,
          aspectRatio: project.artContext.aspectRatio,
          model: finalModel,
          count: 4,
          referenceImageUrls: hasRef ? referenceImageUrls : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // 2. 4장 모두 Firebase Storage에 업로드
      setSaving(true)
      const timestamp = Date.now()
      const candidateUrls = await Promise.all(
        (data.images as { imageData: string; mimeType: string }[]).map((img, idx) =>
          uploadGeneratedImage(
            project.id, scene.episodeId, scene.id,
            selectedCut, img.imageData, img.mimeType,
            `${timestamp}_${idx}`
          )
        )
      )

      const now = new Date().toISOString()
      const prevImg = generatedMap[selectedCut]
      const generated: GeneratedImage = {
        cutNumber: selectedCut,
        url: candidateUrls[0],
        candidates: candidateUrls,
        selectedIndex: 0,
        prompt: finalPrompt,
        model: data.model,
        createdAt: now,
        // 재생성 시 이전 라운드를 history에 보존
        history: prevImg
          ? [
              ...(prevImg.history ?? []),
              {
                candidates: prevImg.candidates ?? [prevImg.url],
                selectedIndex: prevImg.selectedIndex ?? 0,
                prompt: prevImg.prompt,
                model: prevImg.model,
                createdAt: prevImg.createdAt,
              },
            ]
          : [],
      }

      // 3. 로컬 상태 업데이트
      const nextMap = { ...generatedMap, [selectedCut]: generated }
      setGeneratedMap(nextMap)

      // 4. Firestore에 저장
      await updateSceneAssets(project.id, scene.episodeId, scene.id, {
        generatedImages: Object.values(nextMap),
      })
      queryClient.invalidateQueries({ queryKey: ['scenes', project.id, scene.episodeId] })

      toast.success(`씬 ${scene.number} ${candidateUrls.length}장 생성 완료! 원하는 이미지를 선택하세요.`)
    } catch (e: any) {
      toast.error('생성 실패: ' + e.message)
    } finally {
      setGeneratingCut(null)
      setSaving(false)
    }
  }

  async function handleSelectCandidate(cutNum: number, index: number) {
    const img = generatedMap[cutNum]
    if (!img || img.selectedIndex === index) return
    const updated: GeneratedImage = {
      ...img,
      selectedIndex: index,
      url: (img.candidates ?? [img.url])[index] ?? img.url,
    }
    const nextMap = { ...generatedMap, [cutNum]: updated }
    setGeneratedMap(nextMap)
    try {
      await updateSceneAssets(project.id, scene.episodeId, scene.id, {
        generatedImages: Object.values(nextMap),
      })
      queryClient.invalidateQueries({ queryKey: ['scenes', project.id, scene.episodeId] })
      toast.success('선택된 이미지가 저장되었습니다.')
    } catch (e: any) {
      toast.error('저장 실패: ' + e.message)
    }
  }

  const activeGenerated = generatedMap[selectedCut] ?? null
  const isGenerating = generatingCut === selectedCut
  const totalGenerated = Object.keys(generatedMap).length

  const { main: activePrompt } = getActivePrompt()
  const { promptSuffix, referenceImageUrls } = buildCharacterPromptSuffix(charSelections, allCharacters, confirmedAssets)
  const hasRef = referenceImageUrls.length > 0
  const finalPreviewPrompt = activePrompt + promptSuffix

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: totalGenerated > 0 ? '#C4B5FD' : 'var(--color-border)',
        background: 'var(--color-surface)',
      }}
    >
      {/* Card header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)] transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Scene number badge */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm text-white"
          style={{ background: totalGenerated > 0 ? '#7C3AED' : 'var(--color-text-sub)' }}>
          S{scene.number}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{scene.title}</span>
            {totalGenerated > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                {totalGenerated}장 생성됨
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px]" style={{ color: 'var(--color-text-sub)' }}>{scene.timeStart}~{scene.timeEnd}</span>
            <span className="text-[10px]" style={{ color: 'var(--color-text-sub)' }}>· {scene.location}</span>
            {!hasPrompts && (
              <span className="text-[10px] flex items-center gap-0.5" style={{ color: '#EF4444' }}>
                <AlertCircle className="w-3 h-3" />프롬프트 없음
              </span>
            )}
          </div>
        </div>

        {/* Character avatars */}
        <div className="flex -space-x-1 shrink-0">
          {scene.characters.slice(0, 3).map(cid => {
            const char = allCharacters.find(c => c.id === cid)
            const asset = confirmedAssets.find(a => a.category === 'character' &&
              (a.name === char?.name || a.name === char?.nameEn))
            return char ? (
              <div key={cid}
                className="w-6 h-6 rounded-full border-2 border-white overflow-hidden flex items-center justify-center"
                style={{ background: '#EDE9FE' }}>
                {asset?.thumbnailUrl || char.profileImage ? (
                  <img src={asset?.thumbnailUrl || char.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3 h-3" style={{ color: '#7C3AED' }} />
                )}
              </div>
            ) : null
          })}
          {scene.characters.length > 3 && (
            <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold"
              style={{ background: '#EDE9FE', color: '#7C3AED' }}>
              +{scene.characters.length - 3}
            </div>
          )}
        </div>

        {expanded
          ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-sub)' }} />
          : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-sub)' }} />
        }
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: 'var(--color-border)' }}>

              {/* Cut selector */}
              {(scene.assets.imagePromptCuts?.length ?? 0) > 0 && (
                <div className="pt-4">
                  <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--color-text-sub)' }}>컷 선택</p>
                  <CutSelector
                    scene={scene}
                    selectedCut={selectedCut}
                    generatedMap={generatedMap}
                    onSelect={setSelectedCut}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                {/* Left: Controls */}
                <div className="space-y-3">
                  {/* Character controller */}
                  {scene.characters.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <User className="w-3.5 h-3.5" style={{ color: '#7C3AED' }} />
                        <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>등장 캐릭터 컨트롤</p>
                      </div>
                      <CharacterController
                        sceneCharacterIds={scene.characters}
                        allCharacters={allCharacters}
                        confirmedAssets={confirmedAssets}
                        selections={charSelections}
                        onChange={setCharSelections}
                      />
                    </div>
                  )}

                  {/* Model selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-sub)' }}>생성 모델</p>
                      {hasRef && model === 'imagen3' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#D97706' }}>
                          레퍼런스 있어 Flash로 자동 전환
                        </span>
                      )}
                    </div>
                    <ModelSelector value={model} onChange={setModel} hasReferenceImages={hasRef} />
                    <p className="text-[10px] mt-1 italic" style={{ color: 'var(--color-text-sub)' }}>
                      {IMAGEN_MODELS[hasRef && model === 'imagen3' ? 'gemini-flash' : model].desc}
                    </p>
                  </div>

                  {/* Prompt preview */}
                  {activePrompt && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-sub)' }}>
                          최종 프롬프트 미리보기
                        </p>
                        {promptSuffix && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                            캐릭터 정보 포함
                          </span>
                        )}
                      </div>
                      <div className="p-2.5 rounded-lg border text-[10px] font-mono leading-relaxed line-clamp-6"
                        style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text-sub)', whiteSpace: 'pre-wrap' }}>
                        {finalPreviewPrompt}
                      </div>
                    </div>
                  )}

                  {/* Generate button */}
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || saving || !hasPrompts}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-colors hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}
                  >
                    {saving
                      ? <><Loader2 className="w-4 h-4 animate-spin" />저장 중...</>
                      : isGenerating
                        ? <><Loader2 className="w-4 h-4 animate-spin" />생성 중... (최대 30초)</>
                        : <><Wand2 className="w-4 h-4" />{selectedCut === 0 ? '대표 이미지 생성' : `컷 ${selectedCut} 이미지 생성`}</>
                    }
                  </button>
                  {!hasPrompts && (
                    <p className="text-[10px] text-center" style={{ color: '#EF4444' }}>
                      씬 에디터에서 AI 에이전트를 먼저 실행해주세요.
                    </p>
                  )}
                </div>

                {/* Right: Generated image */}
                <div>
                  {activeGenerated ? (
                    <>
                      <CandidateGrid
                        image={activeGenerated}
                        sceneNumber={scene.number}
                        cutNumber={selectedCut}
                        onSelect={(idx) => handleSelectCandidate(selectedCut, idx)}
                      />
                      <HistorySection
                        history={activeGenerated.history}
                        sceneNumber={scene.number}
                        cutNumber={selectedCut}
                      />
                    </>
                  ) : (
                    <div className="h-full min-h-40 flex flex-col items-center justify-center rounded-xl border-2 border-dashed"
                      style={{ borderColor: 'var(--color-border)' }}>
                      <Image className="w-8 h-8 mb-2 opacity-30" style={{ color: 'var(--color-text-sub)' }} />
                      <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>아직 생성된 이미지가 없습니다.</p>
                    </div>
                  )}

                  {/* Thumbnail strip of all generated cuts */}
                  {Object.keys(generatedMap).length > 1 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {Object.entries(generatedMap).map(([cutNum, img]) => (
                        <button
                          key={cutNum}
                          onClick={() => setSelectedCut(Number(cutNum))}
                          className="relative rounded-lg overflow-hidden border-2 transition-colors"
                          style={{
                            borderColor: selectedCut === Number(cutNum) ? '#7C3AED' : 'transparent',
                            width: 52, height: 36,
                          }}
                        >
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 right-0 text-[8px] px-1 font-bold" style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
                            {cutNum === '0' ? '대' : `C${cutNum}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// ─── Main Image Studio Page ──────────────────────────────
// ═══════════════════════════════════════════════════════
export function ImageStudioMain({ projectId, episodeId }: { projectId: string; episodeId: string }) {
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  })
  const { data: episode } = useQuery({
    queryKey: ['episode', projectId, episodeId],
    queryFn: () => getEpisode(projectId, episodeId),
    enabled: !!projectId && !!episodeId,
  })
  const { data: scenes = [] } = useQuery({
    queryKey: ['scenes', projectId, episodeId],
    queryFn: () => getScenes(projectId, episodeId),
    enabled: !!projectId && !!episodeId,
  })
  const { data: allCharacters = [] } = useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => getCharacters(projectId),
    enabled: !!projectId,
  })
  const { data: confirmedAssets = [] } = useQuery({
    queryKey: ['confirmedAssets', projectId],
    queryFn: () => getConfirmedAssets(projectId),
    enabled: !!projectId,
  })

  const isLoading = !project || !episode || scenes.length === 0

  const promptReadyCount = scenes.filter(s =>
    s.assets.imagePrompt || (s.assets.imagePromptCuts?.length ?? 0) > 0
  ).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b shrink-0" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}>
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>이미지 스튜디오</h1>
            {episode && (
              <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>
                EP.{episode.number} {episode.title} · {scenes.length}개 씬
                {promptReadyCount > 0 && ` · ${promptReadyCount}개 프롬프트 준비됨`}
              </p>
            )}
          </div>
        </div>

        {/* Info strip */}
        <div className="flex flex-wrap gap-3 mt-3">
          {(Object.values(IMAGEN_MODELS)).map(m => (
            <div key={m.id} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{
                background: m.id === 'imagen3' ? '#6B7280' : m.id === 'gemini-flash' ? '#7C3AED' : '#F59E0B',
              }} />
              <span className="text-[10px]" style={{ color: 'var(--color-text-sub)' }}>
                <strong>{m.label}</strong> — {m.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary-dark)' }} />
          </div>
        ) : scenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Layers className="w-8 h-8 mb-2 opacity-30" style={{ color: 'var(--color-text-sub)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>이 에피소드에 씬이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl mx-auto">
            {/* Prompt missing warning */}
            {promptReadyCount < scenes.length && (
              <div className="flex items-start gap-2 p-3 rounded-xl border" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
                <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                <p className="text-xs" style={{ color: '#92400E' }}>
                  <strong>{scenes.length - promptReadyCount}개 씬</strong>에 이미지 프롬프트가 없습니다.
                  씬 에디터에서 AI 에이전트를 먼저 실행해주세요.
                </p>
              </div>
            )}

            {scenes.map(scene => (
              <SceneImageCard
                key={scene.id}
                scene={scene}
                project={project!}
                allCharacters={allCharacters}
                confirmedAssets={confirmedAssets}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
