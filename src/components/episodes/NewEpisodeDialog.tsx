'use client'

import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEpisode, getEpisodes, notifyProjectMembers } from '@/lib/firestore'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'

interface FormData {
  title: string
  number: number
  targetEmotion: string
  coreMessage: string
  synopsis: string
  runtime: string
}

export function NewEpisodeDialog({ open, onClose, projectId }: {
  open: boolean
  onClose: () => void
  projectId: string
}) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { currentProject } = useProjectStore()
  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: { number: 1 }
  })

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return createEpisode(projectId, {
        projectId,
        number: Number(data.number),
        title: data.title,
        targetEmotion: data.targetEmotion,
        coreMessage: data.coreMessage,
        synopsis: data.synopsis,
        runtime: data.runtime,
        status: 'draft',
        sceneCount: 0,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['episodes', projectId] })
      toast.success('에피소드가 생성되었습니다!')
      if (user && currentProject) {
        notifyProjectMembers({
          actorId: user.uid,
          actorName: user.displayName || user.email || '알 수 없음',
          actorPhoto: user.photoURL || undefined,
          actionType: 'episode_created',
          projectId,
          projectTitle: currentProject.title,
          targetTitle: variables.title,
        }).catch(() => {})
      }
      reset()
      onClose()
    },
    onError: (e: any) => toast.error('생성 실패: ' + e.message),
  })

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 w-full max-w-lg mx-4 border border-border rounded-2xl shadow-2xl"
          style={{ background: 'var(--color-surface)' }}
        >
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>새 에피소드</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent">
              <X className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
            </button>
          </div>

          <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>화수</label>
                <input type="number" {...register('number', { min: 1 })}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                  style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)', borderWidth: '1px', borderStyle: 'solid' }}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>에피소드 제목 *</label>
                <input {...register('title', { required: true })}
                  placeholder="비를 뿌리는 사자야"
                  className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
                  style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)', borderWidth: '1px', borderStyle: 'solid' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>타겟 감정</label>
                <input {...register('targetEmotion')}
                  placeholder="슬픔 / 억눌린 감정"
                  className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
                  style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)', borderWidth: '1px', borderStyle: 'solid' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>러닝타임</label>
                <input {...register('runtime')}
                  placeholder="4분 30초"
                  className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
                  style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)', borderWidth: '1px', borderStyle: 'solid' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>핵심 메시지</label>
              <input {...register('coreMessage')}
                placeholder="슬플 때 울어도 괜찮아"
                className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
                style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)', borderWidth: '1px', borderStyle: 'solid' }}
              />
            </div>

            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>시놉시스</label>
              <textarea {...register('synopsis')} rows={3}
                placeholder="에피소드 줄거리를 입력하세요..."
                className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500 resize-none"
                style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)', borderWidth: '1px', borderStyle: 'solid' }}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-border hover:bg-accent text-sm transition-colors"
                style={{ color: 'var(--color-text-sub)' }}
              >취소</button>
              <button type="submit" disabled={createMutation.isPending}
                className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition-colors disabled:opacity-60"
              >{createMutation.isPending ? '생성 중...' : '에피소드 생성'}</button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
