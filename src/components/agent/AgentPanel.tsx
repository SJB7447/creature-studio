'use client'

import { useState, useRef } from 'react'
import { Scene, Project, Character, AgentResult, AgentStep } from '@/types'
import { updateScene } from '@/lib/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Play, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, Save } from 'lucide-react'

interface Props {
  scene: Scene
  project: Project
  characters: Character[]
  projectId: string
  episodeId: string
  sceneId: string
  onAssetsSaved: () => void
}

function StepItem({ step }: { step: AgentStep }) {
  const icons = {
    pending: <div className="w-4 h-4 rounded-full border border-border" />,
    running: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
    done: <CheckCircle className="w-4 h-4 text-green-400" />,
    error: <XCircle className="w-4 h-4 text-red-400" />,
  }

  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${
      step.status === 'running' ? 'bg-blue-500/10 border border-blue-500/20' :
      step.status === 'done' ? 'bg-green-500/5' :
      step.status === 'error' ? 'bg-red-500/5' : ''
    }`}>
      {icons[step.status]}
      <div className="flex-1">
        <p className={`text-sm ${
          step.status === 'running' ? 'text-blue-400 agent-running' :
          step.status === 'done' ? 'text-green-400' :
          step.status === 'error' ? 'text-red-400' :
          ''
        }`} style={step.status === 'pending' ? { color: 'var(--color-text-sub)' } : undefined}>{step.label}</p>
        {step.result && step.status === 'done' && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-sub)' }}>{step.result}</p>
        )}
        {step.error && (
          <p className="text-xs text-red-400 mt-0.5">{step.error}</p>
        )}
      </div>
    </div>
  )
}

export function AgentPanel({ scene, project, characters, projectId, episodeId, sceneId, onAssetsSaved }: Props) {
  const [isRunning, setIsRunning] = useState(false)
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [result, setResult] = useState<AgentResult | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()
  const abortRef = useRef<AbortController | null>(null)

  async function runAgent() {
    setIsRunning(true)
    setResult(null)
    setExpanded(true)
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
        const lines = text.split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          const data = JSON.parse(line.slice(6))

          if (data.type === 'progress') {
            const p = data.progress
            const idx = p.stepNumber - 1
            setSteps(prev => prev.map((s, i) => {
              if (i === idx) return { ...s, status: p.step === 'done' ? 'done' as const : p.step === 'error' ? 'error' as const : 'running' as const }
              if (i < idx && s.status !== 'done' && s.status !== 'error') return { ...s, status: 'done' as const }
              return s
            }))
          } else if (data.type === 'step') {
            setSteps(prev => prev.map(s => s.id === data.step.id ? data.step : s))
          } else if (data.type === 'result') {
            setResult(data.result)
          } else if (data.type === 'error') {
            toast.error('에이전트 오류: ' + data.message)
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast.error('에이전트 실행 실패: ' + e.message)
      }
    } finally {
      setIsRunning(false)
    }
  }

  function stopAgent() {
    abortRef.current?.abort()
    setIsRunning(false)
    toast.info('에이전트 실행이 중단되었습니다.')
  }

  async function saveAssets() {
    if (!result) return
    setSaving(true)
    try {
      await updateScene(projectId, episodeId, sceneId, {
        assets: {
          directorScript: result.directorScript,
          imagePrompt: result.imagePrompts,
          imagePromptCuts: result.imagePromptCuts,
          videoPrompt: result.videoPrompts,
          videoPromptCuts: result.videoPromptCuts,
          storyboardFrames: result.storyboardFrames,
          agentAnalysis: result.agentAnalysis,
        },
      })
      queryClient.invalidateQueries({ queryKey: ['scene', projectId, episodeId, sceneId] })
      toast.success('에셋이 저장되었습니다!')
      onAssetsSaved()
    } catch (e: any) {
      toast.error('저장 실패: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Agent description */}
      <div className="p-4 rounded-xl border border-border bg-gradient-to-br from-purple-500/10 to-blue-500/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-purple-400" />
          </div>
          <h2 className="font-medium" style={{ color: 'var(--color-text)' }}>SceneDirector Agent</h2>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>
          씬 데이터와 프로젝트 컨텍스트를 분석해 연출 스크립트, 이미지 프롬프트 (MJ/Imagen), 영상 프롬프트 (Veo/Sora/Runway), 스토리보드를 자동 생성합니다. 7단계 파이프라인으로 품질 검수까지 수행합니다.
        </p>
      </div>

      {/* Run button */}
      <div className="flex gap-3">
        {!isRunning ? (
          <button
            onClick={runAgent}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            에이전트 실행
          </button>
        ) : (
          <button
            onClick={stopAgent}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-medium transition-colors"
          >
            <XCircle className="w-4 h-4" />
            중단
          </button>
        )}
        {result && !isRunning && (
          <button
            onClick={saveAssets}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? '저장 중...' : '에셋 저장'}
          </button>
        )}
      </div>

      {/* Steps */}
      {steps.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'var(--color-surface)' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>에이전트 실행 로그</span>
              {isRunning && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
              {!isRunning && result && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
            </div>
            {expanded ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 space-y-1 border-t border-border">
                  {steps.map(step => <StepItem key={step.id} step={step} />)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Quick preview of result */}
      {result && !isRunning && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-green-500/30 bg-green-500/5"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">생성 완료</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 rounded-lg" style={{ background: 'var(--color-surface)' }}>
              <p className="mb-1" style={{ color: 'var(--color-text-sub)' }}>연출 스크립트</p>
              <p className="line-clamp-2" style={{ color: 'var(--color-text)' }}>{result.directorScript.substring(0, 100)}...</p>
            </div>
            <div className="p-2 rounded-lg" style={{ background: 'var(--color-surface)' }}>
              <p className="mb-1" style={{ color: 'var(--color-text-sub)' }}>이미지 프롬프트 (기본)</p>
              <p className="line-clamp-2" style={{ color: 'var(--color-text)' }}>{result.imagePrompts.base.substring(0, 100)}...</p>
            </div>
            <div className="p-2 rounded-lg" style={{ background: 'var(--color-surface)' }}>
              <p className="mb-1" style={{ color: 'var(--color-text-sub)' }}>스토리보드</p>
              <p style={{ color: 'var(--color-text)' }}>{result.storyboardFrames.length}컷 생성됨</p>
            </div>
            <div className="p-2 rounded-lg" style={{ background: 'var(--color-surface)' }}>
              <p className="mb-1" style={{ color: 'var(--color-text-sub)' }}>품질 검수</p>
              <p className="line-clamp-2" style={{ color: 'var(--color-text)' }}>{result.agentAnalysis.substring(0, 80)}...</p>
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--color-text-sub)' }}>"에셋 저장" 버튼을 클릭해 Firestore에 저장하세요.</p>
        </motion.div>
      )}
    </div>
  )
}
