'use client'

import Link from 'next/link'
import { Project } from '@/types'
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS, formatTimestamp } from '@/lib/utils'
import { MoreHorizontal, Trash2, Users } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteProject } from '@/lib/firestore'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  development: { bg: '#F3F4F6', text: '#6B7280' },
  preproduction: { bg: '#DBEAFE', text: '#2563EB' },
  production: { bg: '#D1FAE5', text: '#059669' },
  postproduction: { bg: '#EDE9FE', text: '#7C3AED' },
  completed: { bg: '#F3E8FF', text: '#9333EA' },
}

const TYPE_EMOJI: Record<string, string> = {
  animation: '🎬',
  film: '🎥',
  short: '🎞️',
  documentary: '📹',
  other: '📁',
}

export function ProjectCard({ project }: { project: Project }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(project.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', user?.uid] })
      toast.success(`"${project.title}" 프로젝트가 삭제되었습니다.`)
    },
    onError: () => toast.error('삭제 실패'),
  })

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (confirm(`"${project.title}" 프로젝트를 삭제할까요?`)) deleteMutation.mutate()
    setMenuOpen(false)
  }

  const sc = STATUS_COLORS[project.status] || STATUS_COLORS.development
  const isShared = project.ownerId !== user?.uid
  const hasCollaborators = (project.collaborators || []).length > 0

  return (
    <Link href={`/projects/${project.id}`}>
      <div
        className="group relative p-5 rounded-2xl border hover:shadow-lg transition-all cursor-pointer"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {/* Thumbnail / Emoji */}
        <div className="w-full h-28 rounded-xl mb-4 flex items-center justify-center text-4xl" style={{ background: 'var(--color-surface-2)' }}>
          {project.thumbnail ? (
            <img src={project.thumbnail} alt="" className="w-full h-full object-cover rounded-xl" />
          ) : (
            TYPE_EMOJI[project.type] || '📁'
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base leading-tight mb-1" style={{ color: 'var(--color-text)' }}>{project.title}</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-sub)' }}>{project.titleEn}</p>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-sub)' }}>
            {PROJECT_TYPE_LABELS[project.type]}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: sc.bg, color: sc.text }}>
            {PROJECT_STATUS_LABELS[project.status]}
          </span>
          {isShared && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={{ background: '#DBEAFE', color: '#2563EB' }}>
              <Users className="w-3 h-3" />공유됨
            </span>
          )}
          {!isShared && hasCollaborators && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={{ background: '#D1FAE5', color: '#059669' }}>
              <Users className="w-3 h-3" />{project.collaborators.length}명
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {project.genre.slice(0, 3).map(g => (
              <span key={g} className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-sub)' }}>{g}</span>
            ))}
          </div>
          <span className="text-[11px]" style={{ color: 'var(--color-text-sub)' }}>{formatTimestamp(project.updatedAt)}</span>
        </div>

        {/* Menu (소유자만) */}
        {!isShared && (
          <div className="absolute top-3 right-3" ref={menuRef}>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--color-surface-2)] transition-all"
            >
              <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 border rounded-xl shadow-xl z-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />프로젝트 삭제
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
