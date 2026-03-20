'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Scene, Project, Character, AgentResult, AgentStep, ValidationResult } from '@/types'
import { updateScene } from '@/lib/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { useProjectStore } from '@/store/projectStore'
import { useAgentStore, SingleStepType } from '@/store/agentStore'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Play, ChevronDown, CheckCircle, XCircle, Loader2,
  Save, Copy, RefreshCw, Image, Video, FileText, LayoutGrid,
  ChevronUp, AlertTriangle, ChevronRight, Clock, Camera, MessageSquare, Music, Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AgentCrewPanel, AgentStepItem } from './AgentCharacters'

interface Props {
  scene: Scene
  project: Project
  characters: Character[]
  projectId: string
  episodeId: string
  sceneId: string
}

type ResultTab = 'script' | 'image' | 'video' | 'storyboard'
type ImagePlatform = 'base' | 'midjourney' | 'imagen'
type VideoPlatform = 'veo' | 'sora' | 'runway'

// ─── Quality Score Badge ────────────────────────────────
function QualityBadge({ score, grade }: { score: number; grade: string }) {
  const bg = score >= 80 ? '#D1FAE5' : score >= 60 ? '#FEF3C7' : '#FEE2E2'
  const color = score >= 80 ? '#059669' : score >= 60 ? '#D97706' : '#EF4444'
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-semibold" style={{ background: bg, color }}>
      {grade}등급 · {score}점
    </span>
  )
}

// ─── Step item ──────────────────────────────────────────
function StepItem({ step, index }: { step: AgentStep; index: number }) {
  const icons = {
    pending: <div className="w-4 h-4 rounded-full border-2 shrink-0" style={{ borderColor: 'var(--color-border)' }} />,
    running: <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: 'var(--color-primary-dark)' }} />,
    done: <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#059669' }} />,
    error: <XCircle className="w-4 h-4 shrink-0 text-red-500" />,
  }
  return (
    <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg text-sm" style={{
      background: step.status === 'running' ? '#EDE9FE' : undefined,
    }}>
      {icons[step.status]}
      <span className="text-xs" style={{
        color: step.status === 'running' ? 'var(--color-primary-dark)'
          : step.status === 'done' ? '#059669'
          : step.status === 'error' ? '#EF4444'
          : 'var(--color-text-sub)',
      }}>
        Step {index + 1}: {step.label}
      </span>
      {step.result && <span className="text-[11px] ml-auto truncate max-w-32" style={{ color: 'var(--color-text-sub)' }}>{step.result}</span>}
      {step.error && <span className="text-[11px] ml-auto truncate max-w-32 text-red-400">{step.error}</span>}
    </div>
  )
}

// ─── Copy button ────────────────────────────────────────
function CopyBtn({ text, size = 'sm' }: { text: string; size?: 'sm' | 'md' }) {
  const [copied, setCopied] = useState(false)
  const w = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'
  return (
    <button onClick={async () => {
      await navigator.clipboard.writeText(text)
      setCopied(true); toast.success('복사됨')
      setTimeout(() => setCopied(false), 2000)
    }} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors" title="복사">
      {copied ? <CheckCircle className={w} style={{ color: '#059669' }} /> : <Copy className={w} style={{ color: 'var(--color-text-sub)' }} />}
    </button>
  )
}

// ─── Collapsible script section ─────────────────────────
function ScriptSection({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border overflow-hidden mb-3" style={{ borderColor: 'var(--color-border)' }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-[var(--color-surface-2)] transition-colors"
        style={{ background: 'var(--color-surface)' }}>
        <Icon className="w-3.5 h-3.5" style={{ color: 'var(--color-primary-dark)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{title}</span>
        <ChevronRight className={cn('w-3 h-3 ml-auto transition-transform', open && 'rotate-90')} style={{ color: 'var(--color-text-sub)' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 py-3 border-t" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Feedback input bar ─────────────────────────────────
function FeedbackBar({ placeholder, isLoading, onSubmit }: {
  placeholder: string; isLoading: boolean; onSubmit: (feedback: string) => void
}) {
  const [value, setValue] = useState('')
  return (
    <div className="flex gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <input value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder}
        disabled={isLoading}
        onKeyDown={e => { if (e.key === 'Enter' && value.trim()) { onSubmit(value); setValue('') } }}
        className="flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
      />
      <button onClick={() => { if (value.trim()) { onSubmit(value); setValue('') } }}
        disabled={!value.trim() || isLoading}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-medium transition-colors hover:opacity-90 disabled:opacity-50 shrink-0"
        style={{ background: 'var(--color-primary-dark)' }}>
        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        이 항목만 재생성
      </button>
    </div>
  )
}

// ─── Platform sub-tab selector ──────────────────────────
function PlatformTabs<T extends string>({ tabs, active, onChange }: {
  tabs: { id: T; label: string; desc?: string }[]; active: T; onChange: (id: T) => void
}) {
  return (
    <div className="flex gap-1 mb-3 p-0.5 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className="flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium transition-colors"
          style={{
            background: active === t.id ? 'var(--color-surface)' : 'transparent',
            color: active === t.id ? 'var(--color-primary-dark)' : 'var(--color-text-sub)',
            boxShadow: active === t.id ? '0 1px 2px rgba(0,0,0,0.06)' : undefined,
          }}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Prompt display card ────────────────────────────────
function PromptDisplay({ value, desc }: { value: string; desc?: string }) {
  if (!value) return <p className="text-xs italic" style={{ color: 'var(--color-text-sub)' }}>아직 생성되지 않았습니다.</p>
  return (
    <div>
      {desc && <p className="text-[11px] mb-2 italic" style={{ color: 'var(--color-text-sub)' }}>{desc}</p>}
      <div className="relative p-3 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="absolute top-2 right-2"><CopyBtn text={value} /></div>
        <p className="text-xs leading-relaxed font-mono whitespace-pre-wrap pr-8" style={{ color: 'var(--color-text)' }}>{value}</p>
      </div>
    </div>
  )
}

// ─── Individual action map ──────────────────────────────
const INDIVIDUAL_ACTIONS: { id: SingleStepType; label: string; tabId: ResultTab }[] = [
  { id: 'script', label: '연출 스크립트만 생성', tabId: 'script' },
  { id: 'imagePrompt', label: '이미지 프롬프트만 생성', tabId: 'image' },
  { id: 'videoPrompt', label: '영상 프롬프트만 생성', tabId: 'video' },
  { id: 'storyboard', label: '스토리보드만 생성', tabId: 'storyboard' },
]

const IMAGE_PLATFORMS: { id: ImagePlatform; label: string }[] = [
  { id: 'base', label: 'Base' },
  { id: 'midjourney', label: 'Midjourney v6' },
  { id: 'imagen', label: 'Imagen 3' },
]

const VIDEO_PLATFORMS: { id: VideoPlatform; label: string; desc: string }[] = [
  { id: 'veo', label: 'Veo 2', desc: '15초 클립 기준, 시네마틱 카메라 지시 중심' },
  { id: 'sora', label: 'Sora', desc: '물리적 일관성 강조, 서술형 장면 묘사' },
  { id: 'runway', label: 'Runway Gen-3', desc: '짧은 모션 중심, 스타일 키워드 기반' },
]

// ─── Parse script into sections ─────────────────────────
function parseScriptSections(script: string) {
  const sections: { type: 'screen' | 'dialogue' | 'sound' | 'director' | 'text'; title: string; content: string }[] = []
  const lines = script.split('\n')
  let current: typeof sections[0] | null = null

  for (const line of lines) {
    const lower = line.toLowerCase()
    if (line.startsWith('### ') || line.startsWith('## ')) {
      if (current) sections.push(current)
      let type: typeof sections[0]['type'] = 'text'
      if (lower.includes('카메라') || lower.includes('오프닝') || lower.includes('클로징') || lower.includes('비트')) type = 'screen'
      else if (lower.includes('대사') || lower.includes('연출')) type = 'dialogue'
      else if (lower.includes('사운드') || lower.includes('음향') || lower.includes('bgm')) type = 'sound'
      else if (lower.includes('편집') || lower.includes('감독') || lower.includes('노트')) type = 'director'
      current = { type, title: line.replace(/^#+ /, ''), content: '' }
    } else if (current) {
      current.content += line + '\n'
    } else {
      if (!current) current = { type: 'text', title: '연출 스크립트', content: '' }
      current.content += line + '\n'
    }
  }
  if (current) sections.push(current)
  return sections.length > 0 ? sections : [{ type: 'text' as const, title: '연출 스크립트', content: script }]
}

const SECTION_ICONS = {
  screen: Camera,
  dialogue: MessageSquare,
  sound: Music,
  director: Eye,
  text: FileText,
}

// ═══════════════════════════════════════════════════════
// ─── Main Panel ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════
export function SceneAIPanel({ scene, project, characters, projectId, episodeId, sceneId }: Props) {
  const { setAgentStatus, setAgentStep, resetAgent: resetProjectAgent } = useProjectStore()
  const agentStore = useAgentStore()

  const [isRunning, setIsRunning] = useState(false)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [result, setResult] = useState<AgentResult | null>(() => {
    if (scene.assets?.directorScript || scene.assets?.imagePrompt) {
      return buildResultFromAssets(scene)
    }
    return null
  })
  const [activeTab, setActiveTab] = useState<ResultTab>('script')
  const [imagePlatform, setImagePlatform] = useState<ImagePlatform>('midjourney')
  const [selectedCut, setSelectedCut] = useState<number>(0) // 0 = 대표, 1~N = 컷별
  const [videoPlatform, setVideoPlatform] = useState<VideoPlatform>('veo')
  const [transformView, setTransformView] = useState<'after' | 'before'>('after')
  const [showSteps, setShowSteps] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveFlash, setSaveFlash] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const queryClient = useQueryClient()

  // ─── Sync agentStore results → local result state ─────
  useEffect(() => {
    if (agentStore.status === 'done' && (agentStore.directorScript || agentStore.imagePrompts)) {
      setResult(prev => ({
        analysis: agentStore.analysis || prev?.analysis || emptyAnalysis(),
        characterContext: agentStore.characterContext || prev?.characterContext || emptyCharCtx(),
        directorScript: agentStore.directorScript || prev?.directorScript || '',
        imagePrompts: agentStore.imagePrompts || prev?.imagePrompts || emptyImagePrompts(),
        imagePromptCuts: agentStore.imagePromptCuts || prev?.imagePromptCuts || [],
        videoPrompts: agentStore.videoPrompts || prev?.videoPrompts || emptyVideoPrompts(),
        storyboardFrames: agentStore.storyboardFrames || prev?.storyboardFrames || [],
        validation: agentStore.validation || prev?.validation || emptyValidation(),
        agentAnalysis: agentStore.validation?.raw || prev?.agentAnalysis || '',
        steps: prev?.steps || [],
      }))
    }
  }, [agentStore.status, agentStore.directorScript, agentStore.imagePrompts, agentStore.imagePromptCuts, agentStore.videoPrompts, agentStore.storyboardFrames, agentStore.validation, agentStore.analysis, agentStore.characterContext])

  // ─── Auto-save to Firebase on generation complete ─────
  const autoSave = useCallback(async (r: AgentResult) => {
    try {
      await updateScene(projectId, episodeId, sceneId, {
        assets: {
          directorScript: r.directorScript,
          imagePrompt: r.imagePrompts,
          imagePromptCuts: r.imagePromptCuts || [],
          videoPrompt: r.videoPrompts,
          storyboardFrames: r.storyboardFrames,
          agentAnalysis: r.agentAnalysis,
        },
      })
      queryClient.invalidateQueries({ queryKey: ['scene', projectId, episodeId, sceneId] })
      setSaveFlash(true)
      setTimeout(() => setSaveFlash(false), 3000)
    } catch {
      // Silent fail for auto-save, manual save still available
    }
  }, [projectId, episodeId, sceneId, queryClient])

  // ─── Full agent run (SSE) ─────────────────────────────
  async function runAgent() {
    setIsRunning(true)
    setAgentStatus('running')
    setAgentStep(1)
    setShowSteps(true)
    const initialSteps: AgentStep[] = [
      { id: 'analyze', label: '씬 감정 흐름 분석', status: 'pending' },
      { id: 'character', label: '캐릭터 컨텍스트 구성', status: 'pending' },
      { id: 'script', label: '연출 스크립트 작성', status: 'pending' },
      { id: 'image', label: '이미지 프롬프트 생성', status: 'pending' },
      { id: 'video', label: '영상 프롬프트 생성', status: 'pending' },
      { id: 'storyboard', label: '스토리보드 프레임 분해', status: 'pending' },
      { id: 'validate', label: '검수 및 최종 정제', status: 'pending' },
    ]
    setSteps(initialSteps)

    try {
      abortRef.current = new AbortController()
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene, project, characters }),
        signal: abortRef.current.signal,
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let stepIndex = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        for (const line of text.split('\n').filter(l => l.startsWith('data: '))) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'progress') {
              const p = data.progress
              const idx = p.stepNumber - 1
              setSteps(prev => prev.map((s, i) => {
                if (i === idx) return { ...s, status: p.step === 'done' ? 'done' : p.step === 'error' ? 'error' : 'running', result: typeof p.result === 'string' ? p.result : s.result, error: p.step === 'error' ? p.message : undefined }
                if (i < idx && s.status !== 'done' && s.status !== 'error') return { ...s, status: 'done' as const }
                return s
              }))
              if (p.step !== 'done' && p.step !== 'error') { stepIndex = p.stepNumber; setAgentStep(stepIndex) }
            } else if (data.type === 'result') {
              setResult(data.result)
              setActiveTab('script')
              setAgentStatus('done')
              // Auto-save
              autoSave(data.result)
            } else if (data.type === 'error') {
              toast.error('오류: ' + data.message)
              setAgentStatus('error')
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') { toast.error('실행 실패: ' + e.message); setAgentStatus('error') }
    } finally {
      setIsRunning(false)
    }
  }

  // ─── Individual step run ──────────────────────────────
  async function runSingle(stepType: SingleStepType, tabId: ResultTab) {
    setShowDropdown(false)
    setIsRunning(true)
    try {
      await agentStore.runSingleStep(stepType, scene, project, characters)
      setActiveTab(tabId)
      // Auto-save after single step
      const updated = { ...result!, ...getSingleUpdate(stepType) }
      setResult(updated)
      autoSave(updated)
    } catch (e: any) {
      toast.error('생성 실패: ' + e.message)
    } finally {
      setIsRunning(false)
    }
  }

  function getSingleUpdate(stepType: SingleStepType) {
    const s = useAgentStore.getState()
    switch (stepType) {
      case 'script': return s.directorScript ? { directorScript: s.directorScript } : {}
      case 'imagePrompt': return s.imagePrompts ? { imagePrompts: s.imagePrompts, imagePromptCuts: s.imagePromptCuts || [] } : {}
      case 'videoPrompt': return s.videoPrompts ? { videoPrompts: s.videoPrompts } : {}
      case 'storyboard': return s.storyboardFrames ? { storyboardFrames: s.storyboardFrames } : {}
    }
  }

  // ─── Feedback → Regeneration ──────────────────────────
  async function handleRegenerate(stepType: SingleStepType, feedback: string) {
    setRegenerating(stepType)
    agentStore.setFeedback(stepType, feedback)
    try {
      await agentStore.runSingleStep(stepType, scene, project, characters)
      const updated = { ...result!, ...getSingleUpdate(stepType) }
      setResult(updated)
      autoSave(updated)
      toast.success('재생성 완료!')
    } catch (e: any) {
      toast.error('재생성 실패: ' + e.message)
    } finally {
      setRegenerating(null)
    }
  }

  // ─── Manual save ──────────────────────────────────────
  async function saveAssets() {
    if (!result) return
    setSaving(true)
    try {
      await updateScene(projectId, episodeId, sceneId, {
        assets: {
          directorScript: result.directorScript,
          imagePrompt: result.imagePrompts,
          imagePromptCuts: result.imagePromptCuts || [],
          videoPrompt: result.videoPrompts,
          storyboardFrames: result.storyboardFrames,
          agentAnalysis: result.agentAnalysis,
        },
      })
      queryClient.invalidateQueries({ queryKey: ['scene', projectId, episodeId, sceneId] })
      toast.success('에셋이 저장되었습니다!')
      setSaveFlash(true)
      setTimeout(() => setSaveFlash(false), 3000)
    } catch (e: any) {
      toast.error('저장 실패: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const RESULT_TABS = [
    { id: 'script' as ResultTab, label: '연출 스크립트', icon: FileText },
    { id: 'image' as ResultTab, label: '이미지 프롬프트', icon: Image },
    { id: 'video' as ResultTab, label: '영상 프롬프트', icon: Video },
    { id: 'storyboard' as ResultTab, label: '스토리보드', icon: LayoutGrid },
  ]

  const hasErrors = steps.some(s => s.status === 'error')
  const qualityScore = result?.validation ? (result.validation.qualityGrade === 'A' ? 95 : result.validation.qualityGrade === 'B' ? 72 : 45) : null
  const isTransformScene = scene.isAITransformScene && !!scene.transform

  return (
    <div className="flex flex-col h-full">
      {/* ════ Header ════ */}
      <div className="px-5 py-4 border-b sticky top-0 z-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#EDE9FE' }}>
            <Bot className="w-4 h-4" style={{ color: 'var(--color-primary-dark)' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>SceneDirector Agent</span>
          {isRunning && (
            <span className="text-[11px] ml-2 px-2 py-0.5 rounded-full animate-pulse" style={{ background: '#EDE9FE', color: 'var(--color-primary-dark)' }}>
              {agentStore.progressMessage || '실행 중...'}
            </span>
          )}
          {saveFlash && (
            <span className="text-[11px] ml-auto px-2 py-0.5 rounded-full font-medium" style={{ background: '#D1FAE5', color: '#059669' }}>
              ✓ 저장됨
            </span>
          )}
          {!saveFlash && qualityScore !== null && !isRunning && (
            <span className="ml-auto"><QualityBadge score={qualityScore} grade={result!.validation.qualityGrade} /></span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button onClick={runAgent}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-colors hover:opacity-90"
              style={{ background: 'var(--color-primary-dark)' }}>
              <Play className="w-4 h-4" />에이전트 전체 실행
            </button>
          ) : (
            <button onClick={() => { abortRef.current?.abort(); setIsRunning(false); resetProjectAgent() }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium transition-colors hover:bg-red-600">
              <XCircle className="w-4 h-4" />중단
            </button>
          )}

          <div className="relative">
            <button onClick={() => setShowDropdown(!showDropdown)} disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium hover:bg-[var(--color-surface-2)] transition-colors disabled:opacity-50"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}>
              개별 생성 <ChevronDown className="w-3 h-3" />
            </button>
            {showDropdown && (
              <div className="absolute top-full mt-1 left-0 w-52 border rounded-xl shadow-xl z-20" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                {INDIVIDUAL_ACTIONS.map(a => (
                  <button key={a.id} onClick={() => runSingle(a.id, a.tabId)}
                    className="w-full text-left px-3 py-2.5 text-xs hover:bg-[var(--color-surface-2)] transition-colors first:rounded-t-xl last:rounded-b-xl"
                    style={{ color: 'var(--color-text-sub)' }}>
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {result && !isRunning && (
            <button onClick={saveAssets} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-white text-xs font-medium ml-auto transition-colors hover:opacity-90 disabled:opacity-60"
              style={{ background: '#059669' }}>
              <Save className="w-3.5 h-3.5" />{saving ? '저장 중...' : '에셋 저장'}
            </button>
          )}
        </div>
      </div>

      {/* ════ Body ════ */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Agent crew panel */}
        <AgentCrewPanel steps={steps} isRunning={isRunning} />

        {/* Detailed steps log */}
        {steps.length > 0 && (
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-agent)', borderColor: 'var(--color-agent-border)' }}>
            <button onClick={() => setShowSteps(!showSteps)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-green-50 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>상세 실행 로그</span>
                {isRunning && <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--color-primary-dark)' }} />}
                {!isRunning && result && !hasErrors && <CheckCircle className="w-3 h-3" style={{ color: '#059669' }} />}
                {!isRunning && hasErrors && <AlertTriangle className="w-3 h-3 text-amber-500" />}
              </div>
              {showSteps ? <ChevronUp className="w-3.5 h-3.5" style={{ color: 'var(--color-text-sub)' }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--color-text-sub)' }} />}
            </button>
            <AnimatePresence>
              {showSteps && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-3 pb-3 space-y-0.5 border-t" style={{ borderColor: 'var(--color-agent-border)' }}>
                    {steps.map((s, i) => <AgentStepItem key={s.id} step={s} index={i} />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ════ Result tabs ════ */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Tab selector */}
            <div className="flex gap-1 mb-4 p-1 rounded-xl border" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}>
              {RESULT_TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: activeTab === tab.id ? 'var(--color-surface)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--color-primary-dark)' : 'var(--color-text-sub)',
                    boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : undefined,
                  }}>
                  <tab.icon className="w-3 h-3" />{tab.label}
                </button>
              ))}
            </div>

            {/* ════ TAB 1: 연출 스크립트 ════ */}
            {activeTab === 'script' && result.directorScript && (
              <div>
                {/* Header with scene info + quality + copy all */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>S{scene.number}. {scene.title}</h3>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-sub)' }}>{scene.timeStart}~{scene.timeEnd} · {scene.location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {qualityScore !== null && <QualityBadge score={qualityScore} grade={result.validation.qualityGrade} />}
                    <CopyBtn text={result.directorScript} size="md" />
                  </div>
                </div>

                {/* Script sections */}
                {parseScriptSections(result.directorScript).map((sec, i) => {
                  const Icon = SECTION_ICONS[sec.type] || FileText
                  return (
                    <ScriptSection key={i} title={sec.title} icon={Icon} defaultOpen={i < 3}>
                      <p className="text-xs whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-text)' }}>{sec.content.trim()}</p>
                    </ScriptSection>
                  )
                })}

                {/* Validation card */}
                {result.validation && result.validation.styleCompliance && (
                  <div className="p-4 rounded-xl border" style={{ background: 'var(--color-agent)', borderColor: 'var(--color-agent-border)' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: '#059669' }}>품질 검수 결과</p>
                    <div className="space-y-1.5">
                      <p className="text-[11px]" style={{ color: 'var(--color-text)' }}><strong>스타일 준수:</strong> {result.validation.styleCompliance}</p>
                      <p className="text-[11px]" style={{ color: 'var(--color-text)' }}><strong>금지 요소:</strong> {result.validation.prohibitedCheck}</p>
                      <p className="text-[11px]" style={{ color: 'var(--color-text)' }}><strong>핵심 반영:</strong> {result.validation.keyElementReflection}</p>
                      {result.validation.recommendations && result.validation.recommendations !== '없음' && (
                        <p className="text-[11px] px-2 py-1 rounded-lg mt-1" style={{ background: '#FEF3C7', color: '#D97706' }}>
                          권고: {result.validation.recommendations}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <FeedbackBar
                  placeholder="수정하고 싶은 부분을 입력하세요 (예: 대사를 더 짧게, 카메라를 클로즈업으로)"
                  isLoading={regenerating === 'script'}
                  onSubmit={(fb) => handleRegenerate('script', fb)}
                />
              </div>
            )}

            {/* ════ TAB 2: 이미지 프롬프트 ════ */}
            {activeTab === 'image' && result.imagePrompts && (
              <div>
                {/* 컷 선택 바 — 컷별 프롬프트가 있을 때만 표시 */}
                {result.imagePromptCuts && result.imagePromptCuts.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Image className="w-3.5 h-3.5" style={{ color: 'var(--color-primary-dark)' }} />
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>
                        총 {result.imagePromptCuts.length}컷
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-sub)' }}>
                        ({scene.timeStart}~{scene.timeEnd})
                      </span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={() => setSelectedCut(0)}
                        className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors border"
                        style={{
                          background: selectedCut === 0 ? 'var(--color-primary-dark)' : 'var(--color-surface)',
                          color: selectedCut === 0 ? 'white' : 'var(--color-text-sub)',
                          borderColor: selectedCut === 0 ? 'var(--color-primary-dark)' : 'var(--color-border)',
                        }}>
                        대표
                      </button>
                      {result.imagePromptCuts.map((cut) => (
                        <button
                          key={cut.cutNumber}
                          onClick={() => setSelectedCut(cut.cutNumber)}
                          className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors border"
                          style={{
                            background: selectedCut === cut.cutNumber ? 'var(--color-primary-dark)' : 'var(--color-surface)',
                            color: selectedCut === cut.cutNumber ? 'white' : 'var(--color-text-sub)',
                            borderColor: selectedCut === cut.cutNumber ? 'var(--color-primary-dark)' : 'var(--color-border)',
                          }}>
                          {cut.cutNumber}컷
                          <span className="ml-1 opacity-70">{cut.timeStart}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <PlatformTabs tabs={IMAGE_PLATFORMS} active={imagePlatform} onChange={setImagePlatform} />

                {/* Transform scene toggle */}
                {isTransformScene && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-sub)' }}>AI 변환 씬:</span>
                    <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
                      <button onClick={() => setTransformView('before')}
                        className="px-3 py-1 text-[11px] font-medium transition-colors"
                        style={{ background: transformView === 'before' ? 'var(--color-primary-dark)' : 'var(--color-surface)', color: transformView === 'before' ? 'white' : 'var(--color-text-sub)' }}>
                        변환 전
                      </button>
                      <button onClick={() => setTransformView('after')}
                        className="px-3 py-1 text-[11px] font-medium transition-colors"
                        style={{ background: transformView === 'after' ? 'var(--color-primary-dark)' : 'var(--color-surface)', color: transformView === 'after' ? 'white' : 'var(--color-text-sub)' }}>
                        변환 후
                      </button>
                    </div>
                    {transformView === 'before' && scene.transform && (
                      <span className="text-[11px] italic" style={{ color: 'var(--color-text-sub)' }}>{scene.transform.stateBefore}</span>
                    )}
                    {transformView === 'after' && scene.transform && (
                      <span className="text-[11px] italic" style={{ color: '#7C3AED' }}>{scene.transform.stateAfter}</span>
                    )}
                  </div>
                )}

                {/* 컷별 장면 설명 */}
                {selectedCut > 0 && result.imagePromptCuts && (() => {
                  const cut = result.imagePromptCuts.find(c => c.cutNumber === selectedCut)
                  if (!cut) return null
                  return (
                    <div className="mb-3 p-2.5 rounded-lg border" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--color-primary-dark)' }}>
                          컷 {cut.cutNumber}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--color-text-sub)' }}>
                          {cut.timeStart} ~ {cut.timeEnd}
                        </span>
                      </div>
                      <p className="text-[11px]" style={{ color: 'var(--color-text)' }}>{cut.description}</p>
                    </div>
                  )
                })()}

                {/* Platform-specific prompt — 대표 or 컷별 */}
                {(() => {
                  const prompts = selectedCut === 0
                    ? result.imagePrompts
                    : result.imagePromptCuts?.find(c => c.cutNumber === selectedCut)?.prompts || result.imagePrompts
                  return (
                    <>
                      {imagePlatform === 'base' && <PromptDisplay value={prompts.base} />}
                      {imagePlatform === 'midjourney' && <PromptDisplay value={prompts.midjourney} desc="--ar, --style, --v 파라미터 포함 Midjourney v6 최적화" />}
                      {imagePlatform === 'imagen' && <PromptDisplay value={prompts.imagen} desc="자연어 서술형 Google Imagen 3 최적화" />}

                      {/* Negative prompt (always shown) */}
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] font-semibold" style={{ color: '#EF4444' }}>Negative Prompt</span>
                          <CopyBtn text={prompts.negativePrompt} />
                        </div>
                        <div className="p-3 rounded-xl border" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
                          <p className="text-xs font-mono whitespace-pre-wrap" style={{ color: '#991B1B' }}>{prompts.negativePrompt}</p>
                        </div>
                      </div>
                    </>
                  )
                })()}

                <FeedbackBar
                  placeholder="수정하고 싶은 부분을 입력하세요 (예: 더 밝은 톤으로, 캐릭터를 중앙에)"
                  isLoading={regenerating === 'imagePrompt'}
                  onSubmit={(fb) => handleRegenerate('imagePrompt', fb)}
                />
              </div>
            )}

            {/* ════ TAB 3: 영상 프롬프트 ════ */}
            {activeTab === 'video' && result.videoPrompts && (
              <div>
                <PlatformTabs
                  tabs={VIDEO_PLATFORMS.map(v => ({ id: v.id, label: v.label }))}
                  active={videoPlatform}
                  onChange={setVideoPlatform}
                />

                {/* Platform description */}
                <p className="text-[11px] mb-3 px-1 italic" style={{ color: 'var(--color-text-sub)' }}>
                  {VIDEO_PLATFORMS.find(v => v.id === videoPlatform)?.desc}
                </p>

                {/* Transform scene highlight */}
                {isTransformScene && scene.transform && (
                  <div className="mb-3 p-2.5 rounded-xl border" style={{ background: '#F5F3FF', borderColor: '#C4B5FD' }}>
                    <p className="text-[11px] font-semibold mb-1" style={{ color: '#7C3AED' }}>AI 변환 포인트</p>
                    <p className="text-[11px]" style={{ color: 'var(--color-text)' }}>
                      {scene.transform.stateBefore} → <strong>{scene.transform.stateAfter}</strong> ({scene.transform.transitionStyle}, {scene.transform.duration})
                    </p>
                  </div>
                )}

                {videoPlatform === 'veo' && <PromptDisplay value={result.videoPrompts.veo} />}
                {videoPlatform === 'sora' && <PromptDisplay value={result.videoPrompts.sora} />}
                {videoPlatform === 'runway' && <PromptDisplay value={result.videoPrompts.runway} />}

                <FeedbackBar
                  placeholder="수정하고 싶은 부분을 입력하세요 (예: 카메라 움직임 더 느리게, 조명 강조)"
                  isLoading={regenerating === 'videoPrompt'}
                  onSubmit={(fb) => handleRegenerate('videoPrompt', fb)}
                />
              </div>
            )}

            {/* ════ TAB 4: 스토리보드 ════ */}
            {activeTab === 'storyboard' && (
              <div>
                {result.storyboardFrames.length > 0 ? (
                  <>
                    {/* Total time estimate */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--color-text-sub)' }}>
                        <LayoutGrid className="w-3 h-3" />
                        {result.storyboardFrames.length}컷
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--color-text-sub)' }}>
                        <Clock className="w-3 h-3" />
                        예상 {scene.timeStart}~{scene.timeEnd}
                      </div>
                    </div>

                    {/* Horizontal scroll frames */}
                    <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1" style={{ scrollSnapType: 'x mandatory' }}>
                      {result.storyboardFrames.map((frame, i) => (
                        <div key={i} className="flex-none w-72 p-4 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', scrollSnapAlign: 'start' }}>
                          {/* Frame number badge */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center" style={{ background: 'var(--color-accent-2)', color: '#0284C7' }}>
                                {frame.frameNumber}
                              </span>
                              <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>프레임 {frame.frameNumber}</span>
                            </div>
                            <CopyBtn text={formatFrameText(frame)} />
                          </div>

                          {/* Description */}
                          <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--color-text)' }}>{frame.description}</p>

                          {/* Camera note */}
                          <div className="flex items-start gap-1.5 mb-1.5">
                            <Camera className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'var(--color-primary-dark)' }} />
                            <p className="text-[11px]" style={{ color: 'var(--color-text-sub)' }}>{frame.cameraNote}</p>
                          </div>

                          {/* Layout */}
                          <div className="mt-2 p-2 rounded-lg text-[11px] italic" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-sub)' }}>
                            {frame.layout}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Director summary (analysis) */}
                    {result.analysis && result.analysis.keyVisualMoment && (
                      <div className="mt-3 p-3 rounded-xl border" style={{ background: 'var(--color-agent)', borderColor: 'var(--color-agent-border)' }}>
                        <p className="text-[11px] font-semibold mb-1" style={{ color: '#059669' }}>감독 요약</p>
                        <p className="text-[11px]" style={{ color: 'var(--color-text)' }}>
                          <strong>핵심 시각:</strong> {result.analysis.keyVisualMoment}
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: 'var(--color-text)' }}>
                          <strong>감정 흐름:</strong> {result.analysis.emotionFlow}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-sub)' }}>스토리보드가 아직 생성되지 않았습니다.</p>
                )}

                <FeedbackBar
                  placeholder="수정하고 싶은 부분을 입력하세요 (예: 프레임 수를 늘려줘, 클로즈업 컷 추가)"
                  isLoading={regenerating === 'storyboard'}
                  onSubmit={(fb) => handleRegenerate('storyboard', fb)}
                />
              </div>
            )}
          </motion.div>
        )}

        {/* Empty state with crew intro */}
        {!result && !isRunning && steps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex items-center gap-2 mb-5">
              {['🔍', '🎭', '✍️', '🎨', '🎬', '🖼️', '✅'].map((emoji, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{ background: ['#EDE9FE', '#DBEAFE', '#D1FAE5', '#FEF3C7', '#FEE2E2', '#CFFAFE', '#E0E7FF'][i] }}
                >
                  {emoji}
                </motion.div>
              ))}
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>7명의 AI 크루가 대기 중이에요</p>
            <p className="text-xs mb-1" style={{ color: 'var(--color-text-sub)' }}>
              하루, 미르, 소율, 다빈, 지안, 온유, 세진이 함께 작업합니다
            </p>
            <p className="text-[11px]" style={{ color: 'var(--color-text-sub)', opacity: 0.6 }}>
              에이전트를 실행하면 감정 분석 → 캐릭터 구성 → 스크립트 → 프롬프트 → 스토리보드 → 검수까지 자동 진행됩니다
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────

function emptyAnalysis() { return { emotionFlow: '', narrativePosition: '', keyVisualMoment: '', technicalRequirements: '', childSafetyNotes: '', raw: '' } }
function emptyCharCtx() { return { characterCount: 0, context: '', characters: [] } }
function emptyImagePrompts() { return { base: '', midjourney: '', imagen: '', negativePrompt: '' } }
function emptyVideoPrompts() { return { veo: '', sora: '', runway: '' } }
function emptyValidation(): ValidationResult { return { styleCompliance: '', prohibitedCheck: '', keyElementReflection: '', recommendations: '', qualityGrade: 'B', raw: '' } }

function buildResultFromAssets(scene: Scene): AgentResult {
  return {
    analysis: emptyAnalysis(),
    characterContext: emptyCharCtx(),
    directorScript: scene.assets.directorScript || '',
    imagePrompts: scene.assets.imagePrompt || emptyImagePrompts(),
    imagePromptCuts: scene.assets.imagePromptCuts || [],
    videoPrompts: scene.assets.videoPrompt || emptyVideoPrompts(),
    storyboardFrames: scene.assets.storyboardFrames || [],
    validation: emptyValidation(),
    agentAnalysis: scene.assets.agentAnalysis || '',
    steps: [],
  }
}

function formatFrameText(frame: { frameNumber: number; description: string; cameraNote: string; layout: string }) {
  return '[F' + frame.frameNumber + ']\n' + frame.description + '\n카메라: ' + frame.cameraNote + '\n레이아웃: ' + frame.layout
}
