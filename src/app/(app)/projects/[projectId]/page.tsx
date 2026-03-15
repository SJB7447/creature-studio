'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getProject, getEpisodes } from '@/lib/firestore'
import { useProjectStore } from '@/store/projectStore'
import { useEffect } from 'react'
import { EpisodeList } from '@/components/episodes/EpisodeList'
import { NewEpisodeButton } from '@/components/episodes/NewEpisodeButton'
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Film, Calendar, Tv } from 'lucide-react'

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { setCurrentProject, setCurrentEpisode } = useProjectStore()

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  })

  const { data: episodes = [], isLoading: episodesLoading } = useQuery({
    queryKey: ['episodes', projectId],
    queryFn: () => getEpisodes(projectId),
    enabled: !!projectId,
  })

  useEffect(() => {
    if (project) {
      setCurrentProject(project)
      setCurrentEpisode(null)
    }
  }, [project, setCurrentProject, setCurrentEpisode])

  if (projectLoading) {
    return (
      <div className="p-6">
        <div className="h-32 rounded-xl bg-card border border-border animate-pulse mb-6" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6 text-center text-muted-foreground">프로젝트를 찾을 수 없습니다.</div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Project Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl border border-border bg-card mb-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground">
                {PROJECT_TYPE_LABELS[project.type]}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                {PROJECT_STATUS_LABELS[project.status]}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">{project.title}</h1>
            <p className="text-muted-foreground text-sm">{project.titleEn}</p>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">방송사</p>
              <p className="text-sm text-white">{project.productionInfo.broadcaster || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">총 화수</p>
              <p className="text-sm text-white">{project.productionInfo.totalEpisodes}화</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">러닝타임</p>
              <p className="text-sm text-white">{project.productionInfo.runtime || '-'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">아트 스타일</p>
            <p className="text-sm text-white truncate">{project.artContext.style || '-'}</p>
          </div>
        </div>

        {/* Mood & Genre */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {project.genre.map(g => (
            <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{g}</span>
          ))}
          {project.artContext.moodKeywords.map(m => (
            <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground">{m}</span>
          ))}
        </div>
      </motion.div>

      {/* Episodes */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          에피소드
          <span className="ml-2 text-sm text-muted-foreground font-normal">({episodes.length}편)</span>
        </h2>
        <NewEpisodeButton projectId={projectId} />
      </div>

      <EpisodeList
        episodes={episodes}
        projectId={projectId}
        loading={episodesLoading}
      />
    </div>
  )
}
