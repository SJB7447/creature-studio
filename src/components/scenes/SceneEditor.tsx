'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Scene, Project, Character, Episode } from '@/types'
import { SceneFormPanel } from './SceneFormPanel'
import { SceneAIPanel } from '../agent/SceneAIPanel'
import { updateScene, getEpisodes, getScenes } from '@/lib/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Film, Save, Loader2 } from 'lucide-react'

interface Props {
  scene: Scene
  project: Project
  characters: Character[]
  projectId: string
  episodeId: string
  sceneId: string
}

// ─── Scene Tree Sidebar ─────────────────────────────────
function SceneTreeSidebar({ projectId, episodeId, currentSceneId }: { projectId: string; episodeId: string; currentSceneId: string }) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [scenesMap, setScenesMap] = useState<Record<string, Scene[]>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [episodeId]: true })

  useEffect(() => {
    getEpisodes(projectId).then(setEpisodes)
  }, [projectId])

  useEffect(() => {
    episodes.forEach(ep => {
      if (!scenesMap[ep.id]) {
        getScenes(projectId, ep.id).then(scenes => {
          setScenesMap(prev => ({ ...prev, [ep.id]: scenes }))
        })
      }
    })
  }, [episodes, projectId, scenesMap])

  return (
    <aside className="w-[260px] border-r overflow-y-auto shrink-0" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider px-2 mb-2" style={{ color: 'var(--color-text-sub)' }}>에피소드 / 씬</p>
        {episodes.map(ep => (
          <div key={ep.id} className="mb-1">
            <button
              onClick={() => setExpanded(prev => ({ ...prev, [ep.id]: !prev[ep.id] }))}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-[var(--color-surface-2)] transition-colors"
              style={{ color: 'var(--color-text)' }}
            >
              {expanded[ep.id] ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
              <Film className="w-3 h-3 shrink-0" style={{ color: 'var(--color-primary-dark)' }} />
              <span className="truncate">EP.{ep.number} {ep.title}</span>
            </button>
            {expanded[ep.id] && scenesMap[ep.id] && (
              <div className="ml-4 pl-2 border-l space-y-0.5 mt-0.5" style={{ borderColor: 'var(--color-border)' }}>
                {scenesMap[ep.id].map(sc => (
                  <Link
                    key={sc.id}
                    href={`/projects/${projectId}/episodes/${ep.id}/scenes/${sc.id}`}
                    className={cn(
                      'block px-2 py-1.5 rounded-lg text-xs truncate transition-colors',
                      sc.id === currentSceneId ? 'font-medium' : 'hover:bg-[var(--color-surface-2)]'
                    )}
                    style={{
                      background: sc.id === currentSceneId ? 'var(--color-surface-2)' : undefined,
                      color: sc.id === currentSceneId ? 'var(--color-primary-dark)' : 'var(--color-text-sub)',
                    }}
                  >
                    S{sc.number}. {sc.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  )
}

// ─── Main Scene Editor ──────────────────────────────────
export function SceneEditor({ scene, project, characters, projectId, episodeId, sceneId }: Props) {
  const [currentScene, setCurrentScene] = useState(scene)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queryClient = useQueryClient()

  // Auto-save with 2s debounce
  const autoSave = useCallback((updated: Scene) => {
    setCurrentScene(updated)
    setSaveStatus('unsaved')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await updateScene(projectId, episodeId, sceneId, updated)
        queryClient.invalidateQueries({ queryKey: ['scene', projectId, episodeId, sceneId] })
        setSaveStatus('saved')
      } catch (e: any) {
        toast.error('자동 저장 실패: ' + e.message)
        setSaveStatus('unsaved')
      }
    }, 2000)
  }, [projectId, episodeId, sceneId, queryClient])

  // Manual save
  async function manualSave() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaving(true)
    setSaveStatus('saving')
    try {
      await updateScene(projectId, episodeId, sceneId, currentScene)
      queryClient.invalidateQueries({ queryKey: ['scene', projectId, episodeId, sceneId] })
      setSaveStatus('saved')
      toast.success('저장되었습니다.')
    } catch (e: any) {
      toast.error('저장 실패: ' + e.message)
      setSaveStatus('unsaved')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header bar (56px) */}
      <div className="h-14 border-b flex items-center justify-between px-5 shrink-0" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/projects/${projectId}`} className="hover:underline" style={{ color: 'var(--color-text-sub)' }}>{project.title}</Link>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <span className="font-medium" style={{ color: 'var(--color-text)' }}>S{currentScene.number}. {currentScene.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--color-text-sub)' }}>
            {saveStatus === 'saving' && <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />저장 중...</span>}
            {saveStatus === 'saved' && '저장됨'}
            {saveStatus === 'unsaved' && '변경사항 있음'}
          </span>

          {/* Scene status dropdown */}
          <select
            value={currentScene.status}
            onChange={e => autoSave({ ...currentScene, status: e.target.value as any })}
            className="px-2.5 py-1.5 rounded-lg border text-xs font-medium"
            style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <option value="draft">초안</option>
            <option value="inprogress">작업 중</option>
            <option value="review">검토 중</option>
            <option value="final">최종</option>
          </select>

          <button
            onClick={manualSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ background: 'var(--color-primary-dark)' }}
          >
            <Save className="w-3.5 h-3.5" />저장
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <SceneTreeSidebar projectId={projectId} episodeId={episodeId} currentSceneId={sceneId} />

        {/* Left form (45%) */}
        <div className="w-[45%] border-r overflow-y-auto" style={{ borderColor: 'var(--color-border)' }}>
          <SceneFormPanel
            scene={currentScene}
            characters={characters}
            onUpdate={autoSave}
          />
        </div>

        {/* Right AI panel (55%) */}
        <div className="flex-1 overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
          <SceneAIPanel
            scene={currentScene}
            project={project}
            characters={characters}
            projectId={projectId}
            episodeId={episodeId}
            sceneId={sceneId}
          />
        </div>
      </div>
    </div>
  )
}
