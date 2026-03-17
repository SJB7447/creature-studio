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

  const { data: projects = [], isLoading, error: queryError } = useQuery({
    queryKey: ['projects', user?.uid],
    queryFn: () => getProjects(user!.uid),
    enabled: !!user,
    retry: 2,
  })

  // Firestore 쿼리 에러 로깅
  if (queryError) {
    console.error('[Dashboard] 프로젝트 조회 실패:', queryError)
  }

  const filtered = projects.filter(p => {
    const matchStatus = filter === 'all' || p.status === filter
    const matchSearch = !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.titleEn.toLowerCase().includes(search.toLowerCase()) ||
      p.genre.some(g => g.includes(search))
    return matchStatus && matchSearch
  })

  const stats = [
    { label: '전체 프로젝트', value: projects.length, icon: FolderOpen, color: '#7C3AED', bg: '#EDE9FE' },
    { label: '제작 중', value: projects.filter(p => p.status === 'production').length, icon: Film, color: '#059669', bg: '#D1FAE5' },
    { label: '프리프로덕션', value: projects.filter(p => p.status === 'preproduction').length, icon: Zap, color: '#2563EB', bg: '#DBEAFE' },
    {
      label: '이번 주 업데이트',
      value: projects.filter(p => {
        const d = (p.updatedAt as any)?.toDate ? (p.updatedAt as any).toDate() : new Date()
        return Date.now() - d.getTime() < 1000 * 60 * 60 * 24 * 7
      }).length,
      icon: Clock, color: '#D97706', bg: '#FEF3C7',
    },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          안녕하세요, {user?.displayName?.split(' ')[0]}님 👋
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-sub)' }}>오늘도 좋은 작품을 만들어봐요.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="p-5 rounded-2xl border"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="inline-flex p-2.5 rounded-xl mb-3" style={{ background: stat.bg }}>
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{stat.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-sub)' }}>{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Project header */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold mr-auto" style={{ color: 'var(--color-text)' }}>프로젝트</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-text-sub)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="프로젝트 검색..."
            className="pl-9 pr-4 py-2 rounded-xl border text-sm w-52 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          />
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors hover:opacity-90"
          style={{ background: 'var(--color-primary-dark)' }}
        >
          <Plus className="w-4 h-4" />새 프로젝트
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 mb-6 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: filter === f.value ? 'var(--color-primary-dark)' : 'var(--color-surface-2)',
              color: filter === f.value ? 'white' : 'var(--color-text-sub)',
            }}
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

      {/* Grid */}
      {queryError ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#FEE2E2' }}>
            <Film className="w-8 h-8" style={{ color: '#EF4444' }} />
          </div>
          <p className="text-sm font-medium mb-2" style={{ color: '#EF4444' }}>프로젝트를 불러올 수 없습니다</p>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-sub)' }}>
            Firestore 연결을 확인해주세요. 인덱스가 필요할 수 있습니다.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium"
            style={{ background: 'var(--color-primary-dark)' }}
          >
            새로고침
          </button>
        </motion.div>
      ) : isLoading ? (
        <div className="grid grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface-2)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--color-surface-2)' }}>
            <Film className="w-8 h-8" style={{ color: 'var(--color-text-sub)' }} />
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-sub)' }}>
            {search || filter !== 'all' ? '조건에 맞는 프로젝트가 없어요.' : '첫 번째 프로젝트를 만들어보세요!'}
          </p>
          {!search && filter === 'all' && (
            <Link
              href="/projects/new"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
              style={{ background: 'var(--color-primary-dark)' }}
            >
              <Plus className="w-4 h-4" />새 프로젝트
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {filtered.map((project, i) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </div>
      )}

      {/* FAB */}
      <Link
        href="/projects/new"
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition-transform z-40"
        style={{ background: 'var(--color-primary-dark)' }}
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  )
}
