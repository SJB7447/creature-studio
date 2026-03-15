'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getProjects } from '@/lib/firestore'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { NewProjectButton } from '@/components/projects/NewProjectButton'
import { motion } from 'framer-motion'
import { FolderOpen, Film, Zap, Clock } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', user?.uid],
    queryFn: () => getProjects(user!.uid),
    enabled: !!user,
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
      label: '최근 업데이트',
      value: projects.filter(p => {
        if (!p.updatedAt) return false
        const d = (p.updatedAt as any).toDate ? (p.updatedAt as any).toDate() : new Date()
        const diff = Date.now() - d.getTime()
        return diff < 1000 * 60 * 60 * 24 * 7 // 7 days
      }).length,
      icon: Clock,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
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

      {/* Projects */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">프로젝트</h2>
        <NewProjectButton />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
            <Film className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">아직 프로젝트가 없어요.<br />첫 번째 작품을 시작해볼까요?</p>
          <NewProjectButton />
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project, i) => (
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
