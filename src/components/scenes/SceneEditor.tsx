'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Scene, Project, Character, Episode } from '@/types'
import { SceneFormPanel } from './SceneFormPanel'
import { SceneAIPanel } from '../agent/SceneAIPanel'
import { updateScene, getEpisodes, getScenes, notifyProjectMembers } from '@/lib/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Film, Save, Loader2, PenLine, Sparkles } from 'lucide-react'

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
    <aside className="w-[260px] border-r overflow-y-auto shrink-0 hidden lg:block" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
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
  const [mobileTab, setMobileTab] = useState<'form' | 'ai'>('form')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // Sync assets when scene prop updates (e.g. after AI panel saves to Firebase)
  useEffect(() => {
    setCurrentScene(prev => ({ ...prev, assets: scene.assets }))
  }, [scene.assets])

  // Auto-save with 2s debounce
  const autoSave = useCallback((updated: Scene) => {
    setCurrentScene(updated)
    setSaveStatus('unsaved')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        const { assets: _assets, ...sceneWithoutAssets } = updated
        await updateScene(projectId, episodeId, sceneId, sceneWithoutAssets)
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
      const { assets: _assets, ...sceneWithoutAssets } = currentScene
      await updateScene(projectId, episodeId, sceneId, sceneWithoutAssets)
      queryClient.invalidateQueries({ queryKey: ['scene', projectId, episodeId, sceneId] })
      setSaveStatus('saved')
      toast.success('저장되었습니다.')
      if (user) {
        notifyProjectMembers({
          actorId: user.uid,
          actorName: user.displayName || user.email || '알 수 없음',
          actorPhoto: user.photoURL || undefined,
          actionType: 'scene_updated',
          projectId,
          projectTitle: project.title,
          targetTitle: currentScene.title,
        }).catch(() => {})
      }
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
      <div className="h-14 border-b flex items-center justify-between px-3 sm:px-5 shrink-0" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <Link href={`/projects/${projectId}`} className="hover:underline hidden sm:inline" style={{ color: 'var(--color-text-sub)' }}>{project.title}</Link>
          <span className="hidden sm:inline" style={{ color: 'var(--color-border)' }}>/</span>
          <span className="font-medium truncate" style={{ color: 'var(--color-text)' }}>S{currentScene.number}. {currentScene.title}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-xs hidden sm:inline" style={{ color: 'var(--color-text-sub)' }}>
            {saveStatus === 'saving' && <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />저장 중...</span>}
            {saveStatus === 'saved' && '저장됨'}
            {saveStatus === 'unsaved' && '변경사항 있음'}
          </span>

          {/* Scene status dropdown */}
          <select
            value={currentScene.status}
            onChange={e => autoSave({ ...currentScene, status: e.target.value as any })}
            className="px-2 sm:px-2.5 py-1.5 rounded-lg border text-xs font-medium"
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
            <Save className="w-3.5 h-3.5" /><span className="hidden sm:inline">저장</span>
          </button>
        </div>
      </div>

      {/* Mobile tab switcher */}
      <div className="flex border-b lg:hidden shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={() => setMobileTab('form')}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors', mobileTab === 'form' ? 'border-b-2' : '')}
          style={{
            borderColor: mobileTab === 'form' ? 'var(--color-primary-dark)' : 'transparent',
            color: mobileTab === 'form' ? 'var(--color-primary-dark)' : 'var(--color-text-sub)',
          }}
        >
          <PenLine className="w-4 h-4" />씬 편집
        </button>
        <button
          onClick={() => setMobileTab('ai')}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors', mobileTab === 'ai' ? 'border-b-2' : '')}
          style={{
            borderColor: mobileTab === 'ai' ? 'var(--color-primary-dark)' : 'transparent',
            color: mobileTab === 'ai' ? 'var(--color-primary-dark)' : 'var(--color-text-sub)',
          }}
        >
          <Sparkles className="w-4 h-4" />AI 패널
        </button>
      </div>

      {/* Body - Desktop: 3 panels side by side, Mobile: tab-based */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - hidden on mobile */}
        <div className="hidden lg:block">
          <SceneTreeSidebar projectId={projectId} episodeId={episodeId} currentSceneId={sceneId} />
        </div>

        {/* Left form - Desktop: 45%, Mobile: full width or hidden */}
        <div className={cn(
          'border-r overflow-y-auto',
          'lg:w-[45%]',
          mobileTab === 'form' ? 'flex-1 lg:flex-none' : 'hidden lg:block'
        )} style={{ borderColor: 'var(--color-border)' }}>
          <SceneFormPanel
            scene={currentScene}
            characters={characters}
            onUpdate={autoSave}
          />
        </div>

        {/* Right AI panel - Desktop: flex-1, Mobile: full width or hidden */}
        <div className={cn(
          'overflow-y-auto',
          'lg:flex-1',
          mobileTab === 'ai' ? 'flex-1 lg:flex-none' : 'hidden lg:block'
        )} style={{ background: 'var(--color-bg)' }}>
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
