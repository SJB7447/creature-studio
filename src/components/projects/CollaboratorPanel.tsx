'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  createInvitation,
  getProjectInvitations,
  cancelInvitation,
  removeCollaborator,
  getUserProfiles,
} from '@/lib/firestore'
import { Project, Invitation, UserProfile, CollaboratorRole } from '@/types'
import { UserPlus, X, Mail, Crown, Eye, Edit3, Loader2, Users, Clock, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

const ROLE_LABELS: Record<CollaboratorRole, string> = {
  editor: '편집자',
  viewer: '뷰어',
}

interface Props {
  project: Project
  projectId: string
}

export function CollaboratorPanel({ project, projectId }: Props) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<CollaboratorRole>('editor')
  const isOwner = user?.uid === project.ownerId

  // 현재 협업자 프로필 조회
  const { data: collaboratorProfiles = [] } = useQuery({
    queryKey: ['collaborator-profiles', projectId, project.collaborators],
    queryFn: () => getUserProfiles(project.collaborators || []),
    enabled: (project.collaborators || []).length > 0,
  })

  // 초대 목록
  const { data: invitations = [] } = useQuery({
    queryKey: ['project-invitations', projectId],
    queryFn: () => getProjectInvitations(projectId),
    enabled: isOwner,
  })

  const pendingInvitations = invitations.filter(i => i.status === 'pending')

  // 초대 보내기
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!email.trim()) throw new Error('이메일을 입력하세요.')
      if (email.toLowerCase() === user?.email?.toLowerCase()) throw new Error('자기 자신은 초대할 수 없습니다.')
      return createInvitation({
        projectId,
        projectTitle: project.title,
        fromUserId: user!.uid,
        fromUserName: user!.displayName || '',
        fromUserPhoto: user!.photoURL || '',
        toEmail: email.trim(),
        role,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-invitations', projectId] })
      toast.success(`${email}에게 초대장을 보냈습니다.`)
      setEmail('')
    },
    onError: (e: any) => toast.error(e.message),
  })

  // 초대 취소
  const cancelMutation = useMutation({
    mutationFn: (invId: string) => cancelInvitation(invId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-invitations', projectId] })
      toast.success('초대가 취소되었습니다.')
    },
  })

  // 협업자 제거
  const removeMutation = useMutation({
    mutationFn: (uid: string) => removeCollaborator(projectId, uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['collaborator-profiles', projectId] })
      toast.success('협업자가 제거되었습니다.')
    },
  })

  const inputStyle = { background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }

  return (
    <div className="p-5 rounded-xl border space-y-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4" style={{ color: 'var(--color-primary-dark)' }} />
        <h2 className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>팀 멤버</h2>
      </div>

      {/* 소유자 */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--color-primary-dark)' }}>
              {user?.displayName?.[0] || 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
              {user?.uid === project.ownerId ? user?.displayName : '소유자'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--color-text-sub)' }}>
              {user?.uid === project.ownerId ? user?.email : ''}
            </p>
          </div>
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
            <Crown className="w-3 h-3" />소유자
          </span>
        </div>

        {/* 현재 협업자 목록 */}
        <AnimatePresence>
          {collaboratorProfiles.map(profile => (
            <motion.div
              key={profile.uid}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ background: 'var(--color-surface-2)' }}
            >
              {profile.photoURL ? (
                <img src={profile.photoURL} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#059669' }}>
                  {profile.displayName?.[0] || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{profile.displayName}</p>
                <p className="text-xs truncate" style={{ color: 'var(--color-text-sub)' }}>{profile.email}</p>
              </div>
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: '#D1FAE5', color: '#059669' }}>
                <Edit3 className="w-3 h-3" />편집자
              </span>
              {isOwner && (
                <button
                  onClick={() => {
                    if (confirm(`"${profile.displayName}"을(를) 프로젝트에서 제거할까요?`)) {
                      removeMutation.mutate(profile.uid)
                    }
                  }}
                  className="p-1.5 rounded-md hover:opacity-70 shrink-0"
                >
                  <X className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 대기 중 초대 */}
      {isOwner && pendingInvitations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-sub)' }}>대기 중인 초대</p>
          {pendingInvitations.map(inv => (
            <div key={inv.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#FEF3C7' }}>
                <Clock className="w-4 h-4" style={{ color: '#D97706' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: 'var(--color-text)' }}>{inv.toEmail}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>
                  {ROLE_LABELS[inv.role]} · 대기 중
                </p>
              </div>
              <button
                onClick={() => cancelMutation.mutate(inv.id)}
                disabled={cancelMutation.isPending}
                className="text-xs px-2 py-1 rounded-lg border hover:opacity-70 shrink-0"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}
              >
                취소
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 초대 폼 (소유자만) */}
      {isOwner && (
        <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-sub)' }}>새 멤버 초대</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-text-sub)' }} />
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="이메일 주소 입력"
                type="email"
                className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                style={inputStyle}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); inviteMutation.mutate() } }}
              />
            </div>
            <select
              value={role}
              onChange={e => setRole(e.target.value as CollaboratorRole)}
              className="px-2 py-2 rounded-lg border text-xs shrink-0"
              style={inputStyle}
            >
              <option value="editor">편집자</option>
              <option value="viewer">뷰어</option>
            </select>
          </div>
          <button
            onClick={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending || !email.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60 transition-colors hover:opacity-90"
            style={{ background: 'var(--color-primary-dark)' }}
          >
            {inviteMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {inviteMutation.isPending ? '초대 중...' : '초대 보내기'}
          </button>
        </div>
      )}
    </div>
  )
}
