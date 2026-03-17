'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getScene, getProject, getCharacters } from '@/lib/firestore'
import { useProjectStore } from '@/store/projectStore'
import { useEffect } from 'react'
import { SceneEditor } from '@/components/scenes/SceneEditor'

export default function ScenePage() {
  const { projectId, episodeId, sceneId } = useParams<{
    projectId: string
    episodeId: string
    sceneId: string
  }>()
  const { currentProject, setCurrentScene, setCharacters } = useProjectStore()

  const { data: scene, isLoading: sceneLoading } = useQuery({
    queryKey: ['scene', projectId, episodeId, sceneId],
    queryFn: () => getScene(projectId, episodeId, sceneId),
    enabled: !!sceneId,
  })

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId && !currentProject,
  })

  const { data: chars = [] } = useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => getCharacters(projectId),
    enabled: !!projectId,
  })

  useEffect(() => {
    if (scene) setCurrentScene(scene)
    if (chars.length) setCharacters(chars)
  }, [scene, chars, setCurrentScene, setCharacters])

  const activeProject = currentProject || project

  if (sceneLoading) {
    return (
      <div className="flex flex-col lg:flex-row h-full">
        <div className="flex-1 p-4 sm:p-6 space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl bg-card border border-border animate-pulse" />)}
        </div>
        <div className="flex-1 border-t lg:border-t-0 lg:border-l border-border p-4 sm:p-6">
          <div className="h-48 lg:h-full rounded-xl bg-card border border-border animate-pulse" />
        </div>
      </div>
    )
  }

  if (!scene || !activeProject) return (
    <div className="p-6 text-center text-muted-foreground">씬을 불러올 수 없습니다.</div>
  )

  return (
    <SceneEditor
      scene={scene}
      project={activeProject}
      characters={chars}
      projectId={projectId}
      episodeId={episodeId}
      sceneId={sceneId}
    />
  )
}
