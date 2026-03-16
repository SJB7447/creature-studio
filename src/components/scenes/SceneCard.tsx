'use client'

import Link from 'next/link'
import { Scene } from '@/types'
import { SCENE_STATUS_LABELS, CAMERA_MOVEMENT_LABELS, cn } from '@/lib/utils'
import { ChevronRight, MoreHorizontal, Trash2, Zap, Image, Video } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteScene } from '@/lib/firestore'
import { toast } from 'sonner'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-400',
  inprogress: 'bg-blue-500/20 text-blue-400',
  review: 'bg-yellow-500/20 text-yellow-400',
  final: 'bg-green-500/20 text-green-400',
}

export function SceneCard({ scene, projectId, episodeId }: {
  scene: Scene
  projectId: string
  episodeId: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => deleteScene(projectId, episodeId, scene.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenes', projectId, episodeId] })
      toast.success('씬이 삭제되었습니다.')
    },
    onError: () => toast.error('삭제 실패'),
  })

  const hasAssets = !!(scene.assets?.imagePrompt || scene.assets?.videoPrompt || scene.assets?.directorScript)

  return (
    <Link href={`/projects/${projectId}/episodes/${episodeId}/scenes/${scene.id}`}>
      <div className="group flex items-center gap-4 p-4 rounded-xl border hover:border-purple-500/40 hover:bg-accent/30 transition-all cursor-pointer" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {/* Scene number */}
        <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-cyan-400">S{scene.number}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-medium truncate" style={{ color: 'var(--color-text)' }}>{scene.title}</h3>
            {scene.isAITransformScene && (
              <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 shrink-0">
                <Zap className="w-3 h-3" />AI 변환
              </span>
            )}
            <span className={cn('text-xs px-2 py-0.5 rounded-full shrink-0', STATUS_COLORS[scene.status])}>
              {SCENE_STATUS_LABELS[scene.status]}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-sub)' }}>
            <span>{scene.location}</span>
            {scene.timeStart && <span>· {scene.timeStart}~{scene.timeEnd}</span>}
            <span>· {CAMERA_MOVEMENT_LABELS[scene.cameraMovement]}</span>
            {scene.emotionKeywords.length > 0 && (
              <span>· {scene.emotionKeywords.slice(0, 2).join(', ')}</span>
            )}
          </div>
        </div>

        {/* Asset indicators */}
        <div className="flex items-center gap-1.5 shrink-0">
          {scene.assets?.directorScript && (
            <span title="연출 스크립트" className="text-green-400 opacity-60">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
            </span>
          )}
          {scene.assets?.imagePrompt && (
            <span title="이미지 프롬프트"><Image className="w-3.5 h-3.5 text-blue-400 opacity-60" /></span>
          )}
          {scene.assets?.videoPrompt && (
            <span title="영상 프롬프트"><Video className="w-3.5 h-3.5 text-purple-400 opacity-60" /></span>
          )}
        </div>

        {/* Menu & chevron */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="relative">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
            >
              <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-32 border rounded-lg shadow-xl z-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="p-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault(); e.stopPropagation()
                      if (confirm('씬을 삭제할까요?')) deleteMutation.mutate()
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
