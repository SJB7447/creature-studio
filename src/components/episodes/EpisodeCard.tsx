'use client'

import Link from 'next/link'
import { Episode } from '@/types'
import { EPISODE_STATUS_LABELS, cn } from '@/lib/utils'
import { ChevronRight, MoreHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteEpisode } from '@/lib/firestore'
import { toast } from 'sonner'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-400',
  inprogress: 'bg-blue-500/20 text-blue-400',
  review: 'bg-yellow-500/20 text-yellow-400',
  final: 'bg-green-500/20 text-green-400',
}

export function EpisodeCard({ episode, projectId }: { episode: Episode; projectId: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => deleteEpisode(projectId, episode.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes', projectId] })
      toast.success('에피소드가 삭제되었습니다.')
    },
    onError: () => toast.error('삭제 실패'),
  })

  return (
    <Link href={`/projects/${projectId}/episodes/${episode.id}`}>
      <div className="group flex items-center gap-4 p-4 rounded-xl border hover:border-purple-500/40 hover:bg-accent/30 transition-all cursor-pointer" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {/* Episode number */}
        <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-purple-400">E{episode.number}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-medium truncate" style={{ color: 'var(--color-text)' }}>{episode.title}</h3>
            <span className={cn('text-xs px-2 py-0.5 rounded-full shrink-0', STATUS_COLORS[episode.status])}>
              {EPISODE_STATUS_LABELS[episode.status]}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-sub)' }}>
            <span>감정: {episode.targetEmotion}</span>
            {episode.runtime && <span>· {episode.runtime}</span>}
            {episode.sceneCount > 0 && <span>· 씬 {episode.sceneCount}개</span>}
          </div>
          {episode.coreMessage && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-sub)', opacity: 0.7 }}>💬 {episode.coreMessage}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="relative">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
            >
              <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 border rounded-lg shadow-xl z-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="p-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault(); e.stopPropagation()
                      if (confirm('에피소드를 삭제할까요?')) deleteMutation.mutate()
                      setMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />삭제
                  </button>
                </div>
              </div>
            )}
          </div>
          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--color-text-sub)' }} />
        </div>
      </div>
    </Link>
  )
}
