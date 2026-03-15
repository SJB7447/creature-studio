'use client'

import Link from 'next/link'
import { Project } from '@/types'
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS, cn } from '@/lib/utils'
import { Film, MoreHorizontal, Trash2, Settings } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteProject } from '@/lib/firestore'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'

const STATUS_COLORS: Record<string, string> = {
  development: 'bg-yellow-500/20 text-yellow-400',
  preproduction: 'bg-blue-500/20 text-blue-400',
  production: 'bg-green-500/20 text-green-400',
  postproduction: 'bg-purple-500/20 text-purple-400',
  completed: 'bg-gray-500/20 text-gray-400',
}

export function ProjectCard({ project }: { project: Project }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

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
    if (confirm(`"${project.title}" 프로젝트를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) {
      deleteMutation.mutate()
    }
    setMenuOpen(false)
  }

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="group relative p-5 rounded-xl border border-border bg-card hover:border-purple-500/50 hover:bg-accent/30 transition-all cursor-pointer">
        {/* Type badge & menu */}
        <div className="flex items-start justify-between mb-4">
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground">
            {PROJECT_TYPE_LABELS[project.type] || project.type}
          </span>
          <div className="relative">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setMenuOpen(!menuOpen)
              }}
              className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
            >
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-lg shadow-xl z-10">
                <div className="p-1">
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    프로젝트 삭제
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="mb-3">
          <h3 className="font-semibold text-white text-base leading-tight">{project.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{project.titleEn}</p>
        </div>

        {/* Genre */}
        <div className="flex flex-wrap gap-1 mb-4">
          {project.genre.slice(0, 3).map(g => (
            <span key={g} className="text-xs px-1.5 py-0.5 rounded bg-accent text-muted-foreground">{g}</span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[project.status])}>
            {PROJECT_STATUS_LABELS[project.status]}
          </span>
          <span className="text-xs text-muted-foreground">
            {project.productionInfo.broadcaster} · {project.productionInfo.totalEpisodes}화
          </span>
        </div>
      </div>
    </Link>
  )
}
