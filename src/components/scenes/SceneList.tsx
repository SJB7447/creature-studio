'use client'

import { Scene } from '@/types'
import { SceneCard } from './SceneCard'
import { Clapperboard } from 'lucide-react'

interface Props {
  scenes: Scene[]
  projectId: string
  episodeId: string
  loading: boolean
}

export function SceneList({ scenes, projectId, episodeId, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-card border border-border animate-pulse" />)}
      </div>
    )
  }

  if (scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
        <Clapperboard className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">씬이 없습니다.<br />첫 번째 씬을 추가해보세요.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {scenes.map(scene => (
        <SceneCard
          key={scene.id}
          scene={scene}
          projectId={projectId}
          episodeId={episodeId}
        />
      ))}
    </div>
  )
}
