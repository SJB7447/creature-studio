'use client'

import { Episode } from '@/types'
import { EpisodeCard } from './EpisodeCard'
import { Film } from 'lucide-react'

interface Props {
  episodes: Episode[]
  projectId: string
  loading: boolean
}

export function EpisodeList({ episodes, projectId, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-card border border-border animate-pulse" />)}
      </div>
    )
  }

  if (episodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
        <Film className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">에피소드가 없습니다.<br />첫 번째 에피소드를 추가해보세요.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {episodes.map(ep => (
        <EpisodeCard key={ep.id} episode={ep} projectId={projectId} />
      ))}
    </div>
  )
}
