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

// ─── Generated image viewer ───────────────────────────────
function GeneratedImageView({ image, onDownload }: { image: GeneratedImage; onDownload: () => void }) {
  const [lightbox, setLightbox] = useState(false)
  return (
    <>
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#C4B5FD' }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ background: '#F5F3FF' }}>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" style={{ color: '#7C3AED' }} />
            <span className="text-[11px] font-semibold" style={{ color: '#7C3AED' }}>생성 완료</span>
            <span className="text-[10px]" style={{ color: '#A78BFA' }}>
              · {IMAGEN_MODELS[image.model as ImagenModelId]?.label ?? image.model}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setLightbox(true)} className="p-1.5 rounded-lg hover:bg-white/60 transition-colors" title="크게 보기">
              <ZoomIn className="w-3.5 h-3.5" style={{ color: '#7C3AED' }} />
            </button>
            <button onClick={onDownload} className="p-1.5 rounded-lg hover:bg-white/60 transition-colors" title="다운로드">
              <Download className="w-3.5 h-3.5" style={{ color: '#7C3AED' }} />
            </button>
          </div>
        </div>
        <div className="cursor-zoom-in" onClick={() => setLightbox(true)}>
          <img src={image.url} alt="Generated" className="w-full object-contain" style={{ maxHeight: 280, background: '#1a1a2e' }} />
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.88)' }}
          onClick={() => setLightbox(false)}
        >
          <div className="relative max-w-5xl" onClick={e => e.stopPropagation()}>
            <img src={image.url} alt="Generated" className="max-w-full max-h-[90vh] rounded-xl object-contain" />
            <button
              onClick={() => setLightbox(false)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="mt-2 flex justify-center">
              <button
                onClick={onDownload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm"
                style={{ background: '#7C3AED' }}
              >
                <Download className="w-4 h-4" /> 다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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

  // Firestore에 저장된 이미지로 초기 상태 복원
  const [generatedMap, setGeneratedMap] = useState<Record<number, GeneratedImage>>(() => {
    const saved = scene.assets.generatedImages ?? []
    return Object.fromEntries(saved.map(img => [img.cutNumber, img]))
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

      // 1. 이미지 생성 API 호출
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          negativePrompt,
          aspectRatio: project.artContext.aspectRatio,
          model: finalModel,
          referenceImageUrls: hasRef ? referenceImageUrls : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // 2. Firebase Storage에 업로드
      setSaving(true)
      const storageUrl = await uploadGeneratedImage(
        project.id,
        scene.episodeId,
        scene.id,
        selectedCut,
        data.imageData,
        data.mimeType
      )

      const generated: GeneratedImage = {
        cutNumber: selectedCut,
        url: storageUrl,
        prompt: finalPrompt,
        model: data.model,
        createdAt: new Date().toISOString(),
      }

      // 3. 로컬 상태 업데이트
      const nextMap = { ...generatedMap, [selectedCut]: generated }
      setGeneratedMap(nextMap)

      // 4. Firestore에 저장 (scene.assets.generatedImages 배열 전체 교체)
      const allImages = Object.values(nextMap)
      await updateSceneAssets(project.id, scene.episodeId, scene.id, {
        generatedImages: allImages,
      })
      queryClient.invalidateQueries({ queryKey: ['scenes', project.id, scene.episodeId] })

      toast.success(`씬 ${scene.number} 이미지 생성 및 저장 완료!`)
    } catch (e: any) {
      toast.error('생성 실패: ' + e.message)
    } finally {
      setGeneratingCut(null)
      setSaving(false)
    }
  }

  function downloadImage(img: GeneratedImage) {
    const a = document.createElement('a')
    a.href = img.url
    a.download = `S${scene.number}_cut${img.cutNumber}_${img.model}_${Date.now()}.png`
    a.click()
  }

  const activeGenerated = generatedMap[selectedCut] ?? null
  const isGenerating = generatingCut === selectedCut
  const totalGenerated = Object.keys(generatedMap).length

  const { main: activePrompt } = getActivePrompt()
  const { referenceImageUrls } = buildCharacterPromptSuffix(charSelections, allCharacters, confirmedAssets)
  const hasRef = referenceImageUrls.length > 0

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
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--color-text-sub)' }}>
                        사용 프롬프트 (Imagen 최적화)
                      </p>
                      <div className="p-2.5 rounded-lg border text-[10px] font-mono leading-relaxed line-clamp-4"
                        style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}>
                        {activePrompt}
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
                    <GeneratedImageView image={activeGenerated} onDownload={() => downloadImage(activeGenerated)} />
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
