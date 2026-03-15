'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProject, updateProject, deleteProject } from '@/lib/firestore'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Save, Trash2 } from 'lucide-react'
import { useProjectStore } from '@/store/projectStore'
import { useAuthStore } from '@/store/authStore'

interface FormData {
  title: string
  titleEn: string
  type: string
  status: string
  genre: string
  targetAudience: string
  artStyle: string
  moodKeywords: string
  prohibitedElements: string
  referenceWorks: string
  aspectRatio: string
  frameRate: string
  broadcaster: string
  runtime: string
  totalEpisodes: number
  submissionDeadline: string
}

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const { setCurrentProject } = useProjectStore()
  const queryClient = useQueryClient()

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  })

  const { register, handleSubmit, reset } = useForm<FormData>()

  useEffect(() => {
    if (project) {
      reset({
        title: project.title,
        titleEn: project.titleEn,
        type: project.type,
        status: project.status,
        genre: project.genre.join(', '),
        targetAudience: project.targetAudience,
        artStyle: project.artContext.style,
        moodKeywords: project.artContext.moodKeywords.join(', '),
        prohibitedElements: project.artContext.prohibitedElements.join(', '),
        referenceWorks: project.artContext.referenceWorks.join(', '),
        aspectRatio: project.artContext.aspectRatio,
        frameRate: project.artContext.frameRate,
        broadcaster: project.productionInfo.broadcaster,
        runtime: project.productionInfo.runtime,
        totalEpisodes: project.productionInfo.totalEpisodes,
        submissionDeadline: project.productionInfo.submissionDeadline || '',
      })
    }
  }, [project, reset])

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return updateProject(projectId, {
        title: data.title,
        titleEn: data.titleEn,
        type: data.type as any,
        status: data.status as any,
        genre: data.genre.split(',').map(g => g.trim()).filter(Boolean),
        targetAudience: data.targetAudience,
        artContext: {
          style: data.artStyle,
          colorPalette: project?.artContext.colorPalette || [],
          moodKeywords: data.moodKeywords.split(',').map(k => k.trim()).filter(Boolean),
          prohibitedElements: data.prohibitedElements.split(',').map(e => e.trim()).filter(Boolean),
          referenceWorks: data.referenceWorks.split(',').map(r => r.trim()).filter(Boolean),
          aspectRatio: data.aspectRatio as any,
          frameRate: data.frameRate as any,
        },
        productionInfo: {
          broadcaster: data.broadcaster,
          runtime: data.runtime,
          totalEpisodes: Number(data.totalEpisodes),
          submissionDeadline: data.submissionDeadline || undefined,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects', user?.uid] })
      toast.success('프로젝트 설정이 저장되었습니다.')
    },
    onError: (e: any) => toast.error('저장 실패: ' + e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(projectId),
    onSuccess: () => {
      setCurrentProject(null)
      queryClient.invalidateQueries({ queryKey: ['projects', user?.uid] })
      router.push('/dashboard')
      toast.success('프로젝트가 삭제되었습니다.')
    },
    onError: (e: any) => toast.error('삭제 실패: ' + e.message),
  })

  const inputCls = "w-full px-3 py-2 rounded-lg bg-accent border border-border text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
  const selectCls = "w-full px-3 py-2 rounded-lg bg-accent border border-border text-white text-sm focus:outline-none focus:border-purple-500"

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">프로젝트 설정</h1>

      <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-6">
        {/* Basic */}
        <div className="p-5 rounded-xl border border-border bg-card space-y-4">
          <h2 className="text-sm font-medium text-white">기본 정보</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">작품명</label>
              <input {...register('title')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">영문명</label>
              <input {...register('titleEn')} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">타입</label>
              <select {...register('type')} className={selectCls}>
                <option value="animation">애니메이션</option>
                <option value="film">영화</option>
                <option value="short">단편</option>
                <option value="documentary">다큐멘터리</option>
                <option value="other">기타</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">상태</label>
              <select {...register('status')} className={selectCls}>
                <option value="development">개발 중</option>
                <option value="preproduction">프리프로덕션</option>
                <option value="production">제작 중</option>
                <option value="postproduction">후반 작업</option>
                <option value="completed">완성</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">장르 (쉼표 구분)</label>
            <input {...register('genre')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">타겟 시청자</label>
            <input {...register('targetAudience')} className={inputCls} />
          </div>
        </div>

        {/* Art Context */}
        <div className="p-5 rounded-xl border border-border bg-card space-y-4">
          <h2 className="text-sm font-medium text-white">아트 컨텍스트</h2>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">아트 스타일</label>
            <input {...register('artStyle')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">무드 키워드</label>
            <input {...register('moodKeywords')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">금지 요소</label>
            <input {...register('prohibitedElements')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">레퍼런스 작품</label>
            <input {...register('referenceWorks')} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">화면 비율</label>
              <select {...register('aspectRatio')} className={selectCls}>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
                <option value="2.39:1">2.39:1</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">프레임레이트</label>
              <select {...register('frameRate')} className={selectCls}>
                <option value="24fps">24fps</option>
                <option value="30fps">30fps</option>
                <option value="60fps">60fps</option>
              </select>
            </div>
          </div>
        </div>

        {/* Production Info */}
        <div className="p-5 rounded-xl border border-border bg-card space-y-4">
          <h2 className="text-sm font-medium text-white">제작 정보</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">방송사</label>
              <input {...register('broadcaster')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">러닝타임</label>
              <input {...register('runtime')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">총 화수</label>
              <input type="number" {...register('totalEpisodes')} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">납품 마감일</label>
            <input type="date" {...register('submissionDeadline')} className={inputCls} />
          </div>
        </div>

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? '저장 중...' : '변경사항 저장'}
        </button>
      </form>

      {/* Danger zone */}
      <div className="mt-8 p-5 rounded-xl border border-red-500/20 bg-red-500/5">
        <h2 className="text-sm font-medium text-red-400 mb-2">위험 구역</h2>
        <p className="text-xs text-muted-foreground mb-4">프로젝트를 삭제하면 모든 에피소드, 씬, 캐릭터 데이터가 영구 삭제됩니다.</p>
        <button
          onClick={() => {
            if (confirm(`"${project?.title}" 프로젝트를 영구 삭제할까요?`)) {
              deleteMutation.mutate()
            }
          }}
          disabled={deleteMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          {deleteMutation.isPending ? '삭제 중...' : '프로젝트 삭제'}
        </button>
      </div>
    </div>
  )
}
