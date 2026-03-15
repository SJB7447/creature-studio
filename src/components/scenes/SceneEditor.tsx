'use client'

import { useState } from 'react'
import { Scene, Project, Character } from '@/types'
import { SceneFormPanel } from './SceneFormPanel'
import { SceneAIPanel } from '../agent/SceneAIPanel'

interface Props {
  scene: Scene
  project: Project
  characters: Character[]
  projectId: string
  episodeId: string
  sceneId: string
}

export function SceneEditor({ scene, project, characters, projectId, episodeId, sceneId }: Props) {
  const [currentScene, setCurrentScene] = useState(scene)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel: Scene form */}
      <div className="w-1/2 border-r border-border overflow-y-auto">
        <SceneFormPanel
          scene={currentScene}
          characters={characters}
          projectId={projectId}
          episodeId={episodeId}
          sceneId={sceneId}
          onUpdate={setCurrentScene}
        />
      </div>

      {/* Right panel: AI generation */}
      <div className="w-1/2 overflow-y-auto bg-card/30">
        <SceneAIPanel
          scene={currentScene}
          project={project}
          characters={characters}
          projectId={projectId}
          episodeId={episodeId}
          sceneId={sceneId}
        />
      </div>
    </div>
  )
}
