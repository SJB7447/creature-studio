import { create } from 'zustand'
import {
  Scene, Project, Character,
  AgentStepName, SceneAnalysis, CharacterContext,
  ImagePrompts, VideoPrompts, StoryboardFrame, ValidationResult,
} from '@/types'

export type AgentStatus = 'idle' | 'running' | 'done' | 'error'
export type SingleStepType = 'script' | 'imagePrompt' | 'videoPrompt' | 'storyboard'

interface AgentStore {
  // 실행 상태
  status: AgentStatus
  currentStep: number
  currentStepName: AgentStepName
  progressMessage: string

  // 결과물
  analysis: SceneAnalysis | null
  characterContext: CharacterContext | null
  directorScript: string | null
  imagePrompts: ImagePrompts | null
  videoPrompts: VideoPrompts | null
  storyboardFrames: StoryboardFrame[] | null
  validation: ValidationResult | null
  qualityScore: number | null

  // 에러
  error: string | null

  // 피드백 (재생성용)
  feedbacks: Record<string, string>

  // 액션
  startAgent: (scene: Scene, project: Project, characters: Character[]) => Promise<void>
  runSingleStep: (stepType: SingleStepType, scene: Scene, project: Project, characters: Character[]) => Promise<void>
  resetAgent: () => void
  setFeedback: (stepType: string, feedback: string) => void
}

const INITIAL_STATE = {
  status: 'idle' as AgentStatus,
  currentStep: 0,
  currentStepName: 'idle' as AgentStepName,
  progressMessage: '',
  analysis: null,
  characterContext: null,
  directorScript: null,
  imagePrompts: null,
  videoPrompts: null,
  storyboardFrames: null,
  validation: null,
  qualityScore: null,
  error: null,
  feedbacks: {},
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  ...INITIAL_STATE,

  startAgent: async (scene, project, characters) => {
    set({
      ...INITIAL_STATE,
      status: 'running',
      currentStep: 1,
      currentStepName: 'analyzing',
      progressMessage: '에이전트 시작...',
    })

    try {
      const abortController = new AbortController()
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene, project, characters }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '에이전트 실행 실패')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        for (const line of text.split('\n').filter(l => l.startsWith('data: '))) {
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'progress') {
              const p = data.progress
              set({
                currentStep: p.stepNumber,
                currentStepName: p.step,
                progressMessage: p.message,
              })

              // Store intermediate results
              if (p.result) {
                if (p.result.analysis) set({ analysis: p.result.analysis })
                if (p.result.characterContext) set({ characterContext: p.result.characterContext })
                if (p.result.directorScript) set({ directorScript: p.result.directorScript })
                if (p.result.imagePrompts) set({ imagePrompts: p.result.imagePrompts })
                if (p.result.videoPrompts) set({ videoPrompts: p.result.videoPrompts })
                if (p.result.storyboardFrames) set({ storyboardFrames: p.result.storyboardFrames })
                if (p.result.validation) {
                  const v = p.result.validation as ValidationResult
                  set({
                    validation: v,
                    qualityScore: v.qualityGrade === 'A' ? 100 : v.qualityGrade === 'B' ? 75 : 50,
                  })
                }
              }
            } else if (data.type === 'result') {
              const r = data.result
              set({
                status: 'done',
                currentStepName: 'done',
                progressMessage: '모든 스텝 완료!',
                analysis: r.analysis,
                characterContext: r.characterContext,
                directorScript: r.directorScript,
                imagePrompts: r.imagePrompts,
                videoPrompts: r.videoPrompts,
                storyboardFrames: r.storyboardFrames,
                validation: r.validation,
                qualityScore: r.validation?.qualityGrade === 'A' ? 100 : r.validation?.qualityGrade === 'B' ? 75 : 50,
              })
            } else if (data.type === 'error') {
              set({ status: 'error', error: data.message, progressMessage: '오류 발생' })
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }

      // Ensure final status if not set by result event
      if (get().status === 'running') {
        set({ status: 'done', progressMessage: '완료' })
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        set({ status: 'error', error: e.message, progressMessage: '실행 실패' })
      }
    }
  },

  runSingleStep: async (stepType, scene, project, characters) => {
    const prev = get()
    set({
      status: 'running',
      progressMessage: getStepMessage(stepType),
      error: null,
    })

    try {
      const res = await fetch('/api/agent/run-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepType,
          scene,
          project,
          characters,
          previousResults: {
            analysis: prev.analysis,
            characterContext: prev.characterContext,
            directorScript: prev.directorScript,
            imagePrompts: prev.imagePrompts,
            videoPrompts: prev.videoPrompts,
          },
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '생성 실패')
      }

      const data = await res.json()

      // Update the relevant result field
      const updates: Partial<AgentStore> = {
        status: 'done',
        progressMessage: getStepDoneMessage(stepType),
      }

      if (data.analysis) updates.analysis = data.analysis
      if (data.characterContext) updates.characterContext = data.characterContext

      if (data.result.directorScript !== undefined) updates.directorScript = data.result.directorScript
      if (data.result.imagePrompts) updates.imagePrompts = data.result.imagePrompts
      if (data.result.videoPrompts) updates.videoPrompts = data.result.videoPrompts
      if (data.result.storyboardFrames) updates.storyboardFrames = data.result.storyboardFrames

      set(updates as any)
    } catch (e: any) {
      set({ status: 'error', error: e.message, progressMessage: '생성 실패' })
    }
  },

  resetAgent: () => set(INITIAL_STATE),

  setFeedback: (stepType, feedback) => {
    set(state => ({ feedbacks: { ...state.feedbacks, [stepType]: feedback } }))
  },
}))

function getStepMessage(stepType: SingleStepType): string {
  const map: Record<SingleStepType, string> = {
    script: '연출 스크립트 생성 중...',
    imagePrompt: '이미지 프롬프트 생성 중...',
    videoPrompt: '영상 프롬프트 생성 중...',
    storyboard: '스토리보드 생성 중...',
  }
  return map[stepType]
}

function getStepDoneMessage(stepType: SingleStepType): string {
  const map: Record<SingleStepType, string> = {
    script: '연출 스크립트 생성 완료',
    imagePrompt: '이미지 프롬프트 생성 완료',
    videoPrompt: '영상 프롬프트 생성 완료',
    storyboard: '스토리보드 생성 완료',
  }
  return map[stepType]
}
