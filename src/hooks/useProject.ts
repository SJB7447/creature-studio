'use client'

import { useEffect, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  subscribeProjects,
  subscribeProject,
} from '@/lib/firestore'
import { useAuthStore } from '@/store/authStore'
import { Project } from '@/types'

export function useProject(projectId?: string) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [realtimeProjects, setRealtimeProjects] = useState<Project[] | null>(null)
  const [realtimeProject, setRealtimeProject] = useState<Project | null | undefined>(undefined)
  const [subscriptionError, setSubscriptionError] = useState<Error | null>(null)

  // ─── 프로젝트 목록 조회 ────────────────────────────
  const projectsQuery = useQuery({
    queryKey: ['projects', user?.uid],
    queryFn: () => getProjects(user!.uid),
    enabled: !!user?.uid,
  })

  // ─── 단일 프로젝트 조회 ────────────────────────────
  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  })

  // ─── 실시간 구독: 프로젝트 목록 ───────────────────
  useEffect(() => {
    if (!user?.uid) return
    const unsub = subscribeProjects(
      user.uid,
      (projects) => {
        setRealtimeProjects(projects)
        qc.setQueryData(['projects', user.uid], projects)
      },
      (err) => setSubscriptionError(err)
    )
    return unsub
  }, [user?.uid, qc])

  // ─── 실시간 구독: 단일 프로젝트 ───────────────────
  useEffect(() => {
    if (!projectId) return
    const unsub = subscribeProject(
      projectId,
      (project) => {
        setRealtimeProject(project)
        qc.setQueryData(['project', projectId], project)
      },
      (err) => setSubscriptionError(err)
    )
    return unsub
  }, [projectId, qc])

  // ─── 뮤테이션: 생성 ────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => createProject(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', user?.uid] })
    },
  })

  // ─── 뮤테이션: 수정 ────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) => updateProject(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['project', id] })
      qc.invalidateQueries({ queryKey: ['projects', user?.uid] })
    },
  })

  // ─── 뮤테이션: 삭제 ────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', user?.uid] })
    },
  })

  return {
    // 프로젝트 목록
    projects: realtimeProjects ?? projectsQuery.data ?? [],
    projectsLoading: projectsQuery.isLoading && !realtimeProjects,
    projectsError: projectsQuery.error as Error | null,

    // 단일 프로젝트
    project: realtimeProject !== undefined ? realtimeProject : (projectQuery.data ?? null),
    projectLoading: projectQuery.isLoading && realtimeProject === undefined,
    projectError: projectQuery.error as Error | null,

    // 실시간 구독 에러
    subscriptionError,

    // 뮤테이션
    createProject: createMutation.mutateAsync,
    updateProject: updateMutation.mutateAsync,
    deleteProject: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
