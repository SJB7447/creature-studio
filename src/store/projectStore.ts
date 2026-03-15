import { create } from 'zustand'
import { Project, Episode, Scene, Character } from '@/types'

interface ProjectState {
  currentProject: Project | null
  currentEpisode: Episode | null
  currentScene: Scene | null
  characters: Character[]
  setCurrentProject: (project: Project | null) => void
  setCurrentEpisode: (episode: Episode | null) => void
  setCurrentScene: (scene: Scene | null) => void
  setCharacters: (characters: Character[]) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  currentEpisode: null,
  currentScene: null,
  characters: [],
  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentEpisode: (episode) => set({ currentEpisode: episode }),
  setCurrentScene: (scene) => set({ currentScene: scene }),
  setCharacters: (characters) => set({ characters }),
}))
