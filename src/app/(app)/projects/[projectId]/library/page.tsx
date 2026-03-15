'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getEpisodes, getScenes } from '@/lib/firestore'
import { Scene, Episode } from '@/types'
import { useState, useEffect } from 'react'
import { Search, Copy, CheckCircle, Download } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type AssetType = 'all' | 'script' | 'image' | 'video' | 'storyboard'

interface LibraryItem {
  sceneId: string
  sceneNumber: number
  sceneTitle: string
  episodeTitle: string
  type: AssetType
  label: string
  content: string
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={async () => {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('복사됨')
      setTimeout(() => setCopied(false), 2000)
    }} className="p-1.5 rounded-md hover:bg-accent transition-colors shrink-0">
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  )
}

export default function LibraryPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AssetType>('all')
  const [episodeFilter, setEpisodeFilter] = useState<string>('all')
  const [items, setItems] = useState<LibraryItem[]>([])

  const { data: episodes = [] } = useQuery({
    queryKey: ['episodes', projectId],
    queryFn: () => getEpisodes(projectId),
    enabled: !!projectId,
  })

  // Load all scenes from all episodes
  const { data: allScenes = [], isLoading } = useQuery({
    queryKey: ['all-scenes', projectId, episodes.map(e => e.id).join(',')],
    queryFn: async () => {
      const all: (Scene & { episodeTitle: string })[] = []
      for (const ep of episodes) {
        const scenes = await getScenes(projectId, ep.id)
        scenes.forEach(s => all.push({ ...s, episodeTitle: ep.title }))
      }
      return all
    },
    enabled: episodes.length > 0,
  })

  useEffect(() => {
    const built: LibraryItem[] = []
    allScenes.forEach(scene => {
      if (scene.assets?.directorScript) {
        built.push({ sceneId: scene.id, sceneNumber: scene.number, sceneTitle: scene.title, episodeTitle: scene.episodeTitle, type: 'script', label: '연출 스크립트', content: scene.assets.directorScript })
      }
      if (scene.assets?.imagePrompt?.base) {
        built.push({ sceneId: scene.id, sceneNumber: scene.number, sceneTitle: scene.title, episodeTitle: scene.episodeTitle, type: 'image', label: 'Midjourney', content: scene.assets.imagePrompt.midjourney })
        built.push({ sceneId: scene.id, sceneNumber: scene.number, sceneTitle: scene.title, episodeTitle: scene.episodeTitle, type: 'image', label: 'Imagen', content: scene.assets.imagePrompt.imagen })
      }
      if (scene.assets?.videoPrompt?.veo) {
        built.push({ sceneId: scene.id, sceneNumber: scene.number, sceneTitle: scene.title, episodeTitle: scene.episodeTitle, type: 'video', label: 'Veo 2', content: scene.assets.videoPrompt.veo })
        built.push({ sceneId: scene.id, sceneNumber: scene.number, sceneTitle: scene.title, episodeTitle: scene.episodeTitle, type: 'video', label: 'Sora', content: scene.assets.videoPrompt.sora })
        built.push({ sceneId: scene.id, sceneNumber: scene.number, sceneTitle: scene.title, episodeTitle: scene.episodeTitle, type: 'video', label: 'Runway', content: scene.assets.videoPrompt.runway })
      }
    })
    setItems(built)
  }, [allScenes])

  const filtered = items.filter(item => {
    const matchType = typeFilter === 'all' || item.type === typeFilter
    const matchEp = episodeFilter === 'all' || item.episodeTitle === episodeFilter
    const matchSearch = !search || item.content.toLowerCase().includes(search.toLowerCase()) || item.sceneTitle.toLowerCase().includes(search.toLowerCase())
    return matchType && matchEp && matchSearch
  })

  const TYPE_COLORS: Record<string, string> = {
    script: 'bg-green-500/20 text-green-400',
    image: 'bg-blue-500/20 text-blue-400',
    video: 'bg-purple-500/20 text-purple-400',
    storyboard: 'bg-cyan-500/20 text-cyan-400',
  }

  function exportMarkdown() {
    const md = filtered.map(item =>
      `## S${item.sceneNumber} — ${item.sceneTitle} (${item.label})\n\n${item.content}\n`
    ).join('\n---\n\n')
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'prompts.md'; a.click()
    toast.success('Markdown으로 내보냈습니다.')
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'prompts.json'; a.click()
    toast.success('JSON으로 내보냈습니다.')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">프롬프트 라이브러리</h1>
          <p className="text-sm text-muted-foreground mt-0.5">모든 AI 생성 결과물 아카이브 · {items.length}개</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportMarkdown} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-white hover:bg-accent text-xs transition-colors">
            <Download className="w-3.5 h-3.5" />MD
          </button>
          <button onClick={exportJSON} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-white hover:bg-accent text-xs transition-colors">
            <Download className="w-3.5 h-3.5" />JSON
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..." className="w-full pl-9 pr-4 py-2 rounded-lg bg-accent border border-border text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500" />
        </div>

        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as AssetType)} className="px-3 py-2 rounded-lg bg-accent border border-border text-white text-sm focus:outline-none">
          <option value="all">전체 타입</option>
          <option value="script">연출 스크립트</option>
          <option value="image">이미지 프롬프트</option>
          <option value="video">영상 프롬프트</option>
        </select>

        <select value={episodeFilter} onChange={e => setEpisodeFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-accent border border-border text-white text-sm focus:outline-none">
          <option value="all">전체 에피소드</option>
          {episodes.map(ep => <option key={ep.id} value={ep.title}>{ep.title}</option>)}
        </select>
      </div>

      {/* Items */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-28 rounded-xl bg-card border border-border animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {items.length === 0 ? '아직 생성된 에셋이 없습니다. 씬 에디터에서 AI 에이전트를 실행해보세요.' : '검색 결과가 없습니다.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="p-4 rounded-xl border border-border bg-card hover:border-purple-500/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium text-white">S{item.sceneNumber} {item.sceneTitle}</span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded', TYPE_COLORS[item.type])}>{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.episodeTitle}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 font-mono">{item.content}</p>
                </div>
                <CopyBtn text={item.content} />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
