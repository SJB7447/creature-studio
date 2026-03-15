'use client'

import { useParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getScene, getProject, getCharacters } from '@/lib/firestore'
import { useProjectStore } from '@/store/projectStore'
import { useEffect, useState } from 'react'
import { SceneInfoPanel } from '@/components/scenes/SceneInfoPanel'
import { AgentPanel } from '@/components/agent/AgentPanel'
import { AssetTabs } from '@/components/scenes/AssetTabs'
import { motion } from 'framer-motion'
import { Clapperboard, Bot, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'info' | 'agent' | 'assets'

export default function ScenePage() {
  const { projectId, episodeId, sceneId } = useParams<{
    projectId: string
    episodeId: string
    sceneId: string
  }>()
  const { currentProject, setCurrentScene, characters, setCharacters } = useProjectStore()
  const [activeTab, setActiveTab] = useState<Tab>('info')

  const { data: scene, isLoading } = useQuery({
    queryKey: ['scene', projectId, episodeId, sceneId],
    queryFn: () => getScene(projectId, episodeId, sceneId),
    enabled: !!sceneId,
  })

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId && !currentProject,
  })

  const activeProject = currentProject || project

  const { data: chars = [] } = useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => getCharacters(projectId),
    enabled: !!projectId,
  })

  useEffect(() => {
    if (scene) setCurrentScene(scene)
    if (chars.length) setCharacters(chars)
  }, [scene, chars, setCurrentScene, setCharacters])

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-20 rounded-xl bg-card border border-border animate-pulse mb-4" />
        <div className="h-96 rounded-xl bg-card border border-border animate-pulse" />
      </div>
    )
  }

  if (!scene) {
    return <div className="p-6 text-center text-muted-foreground">씬을 찾을 수 없습니다.</div>
  }

  const tabs = [
    { id: 'info' as Tab, label: '씬 정보', icon: Clapperboard },
    { id: 'agent' as Tab, label: 'AI 에이전트', icon: Bot },
    { id: 'assets' as Tab, label: '생성 에셋', icon: FileText },
  ]

  const hasAssets = !!(scene.assets?.directorScript || scene.assets?.imagePrompt || scene.assets?.videoPrompt)

  return (
    <div className="flex flex-col h-full">
      {/* Scene header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <span className="text-sm font-bold text-cyan-400">S{scene.number}</span>
          </div>
          <div>
            <h1 className="font-semibold text-white">{scene.title}</h1>
            <p className="text-xs text-muted-foreground">
              {scene.location} · {scene.timeStart}~{scene.timeEnd}
            </p>
          </div>
          {scene.isAITransformScene && (
            <span className="ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
              ✦ AI 변환 씬
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors',
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-muted-foreground hover:text-white hover:bg-accent'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.id === 'assets' && hasAssets && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'info' && (
            <SceneInfoPanel scene={scene} projectId={projectId} episodeId={episodeId} />
          )}
          {activeTab === 'agent' && activeProject && (
            <AgentPanel
              scene={scene}
              project={activeProject}
              characters={chars}
              projectId={projectId}
              episodeId={episodeId}
              sceneId={sceneId}
              onAssetsSaved={() => setActiveTab('assets')}
            />
          )}
          {activeTab === 'assets' && (
            <AssetTabs scene={scene} />
          )}
        </motion.div>
      </div>
    </div>
  )
}
