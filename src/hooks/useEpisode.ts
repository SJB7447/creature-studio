'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getEpisodes,
  getEpisode,
  createEpisode,
  updateEpisode,
  deleteEpisode,
  subscribeEpisodes,
} from '@/lib/firestore'
import { Episode } from '@/types'

export function useEpisode(projectId: string, episodeId?: string) {
  const qc = useQueryClient()
  const [realtimeEpisodes, setRealtimeEpisodes] = useState<Episode[] | null>(null)
  const [subscriptionError, setSubscriptionError] = useState<Error | null>(null)

  // ─── 에피소드 목록 조회 ────────────────────────────
  const episodesQuery = useQuery({
    queryKey: ['episodes', projectId],
    queryFn: () => getEpisodes(projectId),
    enabled: !!projectId,
  })

  // ─── 단일 에피소드 조회 ────────────────────────────
  const episodeQuery = useQuery({
    queryKey: ['episode', projectId, episodeId],
    queryFn: () => getEpisode(projectId, episodeId!),
    enabled: !!projectId && !!episodeId,
  })

  // ─── 실시간 구독 ──────────────────────────────────
  useEffect(() => {
    if (!projectId) return
    const unsub = subscribeEpisodes(
      projectId,
      (episodes) => {
        setRealtimeEpisodes(episodes)
        qc.setQueryData(['episodes', projectId], episodes)
      },
      (err) => setSubscriptionError(err)
    )
    return unsub
  }, [projectId, qc])

  // ─── 뮤테이션: 생성 ────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: Omit<Episode, 'id' | 'createdAt' | 'updatedAt'>) =>
      createEpisode(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['episodes', projectId] })
    },
  })

  // ─── 뮤테이션: 수정 ────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Episode> }) =>
      updateEpisode(projectId, id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['episodes', projectId] })
      qc.invalidateQueries({ queryKey: ['episode', projectId, id] })
    },
  })

  // ─── 뮤테이션: 삭제 ────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEpisode(projectId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['episodes', projectId] })
    },
  })

  return {
    // 에피소드 목록
    episodes: realtimeEpisodes ?? episodesQuery.data ?? [],
    episodesLoading: episodesQuery.isLoading && !realtimeEpisodes,
    episodesError: episodesQuery.error as Error | null,

    // 단일 에피소드
    episode: episodeQuery.data ?? null,
    episodeLoading: episodeQuery.isLoading,
    episodeError: episodeQuery.error as Error | null,

    // 실시간 구독 에러
    subscriptionError,

    // 뮤테이션
    createEpisode: createMutation.mutateAsync,
    updateEpisode: updateMutation.mutateAsync,
    deleteEpisode: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
