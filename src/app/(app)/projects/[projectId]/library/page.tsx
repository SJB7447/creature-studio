'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getEpisodes, getScenes } from '@/lib/firestore'
import { Scene } from '@/types'
import { useState, useEffect, useMemo } from 'react'
import { Search, Copy, CheckCircle, Download, Star, ChevronDown, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

type AssetType = 'all' | 'script' | 'image' | 'video' | 'storyboard'
type Platform = 'all' | 'Midjourney' | 'Imagen' | 'Veo2' | 'Sora' | 'Runway'

interface LibraryItem {
  id: string
  sceneId: string
  episodeId: string
  sceneNumber: number
  sceneTitle: string
  episodeTitle: string
  episodeNumber: number
  type: AssetType
  platform: Platform
  label: string
  content: string
  qualityScore?: number
  createdAt?: any
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={async (e) => {
      e.stopPropagation()
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('복사됨')
      setTimeout(() => setCopied(false), 2000)
    }} className="p-1.5 rounded-md hover:opacity-70 transition-colors shrink-0">
      {copied ? <CheckCircle className="w-3.5 h-3.5" style={{ color: 'green' }} /> : <Copy className="w-3.5 h-3.5" style={{ color: 'var(--color-text-sub)' }} />}
    </button>
  )
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  script: { bg: '#D1FAE5', text: '#059669' },
  image: { bg: '#DBEAFE', text: '#2563EB' },
  video: { bg: '#EDE9FE', text: '#7C3AED' },
  storyboard: { bg: '#CFFAFE', text: '#0891B2' },
}

export default function LibraryPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AssetType>('all')
  const [platformFilter, setPlatformFilter] = useState<Platform>('all')
  const [episodeFilter, setEpisodeFilter] = useState<string>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [exportOpen, setExportOpen] = useState(false)

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`favorites-${projectId}`)
      if (stored) setFavorites(new Set(JSON.parse(stored)))
    } catch {}
  }, [projectId])

  function toggleFavorite(id: string) {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      localStorage.setItem(`favorites-${projectId}`, JSON.stringify(Array.from(next)))
      return next
    })
  }

  const { data: episodes = [] } = useQuery({
    queryKey: ['episodes', projectId],
    queryFn: () => getEpisodes(projectId),
    enabled: !!projectId,
  })

  const { data: allScenes = [], isLoading } = useQuery({
    queryKey: ['all-scenes', projectId, episodes.map(e => e.id).join(',')],
    queryFn: async () => {
      const all: (Scene & { episodeTitle: string; episodeNumber: number; _episodeId: string })[] = []
      for (const ep of episodes) {
        const scenes = await getScenes(projectId, ep.id)
        scenes.forEach(s => all.push({ ...s, episodeTitle: ep.title, episodeNumber: ep.number, _episodeId: ep.id }))
      }
      return all
    },
    enabled: episodes.length > 0,
  })

  const items = useMemo(() => {
    const built: LibraryItem[] = []
    allScenes.forEach(scene => {
      const base = {
        sceneId: scene.id,
        episodeId: scene._episodeId,
        sceneNumber: scene.number,
        sceneTitle: scene.title,
        episodeTitle: scene.episodeTitle,
        episodeNumber: scene.episodeNumber,
        createdAt: scene.updatedAt,
      }

      if (scene.assets?.directorScript) {
        built.push({ ...base, id: `${scene.id}-script`, type: 'script', platform: 'all' as Platform, label: '연출 스크립트', content: scene.assets.directorScript })
      }
      if (scene.assets?.imagePrompt?.midjourney) {
        built.push({ ...base, id: `${scene.id}-mj`, type: 'image', platform: 'Midjourney', label: 'Midjourney', content: scene.assets.imagePrompt.midjourney })
      }
      if (scene.assets?.imagePrompt?.imagen) {
        built.push({ ...base, id: `${scene.id}-imagen`, type: 'image', platform: 'Imagen', label: 'Imagen', content: scene.assets.imagePrompt.imagen })
      }
      if (scene.assets?.videoPrompt?.veo) {
        built.push({ ...base, id: `${scene.id}-veo`, type: 'video', platform: 'Veo2', label: 'Veo 2', content: scene.assets.videoPrompt.veo })
      }
      if (scene.assets?.videoPrompt?.sora) {
        built.push({ ...base, id: `${scene.id}-sora`, type: 'video', platform: 'Sora', label: 'Sora', content: scene.assets.videoPrompt.sora })
      }
      if (scene.assets?.videoPrompt?.runway) {
        built.push({ ...base, id: `${scene.id}-runway`, type: 'video', platform: 'Runway', label: 'Runway', content: scene.assets.videoPrompt.runway })
      }
      if (scene.assets?.storyboardFrames?.length) {
        const content = scene.assets.storyboardFrames.map(f =>
          `Frame ${f.frameNumber}: ${f.description}\nCamera: ${f.cameraNote}`
        ).join('\n\n')
        built.push({ ...base, id: `${scene.id}-sb`, type: 'storyboard', platform: 'all' as Platform, label: '스토리보드', content })
      }
    })
    return built
  }, [allScenes])

  const filtered = useMemo(() => items.filter(item => {
    const matchType = typeFilter === 'all' || item.type === typeFilter
    const matchPlatform = platformFilter === 'all' || item.platform === platformFilter
    const matchEp = episodeFilter === 'all' || item.episodeTitle === episodeFilter
    const matchSearch = !search || item.content.toLowerCase().includes(search.toLowerCase()) || item.sceneTitle.toLowerCase().includes(search.toLowerCase())
    const matchFav = !favoritesOnly || favorites.has(item.id)
    return matchType && matchPlatform && matchEp && matchSearch && matchFav
  }), [items, typeFilter, platformFilter, episodeFilter, search, favoritesOnly, favorites])

  function download(content: string, filename: string, mime = 'text/plain') {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function exportMarkdown() {
    setExportOpen(false)
    let md = ''
    let lastEp = ''
    let lastScene = ''
    for (const item of filtered) {
      if (item.episodeTitle !== lastEp) {
        md += `\n## ${item.episodeTitle}\n`
        lastEp = item.episodeTitle
        lastScene = ''
      }
      if (`${item.sceneNumber}` !== lastScene) {
        md += `\n### S${item.sceneNumber}. ${item.sceneTitle}\n`
        lastScene = `${item.sceneNumber}`
      }
      md += `\n#### ${item.label}\n\n\`\`\`\n${item.content}\n\`\`\`\n`
    }
    download(md, 'prompts.md', 'text/markdown')
    toast.success('Markdown으로 내보냈습니다.')
  }

  function exportJSON() {
    setExportOpen(false)
    download(JSON.stringify(filtered, null, 2), 'prompts.json', 'application/json')
    toast.success('JSON으로 내보냈습니다.')
  }

  function exportTxtByPlatform() {
    setExportOpen(false)
    const platforms = ['Midjourney', 'Imagen', 'Veo2', 'Sora', 'Runway'] as const
    for (const p of platforms) {
      const pItems = filtered.filter(i => i.platform === p)
      if (pItems.length === 0) continue
      const txt = pItems.map(i => `[EP.${i.episodeNumber} S${i.sceneNumber}: ${i.sceneTitle}]\n${i.content}`).join('\n\n---\n\n')
      download(txt, `${p}_prompts.txt`)
    }
    toast.success('플랫폼별 TXT로 내보냈습니다.')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>프롬프트 라이브러리</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-sub)' }}>모든 AI 생성 결과물 아카이브 · {items.length}개</p>
        </div>
        <div className="relative">
          <button onClick={() => setExportOpen(!exportOpen)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)', background: 'var(--color-surface)' }}>
            <Download className="w-3.5 h-3.5" />전체 내보내기<ChevronDown className="w-3 h-3" />
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border shadow-lg z-50 py-1" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <button onClick={exportMarkdown} className="w-full text-left px-4 py-2 text-sm hover:opacity-70" style={{ color: 'var(--color-text)' }}>Markdown으로 내보내기</button>
                <button onClick={exportJSON} className="w-full text-left px-4 py-2 text-sm hover:opacity-70" style={{ color: 'var(--color-text)' }}>JSON으로 내보내기</button>
                <button onClick={exportTxtByPlatform} className="w-full text-left px-4 py-2 text-sm hover:opacity-70" style={{ color: 'var(--color-text)' }}>TXT로 내보내기 (플랫폼별)</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-text-sub)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm focus:outline-none"
            style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
        </div>

        <select value={episodeFilter} onChange={e => setEpisodeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
          <option value="all">전체 에피소드</option>
          {episodes.map(ep => <option key={ep.id} value={ep.title}>EP.{ep.number} {ep.title}</option>)}
        </select>

        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as AssetType)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
          <option value="all">전체 타입</option>
          <option value="script">연출 스크립트</option>
          <option value="image">이미지 프롬프트</option>
          <option value="video">영상 프롬프트</option>
          <option value="storyboard">스토리보드</option>
        </select>

        <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value as Platform)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
          <option value="all">전체 플랫폼</option>
          <option value="Midjourney">Midjourney</option>
          <option value="Imagen">Imagen</option>
          <option value="Veo2">Veo 2</option>
          <option value="Sora">Sora</option>
          <option value="Runway">Runway</option>
        </select>

        <button onClick={() => setFavoritesOnly(!favoritesOnly)}
          className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors')}
          style={{
            borderColor: favoritesOnly ? 'var(--color-primary-dark)' : 'var(--color-border)',
            color: favoritesOnly ? 'var(--color-primary-dark)' : 'var(--color-text-sub)',
            background: favoritesOnly ? 'var(--color-primary)' : 'var(--color-surface-2)',
          }}
        >
          <Star className="w-3.5 h-3.5" fill={favoritesOnly ? 'currentColor' : 'none'} />즐겨찾기
        </button>
      </div>

      {/* Items */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-28 rounded-xl border animate-pulse" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-sub)' }}>
          {items.length === 0 ? '아직 생성된 에셋이 없습니다. 씬 에디터에서 AI 에이전트를 실행해보세요.' : '검색 결과가 없습니다.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, i) => {
            const isExpanded = expanded.has(item.id)
            const colors = TYPE_COLORS[item.type as string] || TYPE_COLORS.script
            return (
              <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                className="p-4 rounded-xl border transition-colors"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs" style={{ color: 'var(--color-text-sub)' }}>EP.{item.episodeNumber}</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>S{item.sceneNumber} {item.sceneTitle}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: colors.bg, color: colors.text }}>{item.label}</span>
                      {item.platform !== 'all' && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-sub)' }}>{item.platform}</span>
                      )}
                    </div>
                    <div className="cursor-pointer" onClick={() => {
                      setExpanded(prev => {
                        const next = new Set(prev)
                        if (next.has(item.id)) next.delete(item.id); else next.add(item.id)
                        return next
                      })
                    }}>
                      <p className={cn('text-xs font-mono', isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-3')}
                        style={{ color: 'var(--color-text-sub)' }}>{item.content}</p>
                      {!isExpanded && item.content.split('\n').length > 3 && (
                        <span className="text-xs mt-1 inline-block" style={{ color: 'var(--color-primary-dark)' }}>더보기</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <CopyBtn text={item.content} />
                    <button onClick={() => toggleFavorite(item.id)} className="p-1.5 rounded-md hover:opacity-70 transition-colors">
                      <Star className="w-3.5 h-3.5" fill={favorites.has(item.id) ? '#EAB308' : 'none'}
                        style={{ color: favorites.has(item.id) ? '#EAB308' : 'var(--color-text-sub)' }} />
                    </button>
                    <Link href={`/projects/${projectId}/episodes/${item.episodeId}/scenes/${item.sceneId}`}
                      className="p-1.5 rounded-md hover:opacity-70 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" style={{ color: 'var(--color-text-sub)' }} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
