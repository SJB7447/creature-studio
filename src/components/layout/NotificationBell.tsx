'use client'

import { useEffect, useState } from 'react'
import { Bell, Check, X, CheckCheck } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import {
  getInvitationsForUser,
  acceptInvitation,
  declineInvitation,
  subscribeNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/firestore'
import { AppNotification, Invitation } from '@/types'
import { toast } from 'sonner'

const ACTION_LABELS: Record<string, string> = {
  episode_created: '에피소드를 생성했습니다',
  scene_created: '씬을 생성했습니다',
  scene_updated: '씬을 수정했습니다',
  agent_completed: 'AI 에이전트를 완료했습니다',
  asset_confirmed: '에셋을 확정했습니다',
  collaborator_added: '팀원을 추가했습니다',
  project_updated: '프로젝트를 수정했습니다',
}

export function NotificationBell() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'activity' | 'invitations'>('activity')
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const bellRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Real-time activity notifications
  useEffect(() => {
    if (!user?.uid) return
    const unsub = subscribeNotifications(user.uid, setNotifications)
    return () => unsub()
  }, [user?.uid])

  // Invitations polling
  const { data: invitations = [] } = useQuery({
    queryKey: ['my-invitations', user?.email],
    queryFn: () => getInvitationsForUser(user!.email!),
    enabled: !!user?.email,
    refetchInterval: 30000,
  })

  // Click-outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const acceptMutation = useMutation({
    mutationFn: (invId: string) => acceptInvitation(invId, user!.uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('초대를 수락했습니다!')
    },
    onError: (e: any) => toast.error('수락 실패: ' + e.message),
  })

  const declineMutation = useMutation({
    mutationFn: (invId: string) => declineInvitation(invId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] })
      toast.success('초대를 거절했습니다.')
    },
  })

  const unreadActivity = notifications.filter(n => !n.read).length
  const totalBadge = unreadActivity + invitations.length

  function handleMarkAllRead() {
    if (!user?.uid || unreadActivity === 0) return
    markAllNotificationsRead(user.uid)
  }

  function handleNotifClick(notif: AppNotification) {
    if (!notif.read && user?.uid) {
      markNotificationRead(user.uid, notif.id)
    }
  }

  function formatTime(createdAt: any): string {
    const date = createdAt?.toDate?.() as Date | undefined
    if (!date) return ''
    const diff = Date.now() - date.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '방금 전'
    if (mins < 60) return `${mins}분 전`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}시간 전`
    return `${Math.floor(hours / 24)}일 전`
  }

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors"
      >
        <Bell className="w-5 h-5" style={{ color: 'var(--color-text-sub)' }} />
        {totalBadge > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#EF4444' }}>
            {totalBadge > 9 ? '9+' : totalBadge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 rounded-xl shadow-xl border z-50 flex flex-col" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', maxHeight: '480px' }}>
          {/* Header */}
          <div className="p-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex gap-1">
              <button
                onClick={() => setTab('activity')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${tab === 'activity' ? 'text-white' : 'hover:bg-[var(--color-surface-2)]'}`}
                style={tab === 'activity' ? { background: 'var(--color-primary-dark)' } : { color: 'var(--color-text-sub)' }}
              >
                활동 {unreadActivity > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1">{unreadActivity}</span>}
              </button>
              <button
                onClick={() => setTab('invitations')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${tab === 'invitations' ? 'text-white' : 'hover:bg-[var(--color-surface-2)]'}`}
                style={tab === 'invitations' ? { background: 'var(--color-primary-dark)' } : { color: 'var(--color-text-sub)' }}
              >
                초대 {invitations.length > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1">{invitations.length}</span>}
              </button>
            </div>
            {tab === 'activity' && unreadActivity > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-text-sub)' }}
              >
                <CheckCheck className="w-3 h-3" />
                모두 읽음
              </button>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1">
            {tab === 'activity' && (
              <>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-text-sub)', opacity: 0.4 }} />
                    <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>새로운 알림이 없습니다</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {notifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className="p-3 rounded-lg cursor-pointer transition-colors hover:opacity-80"
                        style={{ background: notif.read ? 'transparent' : 'var(--color-surface-2)', border: notif.read ? 'none' : '1px solid var(--color-border)' }}
                      >
                        <div className="flex items-start gap-2.5">
                          {notif.actorPhoto ? (
                            <img src={notif.actorPhoto} alt="" className="w-7 h-7 rounded-full shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5" style={{ background: 'var(--color-primary-dark)' }}>
                              {notif.actorName?.[0] || '?'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
                              <span className="font-medium">{notif.actorName}</span>님이{' '}
                              <span className="font-medium truncate" style={{ color: 'var(--color-primary-dark)' }}>{notif.targetTitle}</span>
                              {' '}{ACTION_LABELS[notif.actionType] || '업데이트했습니다'}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-sub)' }}>
                              {notif.projectTitle} · {formatTime(notif.createdAt)}
                            </p>
                          </div>
                          {!notif.read && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === 'invitations' && (
              <>
                {invitations.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-text-sub)', opacity: 0.4 }} />
                    <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>새로운 초대가 없습니다</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {invitations.map((inv: Invitation) => (
                      <div key={inv.id} className="p-3 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
                        <div className="flex items-start gap-3">
                          {inv.fromUserPhoto ? (
                            <img src={inv.fromUserPhoto} alt="" className="w-8 h-8 rounded-full shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5" style={{ background: 'var(--color-primary-dark)' }}>
                              {inv.fromUserName?.[0] || '?'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                              <span className="font-medium">{inv.fromUserName}</span>님이
                            </p>
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-primary-dark)' }}>
                              {inv.projectTitle}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-sub)' }}>
                              프로젝트에 초대했습니다 · {inv.role === 'editor' ? '편집자' : '뷰어'}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => acceptMutation.mutate(inv.id)}
                                disabled={acceptMutation.isPending}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-medium hover:opacity-90 disabled:opacity-60"
                                style={{ background: 'var(--color-primary-dark)' }}
                              >
                                <Check className="w-3 h-3" />수락
                              </button>
                              <button
                                onClick={() => declineMutation.mutate(inv.id)}
                                disabled={declineMutation.isPending}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:opacity-70"
                                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}
                              >
                                <X className="w-3 h-3" />거절
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
