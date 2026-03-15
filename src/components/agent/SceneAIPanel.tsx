'use client'

import { useState, useRef } from 'react'
import { Scene, Project, Character, AgentResult, AgentStep, ImagePrompts, VideoPrompts, StoryboardFrame } from '@/types'
import { updateScene } from '@/lib/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Play, ChevronDown, CheckCircle, XCircle, Loader2,
  Save, Copy, RefreshCw, Image, Video, FileText, LayoutGrid, ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  scene: Scene
  project: Project
  characters: Character[]
  projectId: string
  episodeId: string
  sceneId: string
}

type ResultTab = 'script' | 'image' | 'video' | 'storyboard'

function StepItem({ step }: { step: AgentStep }) {
  return (
    <div className={cn('flex items-center gap-2.5 py-1.5 px-3 rounded-lg text-sm transition-colors', {
      'bg-blue-500/10 border border-blue-500/20': step.status === 'running',
      'bg-green-500/5': step.status === 'done',
      'bg-red-500/5': step.status === 'error',
    })}>
      {step.status === 'pending' && <div className="w-3.5 h-3.5 rounded-full border border-border shrink-0" />}
      {step.status === 'running' && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />}
      {step.status === 'done' && <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />}
      {step.status === 'error' && <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
      <span className={cn('text-xs', {
        'text-blue-400': step.status === 'running',
        'text-green-400': step.status === 'done',
        'text-red-400': step.status === 'error',
        'text-muted-foreground': step.status === 'pending',
      })}>{step.label}</span>
      {step.result && <span className="text-xs text-muted-foreground ml-auto truncate max-w-32">{step.result}</span>}
    </div>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={async () => {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('복사됨')
      setTimeout(() => setCopied(false), 2000)
    }} className="p-1.5 rounded-md hover:bg-accent transition-colors">
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  )
}

function PromptCard({ label, value, onRegen }: { label: string; value: string; onRegen?: () => void }) {
  const [feedback, setFeedback] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)

  return (
    <div className="mb-4 rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-accent/30">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          {onRegen && (
            <button onClick={() => setShowFeedback(!showFeedback)} className="p-1.5 rounded-md hover:bg-accent transition-colors">
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <CopyBtn text={value} />
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs text-white leading-relaxed font-mono whitespace-pre-wrap">{value}</p>
      </div>
      {showFeedback && (
        <div className="px-3 pb-3 flex gap-2">
          <input
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="수정 지시 입력 후 재생성..."
            className="flex-1 px-2 py-1.5 rounded-lg bg-accent border border-border text-white text-xs focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={() => { onRegen?.(); setShowFeedback(false); setFeedback('') }}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs"
          >재생성</button>
        </div>
      )}
    </div>
  )
}

const INDIVIDUAL_ACTIONS = [
  { id: 'script', label: '연출 스크립트만 생성' },
  { id: 'image', label: '이미지 프롬프트만 생성' },
  { id: 'video', label: '영상 프롬프트만 생성' },
  { id: 'storyboard', label: '스토리보드만 생성' },
  { id: 'analysis', label: '품질 검수만 실행' },
]

export function SceneAIPanel({ scene, project, characters, projectId, episodeId, sceneId }: Props) {
  const [isRunning, setIsRunning] = useState(false)
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [result, setResult] = useState<AgentResult | null>(() => {
    if (scene.assets?.directorScript || scene.assets?.imagePrompt) {
      return {
        directorScript: scene.assets.directorScript || '',
        imagePrompts: scene.assets.imagePrompt || { base: '', midjourney: '', imagen: '', negativePrompt: '' },
        videoPrompts: scene.assets.videoPrompt || { veo: '', sora: '', runway: '' },
        storyboardFrames: scene.assets.storyboardFrames || [],
        agentAnalysis: scene.assets.agentAnalysis || '',
        steps: [],
      }
    }
    return null
  })
  const [activeTab, setActiveTab] = useState<ResultTab>('script')
  const [showSteps, setShowSteps] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const queryClient = useQueryClient()

  async function runAgent() {
    setIsRunning(true)
    setShowSteps(true)
    setSteps([
      { id: 'analyze', label: '씬 분석 중...', status: 'pending' },
      { id: 'character', label: '캐릭터 컨텍스트 구성 중...', status: 'pending' },
      { id: 'script', label: '연출 스크립트 생성 중...', status: 'pending' },
      { id: 'image', label: '이미지 프롬프트 생성 중...', status: 'pending' },
      { id: 'video', label: '영상 프롬프트 생성 중...', status: 'pending' },
      { id: 'storyboard', label: '스토리보드 프레임 분해 중...', status: 'pending' },
      { id: 'validate', label: '검수 및 최종 정제 중...', status: 'pending' },
    ])

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
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        for (const line of text.split('\n').filter(l => l.startsWith('data: '))) {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'step') setSteps(prev => prev.map(s => s.id === data.step.id ? data.step : s))
          else if (data.type === 'result') { setResult(data.result); setActiveTab('script') }
          else if (data.type === 'error') toast.error('오류: ' + data.message)
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') toast.error('실행 실패: ' + e.message)
    } finally {
      setIsRunning(false)
    }
  }

  async function saveAssets() {
    if (!result) return
    setSaving(true)
    try {
      await updateScene(projectId, episodeId, sceneId, {
        assets: {
          directorScript: result.directorScript,
          imagePrompt: result.imagePrompts,
          videoPrompt: result.videoPrompts,
          storyboardFrames: result.storyboardFrames,
          agentAnalysis: result.agentAnalysis,
        },
      })
      queryClient.invalidateQueries({ queryKey: ['scene', projectId, episodeId, sceneId] })
      toast.success('에셋이 저장되었습니다!')
    } catch (e: any) {
      toast.error('저장 실패: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const RESULT_TABS = [
    { id: 'script' as ResultTab, label: '연출 스크립트', icon: FileText },
    { id: 'image' as ResultTab, label: '이미지', icon: Image },
    { id: 'video' as ResultTab, label: '영상', icon: Video },
    { id: 'storyboard' as ResultTab, label: '스토리보드', icon: LayoutGrid },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border bg-card sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-purple-500/20 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <span className="text-sm font-medium text-white">SceneDirector Agent</span>
        </div>

        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={runAgent}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
            >
              <Play className="w-3.5 h-3.5" />에이전트 전체 실행
            </button>
          ) : (
            <button
              onClick={() => { abortRef.current?.abort(); setIsRunning(false) }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />중단
            </button>
          )}

          {/* Individual generate dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-white hover:bg-accent text-xs transition-colors"
            >
              개별 생성 <ChevronDown className="w-3 h-3" />
            </button>
            {showDropdown && (
              <div className="absolute top-full mt-1 left-0 w-48 bg-card border border-border rounded-xl shadow-xl z-20">
                {INDIVIDUAL_ACTIONS.map(action => (
                  <button
                    key={action.id}
                    onClick={() => { setShowDropdown(false); toast.info(`${action.label} 기능은 곧 추가됩니다.`) }}
                    className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-white hover:bg-accent transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {result && !isRunning && (
            <button
              onClick={saveAssets}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-colors disabled:opacity-60 ml-auto"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? '저장 중...' : '에셋 저장'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Steps log */}
        {steps.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white">실행 로그</span>
                {isRunning && <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />}
                {!isRunning && result && <CheckCircle className="w-3 h-3 text-green-400" />}
              </div>
              {showSteps ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
            <AnimatePresence>
              {showSteps && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-3 pb-3 space-y-0.5 border-t border-border">
                    {steps.map(s => <StepItem key={s.id} step={s} />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Result tabs */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex gap-1 mb-4 p-1 rounded-lg bg-accent/30 border border-border">
              {RESULT_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors', {
                    'bg-card text-white shadow': activeTab === tab.id,
                    'text-muted-foreground hover:text-white': activeTab !== tab.id,
                  })}
                >
                  <tab.icon className="w-3 h-3" />{tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'script' && result.directorScript && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-white">연출 스크립트</span>
                  <CopyBtn text={result.directorScript} />
                </div>
                <div className="p-4 rounded-xl border border-border bg-card">
                  <p className="text-xs text-white whitespace-pre-wrap leading-relaxed">{result.directorScript}</p>
                </div>
                {result.agentAnalysis && (
                  <div className="mt-3 p-3 rounded-xl border border-green-500/20 bg-green-500/5">
                    <p className="text-xs font-medium text-green-400 mb-1">품질 검수 결과</p>
                    <p className="text-xs text-white whitespace-pre-wrap">{result.agentAnalysis}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'image' && result.imagePrompts && (
              <div>
                <PromptCard label="기본 프롬프트" value={result.imagePrompts.base} />
                <PromptCard label="Midjourney" value={result.imagePrompts.midjourney} />
                <PromptCard label="Google Imagen" value={result.imagePrompts.imagen} />
                <PromptCard label="네거티브 프롬프트" value={result.imagePrompts.negativePrompt} />
              </div>
            )}

            {activeTab === 'video' && result.videoPrompts && (
              <div>
                <PromptCard label="Google Veo 2" value={result.videoPrompts.veo} />
                <PromptCard label="OpenAI Sora" value={result.videoPrompts.sora} />
                <PromptCard label="Runway Gen-3" value={result.videoPrompts.runway} />
              </div>
            )}

            {activeTab === 'storyboard' && result.storyboardFrames.length > 0 && (
              <div className="space-y-3">
                {result.storyboardFrames.map((frame, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">{frame.frameNumber}</span>
                      <span className="text-xs font-medium text-white">프레임 {frame.frameNumber}</span>
                    </div>
                    <p className="text-xs text-white mb-1">{frame.description}</p>
                    <p className="text-xs text-muted-foreground">{frame.cameraNote}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1 italic">{frame.layout}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {!result && !isRunning && steps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
              <Bot className="w-7 h-7 text-purple-400/60" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">에이전트를 실행해보세요</p>
            <p className="text-xs text-muted-foreground/60">씬 정보를 저장한 후 실행하면 더 정확한 결과가 나옵니다</p>
          </div>
        )}
      </div>
    </div>
  )
}
