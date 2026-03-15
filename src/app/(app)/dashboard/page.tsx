'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getProjects } from '@/lib/firestore'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { motion } from 'framer-motion'
import { FolderOpen, Film, Zap, Clock, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ProjectStatus } from '@/types'

type FilterStatus = 'all' | ProjectStatus

const STATUS_FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'development', label: '개발 중' },
  { value: 'preproduction', label: '프리프로덕션' },
  { value: 'production', label: '제작 중' },
  { value: 'postproduction', label: '후반 작업' },
  { value: 'completed', label: '완성' },
]

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', user?.uid],
    queryFn: () => getProjects(user!.uid),
    enabled: !!user,
  })

  const filtered = projects.filter(p => {
    const matchStatus = filter === 'all' || p.status === filter
    const matchSearch = !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.titleEn.toLowerCase().includes(search.toLowerCase()) ||
      p.genre.some(g => g.includes(search))
    return matchStatus && matchSearch
  })

  const stats = [
    {
      label: '전체 프로젝트',
      value: projects.length,
      icon: FolderOpen,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      label: '제작 중',
      value: projects.filter(p => p.status === 'production').length,
      icon: Film,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: '프리프로덕션',
      value: projects.filter(p => p.status === 'preproduction').length,
      icon: Zap,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
    {
      label: '이번 주 업데이트',
      value: projects.filter(p => {
        const d = (p.updatedAt as any).toDate ? (p.updatedAt as any).toDate() : new Date()
        return Date.now() - d.getTime() < 1000 * 60 * 60 * 24 * 7
      }).length,
      icon: Clock,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          안녕하세요, {user?.displayName?.split(' ')[0]}님 👋
        </h1>
        <p className="text-muted-foreground mt-1">오늘도 좋은 작품을 만들어봐요.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 rounded-xl border border-border bg-card"
          >
            <div className={`inline-flex p-2 rounded-lg ${stat.bg} mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Project header with search + filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-white mr-auto">프로젝트</h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="프로젝트 검색..."
            className="pl-9 pr-4 py-2 rounded-lg bg-accent border border-border text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500 w-48"
          />
        </div>

        <Link
          href="/projects/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 프로젝트
        </Link>
      </div>

      {/* Status filters */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filter === f.value
                ? 'bg-purple-600 text-white'
                : 'bg-accent text-muted-foreground hover:text-white'
            )}
          >
            {f.label}
            {f.value !== 'all' && (
              <span className="ml-1.5 opacity-60">
                {projects.filter(p => p.status === f.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Project grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
            <Film className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">
            {search || filter !== 'all' ? '조건에 맞는 프로젝트가 없어요.' : '아직 프로젝트가 없어요.\n첫 번째 작품을 시작해볼까요?'}
          </p>
          {!search && filter === 'all' && (
            <Link
              href="/projects/new"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm"
            >
              <Plus className="w-4 h-4" />새 프로젝트
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
