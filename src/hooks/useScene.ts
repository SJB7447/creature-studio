'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getScenes,
  getScene,
  createScene,
  updateScene,
  deleteScene,
  updateSceneAssets,
  subscribeScenes,
  subscribeScene,
} from '@/lib/firestore'
import { Scene, SceneAssets } from '@/types'

export function useScene(projectId: string, episodeId: string, sceneId?: string) {
  const qc = useQueryClient()
  const [realtimeScenes, setRealtimeScenes] = useState<Scene[] | null>(null)
  const [realtimeScene, setRealtimeScene] = useState<Scene | null | undefined>(undefined)
  const [subscriptionError, setSubscriptionError] = useState<Error | null>(null)

  // ─── 씬 목록 조회 ─────────────────────────────────
  const scenesQuery = useQuery({
    queryKey: ['scenes', projectId, episodeId],
    queryFn: () => getScenes(projectId, episodeId),
    enabled: !!projectId && !!episodeId,
  })

  // ─── 단일 씬 조회 ─────────────────────────────────
  const sceneQuery = useQuery({
    queryKey: ['scene', projectId, episodeId, sceneId],
    queryFn: () => getScene(projectId, episodeId, sceneId!),
    enabled: !!projectId && !!episodeId && !!sceneId,
  })

  // ─── 실시간 구독: 씬 목록 ─────────────────────────
  useEffect(() => {
    if (!projectId || !episodeId) return
    const unsub = subscribeScenes(
      projectId,
      episodeId,
      (scenes) => {
        setRealtimeScenes(scenes)
        qc.setQueryData(['scenes', projectId, episodeId], scenes)
      },
      (err) => setSubscriptionError(err)
    )
    return unsub
  }, [projectId, episodeId, qc])

  // ─── 실시간 구독: 단일 씬 ──────────────────────────
  useEffect(() => {
    if (!projectId || !episodeId || !sceneId) return
    const unsub = subscribeScene(
      projectId,
      episodeId,
      sceneId,
      (scene) => {
        setRealtimeScene(scene)
        qc.setQueryData(['scene', projectId, episodeId, sceneId], scene)
      },
      (err) => setSubscriptionError(err)
    )
    return unsub
  }, [projectId, episodeId, sceneId, qc])

  // ─── 뮤테이션: 생성 ────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) =>
      createScene(projectId, episodeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scenes', projectId, episodeId] })
    },
  })

  // ─── 뮤테이션: 수정 ────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Scene> }) =>
      updateScene(projectId, episodeId, id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['scenes', projectId, episodeId] })
      qc.invalidateQueries({ queryKey: ['scene', projectId, episodeId, id] })
    },
  })

  // ─── 뮤테이션: 삭제 ────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteScene(projectId, episodeId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scenes', projectId, episodeId] })
    },
  })

  // ─── 뮤테이션: assets 업데이트 (AI 생성 결과 저장) ──
  const updateAssetsMutation = useMutation({
    mutationFn: ({ id, assets }: { id: string; assets: Partial<SceneAssets> }) =>
      updateSceneAssets(projectId, episodeId, id, assets),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['scenes', projectId, episodeId] })
      qc.invalidateQueries({ queryKey: ['scene', projectId, episodeId, id] })
    },
  })

  return {
    // 씬 목록
    scenes: realtimeScenes ?? scenesQuery.data ?? [],
    scenesLoading: scenesQuery.isLoading && !realtimeScenes,
    scenesError: scenesQuery.error as Error | null,

    // 단일 씬
    scene: realtimeScene !== undefined ? realtimeScene : (sceneQuery.data ?? null),
    sceneLoading: sceneQuery.isLoading && realtimeScene === undefined,
    sceneError: sceneQuery.error as Error | null,

    // 실시간 구독 에러
    subscriptionError,

    // 뮤테이션
    createScene: createMutation.mutateAsync,
    updateScene: updateMutation.mutateAsync,
    deleteScene: deleteMutation.mutateAsync,
    updateSceneAssets: updateAssetsMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUpdatingAssets: updateAssetsMutation.isPending,
  }
}
