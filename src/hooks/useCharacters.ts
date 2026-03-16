'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  subscribeCharacters,
} from '@/lib/firestore'
import { Character } from '@/types'

export function useCharacters(projectId: string) {
  const qc = useQueryClient()
  const [realtimeCharacters, setRealtimeCharacters] = useState<Character[] | null>(null)
  const [subscriptionError, setSubscriptionError] = useState<Error | null>(null)

  // ─── 캐릭터 목록 조회 ──────────────────────────────
  const charactersQuery = useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => getCharacters(projectId),
    enabled: !!projectId,
  })

  // ─── 실시간 구독 ──────────────────────────────────
  useEffect(() => {
    if (!projectId) return
    const unsub = subscribeCharacters(
      projectId,
      (characters) => {
        setRealtimeCharacters(characters)
        qc.setQueryData(['characters', projectId], characters)
      },
      (err) => setSubscriptionError(err)
    )
    return unsub
  }, [projectId, qc])

  // ─── 뮤테이션: 생성 ────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: Omit<Character, 'id' | 'createdAt'>) =>
      createCharacter(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['characters', projectId] })
    },
  })

  // ─── 뮤테이션: 수정 ────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Character> }) =>
      updateCharacter(projectId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['characters', projectId] })
    },
  })

  // ─── 뮤테이션: 삭제 ────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCharacter(projectId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['characters', projectId] })
    },
  })

  return {
    // 캐릭터 목록
    characters: realtimeCharacters ?? charactersQuery.data ?? [],
    charactersLoading: charactersQuery.isLoading && !realtimeCharacters,
    charactersError: charactersQuery.error as Error | null,

    // 실시간 구독 에러
    subscriptionError,

    // 뮤테이션
    createCharacter: createMutation.mutateAsync,
    updateCharacter: updateMutation.mutateAsync,
    deleteCharacter: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
