'use client'

import { useParams } from 'next/navigation'
import { useProject } from '@/hooks/useProject'
import { useEpisode } from '@/hooks/useEpisode'
import { useProjectStore } from '@/store/projectStore'
import { useEffect } from 'react'
import { EpisodeList } from '@/components/episodes/EpisodeList'
import { NewEpisodeButton } from '@/components/episodes/NewEpisodeButton'
import { EpisodeSyncPanel } from '@/components/episodes/EpisodeSyncPanel'
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Film, Calendar, Tv, RefreshCw } from 'lucide-react'
import { useState } from 'react'

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { setCurrentProject, setCurrentEpisode } = useProjectStore()

  const { project, projectLoading } = useProject(projectId)
  const { episodes, episodesLoading } = useEpisode(projectId)
  const [syncOpen, setSyncOpen] = useState(false)

  useEffect(() => {
    if (project) {
      setCurrentProject(project)
      setCurrentEpisode(null)
    }
  }, [project, setCurrentProject, setCurrentEpisode])

  if (projectLoading) {
    return (
      <div className="p-6">
        <div className="h-32 rounded-xl animate-pulse mb-6" style={{ background: 'var(--color-surface-2)' }} />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-2)' }} />)}
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6 text-center" style={{ color: 'var(--color-text-sub)' }}>프로젝트를 찾을 수 없습니다.</div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Project Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl border mb-6"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-sub)' }}>
                {PROJECT_TYPE_LABELS[project.type]}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                {PROJECT_STATUS_LABELS[project.status]}
              </span>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{project.title}</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>{project.titleEn}</p>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>방송사</p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{project.productionInfo.broadcaster || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>총 화수</p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{project.productionInfo.totalEpisodes}화</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>러닝타임</p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{project.productionInfo.runtime || '-'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>아트 스타일</p>
            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{project.artContext.style || '-'}</p>
          </div>
        </div>

        {/* Mood & Genre */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {project.genre.map(g => (
            <span key={g} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#DBEAFE', color: '#2563EB' }}>{g}</span>
          ))}
          {project.artContext.moodKeywords.map(m => (
            <span key={m} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-sub)' }}>{m}</span>
          ))}
        </div>
      </motion.div>

      {/* Episodes */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          에피소드
          <span className="ml-2 text-sm font-normal" style={{ color: 'var(--color-text-sub)' }}>({episodes.length}편)</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSyncOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)', background: 'var(--color-surface)' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            기획안으로 업데이트
          </button>
          <NewEpisodeButton projectId={projectId} />
        </div>
      </div>

      <EpisodeList
        episodes={episodes}
        projectId={projectId}
        loading={episodesLoading}
      />

      <EpisodeSyncPanel
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        projectId={projectId}
        existingEpisodes={episodes}
        projectRuntime={project.productionInfo.runtime}
      />
    </div>
  )
}
