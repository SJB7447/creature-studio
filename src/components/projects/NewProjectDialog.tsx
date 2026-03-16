'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createProject } from '@/lib/firestore'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import { X, Plus, Minus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProjectType, ProjectStatus } from '@/types'
import { serverTimestamp } from 'firebase/firestore'

interface FormData {
  title: string
  titleEn: string
  type: ProjectType
  genre: string
  targetAudience: string
  status: ProjectStatus
  artStyle: string
  moodKeywords: string
  prohibitedElements: string
  broadcaster: string
  runtime: string
  totalEpisodes: number
  aspectRatio: '16:9' | '9:16' | '1:1' | '2.39:1'
  frameRate: '24fps' | '30fps' | '60fps'
}

export function NewProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      type: 'animation',
      status: 'development',
      aspectRatio: '16:9',
      frameRate: '24fps',
      totalEpisodes: 1,
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return createProject({
        title: data.title,
        titleEn: data.titleEn,
        type: data.type,
        genre: data.genre.split(',').map(g => g.trim()).filter(Boolean),
        targetAudience: data.targetAudience,
        status: data.status,
        artContext: {
          style: data.artStyle,
          colorPalette: [],
          moodKeywords: data.moodKeywords.split(',').map(k => k.trim()).filter(Boolean),
          prohibitedElements: data.prohibitedElements.split(',').map(e => e.trim()).filter(Boolean),
          referenceWorks: [],
          aspectRatio: data.aspectRatio,
          frameRate: data.frameRate,
        },
        productionInfo: {
          broadcaster: data.broadcaster,
          runtime: data.runtime,
          totalEpisodes: Number(data.totalEpisodes),
        },
        ownerId: user!.uid,
        collaborators: [],
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', user?.uid] })
      toast.success('새 프로젝트가 생성되었습니다!')
      reset()
      onClose()
    },
    onError: (e: any) => toast.error('생성 실패: ' + e.message),
  })

  if (!open) return null

  const inputStyle = { background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)', borderWidth: '1px' as const, borderStyle: 'solid' as const }
  const labelStyle = { color: 'var(--color-text-sub)' }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative z-10 w-full max-w-2xl mx-4 border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--color-surface)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>새 프로젝트 만들기</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
              <X className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
            </button>
          </div>

          <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="p-6 space-y-5">
            {/* Title */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={labelStyle}>작품명 *</label>
                <input
                  {...register('title', { required: true })}
                  placeholder="상상동물병원"
                  className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={labelStyle}>영문명 *</label>
                <input
                  {...register('titleEn', { required: true })}
                  placeholder="Imagination Animal Hospital"
                  className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Type & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={labelStyle}>타입</label>
                <select {...register('type')} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-purple-500" style={inputStyle}>
                  <option value="animation">애니메이션</option>
                  <option value="film">영화</option>
                  <option value="short">단편</option>
                  <option value="documentary">다큐멘터리</option>
                  <option value="other">기타</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={labelStyle}>상태</label>
                <select {...register('status')} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-purple-500" style={inputStyle}>
                  <option value="development">개발 중</option>
                  <option value="preproduction">프리프로덕션</option>
                  <option value="production">제작 중</option>
                  <option value="postproduction">후반 작업</option>
                  <option value="completed">완성</option>
                </select>
              </div>
            </div>

            {/* Genre & Target */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>장르 (쉼표로 구분)</label>
              <input
                {...register('genre')}
                placeholder="감정코칭, 판타지, 힐링"
                className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>타겟 시청자</label>
              <input
                {...register('targetAudience')}
                placeholder="유아/초등 저학년 + 부모"
                className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
                style={inputStyle}
              />
            </div>

            {/* Art Context */}
            <div className="p-4 rounded-xl border border-border bg-accent/30">
              <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>아트 컨텍스트</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs mb-1.5" style={labelStyle}>아트 스타일</label>
                  <input
                    {...register('artStyle')}
                    placeholder="파스텔 톤, 3D 클레이, 부드러운 빛"
                    className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={labelStyle}>무드 키워드 (쉼표 구분)</label>
                  <input
                    {...register('moodKeywords')}
                    placeholder="따뜻함, 안전함, 치유"
                    className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={labelStyle}>금지 요소 (쉼표 구분)</label>
                  <input
                    {...register('prohibitedElements')}
                    placeholder="공포, 날카로운 선, 폭력"
                    className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
                    style={inputStyle}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5" style={labelStyle}>화면 비율</label>
                    <select {...register('aspectRatio')} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-purple-500" style={inputStyle}>
                      <option value="16:9">16:9</option>
                      <option value="9:16">9:16</option>
                      <option value="1:1">1:1</option>
                      <option value="2.39:1">2.39:1</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={labelStyle}>프레임레이트</label>
                    <select {...register('frameRate')} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-purple-500" style={inputStyle}>
                      <option value="24fps">24fps</option>
                      <option value="30fps">30fps</option>
                      <option value="60fps">60fps</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Production Info */}
            <div className="p-4 rounded-xl border border-border bg-accent/30">
              <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>제작 정보</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={labelStyle}>방송사</label>
                  <input
                    {...register('broadcaster')}
                    placeholder="EBS"
                    className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={labelStyle}>러닝타임</label>
                  <input
                    {...register('runtime')}
                    placeholder="10분"
                    className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={labelStyle}>총 화수</label>
                  <input
                    type="number"
                    {...register('totalEpisodes', { min: 1 })}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
                style={{ color: 'var(--color-text-sub)' }}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition-colors disabled:opacity-60"
              >
                {createMutation.isPending ? '생성 중...' : '프로젝트 생성'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
