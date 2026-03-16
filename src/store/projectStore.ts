import { create } from 'zustand'
import { Project, Episode, Scene, Character } from '@/types'

export type AgentStatus = 'idle' | 'running' | 'done' | 'error'

interface ProjectState {
  // 현재 선택된 엔티티
  currentProject: Project | null
  currentEpisode: Episode | null
  currentScene: Scene | null
  characters: Character[]

  // 현재 선택된 ID
  currentProjectId: string | null
  currentEpisodeId: string | null
  currentSceneId: string | null

  // 에이전트 실행 상태
  agentStatus: AgentStatus
  agentStep: number         // 1~7
  agentError: string | null

  // 엔티티 세터
  setCurrentProject: (project: Project | null) => void
  setCurrentEpisode: (episode: Episode | null) => void
  setCurrentScene: (scene: Scene | null) => void
  setCharacters: (characters: Character[]) => void

  // ID 세터
  setCurrentProjectId: (id: string | null) => void
  setCurrentEpisodeId: (id: string | null) => void
  setCurrentSceneId: (id: string | null) => void

  // 에이전트 세터
  setAgentStatus: (status: AgentStatus) => void
  setAgentStep: (step: number) => void
  setAgentError: (error: string | null) => void
  resetAgent: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  currentEpisode: null,
  currentScene: null,
  characters: [],

  currentProjectId: null,
  currentEpisodeId: null,
  currentSceneId: null,

  agentStatus: 'idle',
  agentStep: 0,
  agentError: null,

  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentEpisode: (episode) => set({ currentEpisode: episode }),
  setCurrentScene: (scene) => set({ currentScene: scene }),
  setCharacters: (characters) => set({ characters }),

  setCurrentProjectId: (id) => set({ currentProjectId: id }),
  setCurrentEpisodeId: (id) => set({ currentEpisodeId: id }),
  setCurrentSceneId: (id) => set({ currentSceneId: id }),

  setAgentStatus: (status) => set({ agentStatus: status }),
  setAgentStep: (step) => set({ agentStep: step }),
  setAgentError: (error) => set({ agentError: error }),
  resetAgent: () => set({ agentStatus: 'idle', agentStep: 0, agentError: null }),
}))
