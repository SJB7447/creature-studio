'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getEpisode, getScenes, getProject } from '@/lib/firestore'
import { useProjectStore } from '@/store/projectStore'
import { useEffect } from 'react'
import { SceneList } from '@/components/scenes/SceneList'
import { NewSceneButton } from '@/components/scenes/NewSceneButton'
import { EPISODE_STATUS_LABELS } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Heart, MessageSquare, Clock } from 'lucide-react'

export default function EpisodePage() {
  const { projectId, episodeId } = useParams<{ projectId: string; episodeId: string }>()
  const { setCurrentEpisode } = useProjectStore()

  const { data: episode, isLoading: epLoading } = useQuery({
    queryKey: ['episode', projectId, episodeId],
    queryFn: () => getEpisode(projectId, episodeId),
    enabled: !!projectId && !!episodeId,
  })

  const { data: scenes = [], isLoading: scenesLoading } = useQuery({
    queryKey: ['scenes', projectId, episodeId],
    queryFn: () => getScenes(projectId, episodeId),
    enabled: !!projectId && !!episodeId,
  })

  useEffect(() => {
    if (episode) setCurrentEpisode(episode)
  }, [episode, setCurrentEpisode])

  if (epLoading) {
    return (
      <div className="p-6">
        <div className="h-32 rounded-xl border animate-pulse mb-6" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} />
      </div>
    )
  }

  if (!episode) {
    return <div className="p-6 text-center" style={{ color: 'var(--color-text-sub)' }}>에피소드를 찾을 수 없습니다.</div>
  }

  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-500/20 text-gray-400',
    inprogress: 'bg-blue-500/20 text-blue-400',
    review: 'bg-yellow-500/20 text-yellow-400',
    final: 'bg-green-500/20 text-green-400',
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Episode Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl border mb-6"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-purple-400">EP.{episode.number}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[episode.status]}`}>
                {EPISODE_STATUS_LABELS[episode.status]}
              </span>
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{episode.title}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-400" />
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>타겟 감정</p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{episode.targetEmotion || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>핵심 메시지</p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{episode.coreMessage || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-green-400" />
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>러닝타임</p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{episode.runtime || '-'}</p>
            </div>
          </div>
        </div>

        {episode.synopsis && (
          <p className="text-sm bg-accent/30 rounded-lg p-3 leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>
            {episode.synopsis}
          </p>
        )}
      </motion.div>

      {/* Scenes */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          씬 목록
          <span className="ml-2 text-sm font-normal" style={{ color: 'var(--color-text-sub)' }}>({scenes.length}개)</span>
        </h2>
        <NewSceneButton projectId={projectId} episodeId={episodeId} />
      </div>

      <SceneList
        scenes={scenes}
        projectId={projectId}
        episodeId={episodeId}
        loading={scenesLoading}
      />
    </div>
  )
}
