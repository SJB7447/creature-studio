'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getProject, getEpisodes, getScenes } from '@/lib/firestore'
import { Scene, Episode, Project } from '@/types'
import { useState } from 'react'
import { Download, FileText, Image, Video, Code, Database, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

export default function ExportPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [loading, setLoading] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  })

  const { data: episodes = [] } = useQuery({
    queryKey: ['episodes', projectId],
    queryFn: () => getEpisodes(projectId),
    enabled: !!projectId,
  })

  async function getAllScenes(): Promise<(Scene & { episodeNumber: number; episodeTitle: string })[]> {
    const all: (Scene & { episodeNumber: number; episodeTitle: string })[] = []
    for (const ep of episodes) {
      const scenes = await getScenes(projectId, ep.id)
      scenes.forEach(s => all.push({ ...s, episodeNumber: ep.number, episodeTitle: ep.title }))
    }
    return all.sort((a, b) => a.episodeNumber - b.episodeNumber || a.number - b.number)
  }

  function download(content: string, filename: string, mime = 'text/plain') {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  async function exportScripts() {
    setLoading('scripts'); setDone(null)
    try {
      const scenes = await getAllScenes()
      let md = `# ${project?.title} — 전체 연출 스크립트\n\n`
      for (const scene of scenes) {
        if (!scene.assets?.directorScript) continue
        md += `## EP.${scene.episodeNumber} S${scene.number}: ${scene.title}\n\n`
        md += scene.assets.directorScript + '\n\n---\n\n'
      }
      download(md, `${project?.titleEn || 'scripts'}_director_scripts.md`, 'text/markdown')
      setDone('scripts'); toast.success('연출 스크립트 내보내기 완료!')
    } finally { setLoading(null) }
  }

  async function exportImagePrompts() {
    setLoading('image'); setDone(null)
    try {
      const scenes = await getAllScenes()
      let md = `# ${project?.title} — 이미지 프롬프트\n\n`
      for (const scene of scenes) {
        if (!scene.assets?.imagePrompt) continue
        md += `## EP.${scene.episodeNumber} S${scene.number}: ${scene.title}\n\n`
        md += `### Base\n\`\`\`\n${scene.assets.imagePrompt.base}\n\`\`\`\n\n`
        md += `### Midjourney\n\`\`\`\n${scene.assets.imagePrompt.midjourney}\n\`\`\`\n\n`
        md += `### Imagen\n\`\`\`\n${scene.assets.imagePrompt.imagen}\n\`\`\`\n\n`
        md += `### Negative\n\`\`\`\n${scene.assets.imagePrompt.negativePrompt}\n\`\`\`\n\n---\n\n`
      }
      download(md, `${project?.titleEn || 'project'}_image_prompts.md`, 'text/markdown')
      setDone('image'); toast.success('이미지 프롬프트 내보내기 완료!')
    } finally { setLoading(null) }
  }

  async function exportVideoPrompts() {
    setLoading('video'); setDone(null)
    try {
      const scenes = await getAllScenes()
      const platforms = ['veo', 'sora', 'runway'] as const
      const labels = { veo: 'Google Veo 2', sora: 'OpenAI Sora', runway: 'Runway Gen-3' }
      let txt = `${project?.title} — 영상 프롬프트\n${'='.repeat(50)}\n\n`
      for (const platform of platforms) {
        txt += `\n${'─'.repeat(50)}\n${labels[platform]}\n${'─'.repeat(50)}\n\n`
        for (const scene of scenes) {
          if (!scene.assets?.videoPrompt?.[platform]) continue
          txt += `[EP.${scene.episodeNumber} S${scene.number}: ${scene.title}]\n${scene.assets.videoPrompt[platform]}\n\n`
        }
      }
      download(txt, `${project?.titleEn || 'project'}_video_prompts.txt`)
      setDone('video'); toast.success('영상 프롬프트 내보내기 완료!')
    } finally { setLoading(null) }
  }

  async function exportStoryboard() {
    setLoading('storyboard'); setDone(null)
    try {
      const scenes = await getAllScenes()
      let html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${project?.title} Storyboard</title>
<style>body{font-family:sans-serif;background:#0f1117;color:#e5e7eb;padding:32px}
h1{color:#a78bfa;margin-bottom:8px}h2{color:#7dd3fc;font-size:14px;margin:24px 0 8px}
.scene{border:1px solid #1e293b;border-radius:12px;padding:16px;margin:12px 0;background:#1a1f2e}
.frame{background:#0f1117;border-radius:8px;padding:12px;margin:8px 0}
.tag{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;margin:2px;background:#312e81;color:#a78bfa}
p{font-size:13px;color:#9ca3af;line-height:1.6}</style></head><body>
<h1>${project?.title}</h1><p>${project?.titleEn}</p>\n`
      for (const scene of scenes) {
        html += `<div class="scene"><h2>EP.${scene.episodeNumber} S${scene.number}: ${scene.title}</h2>`
        html += `<p>${scene.timeStart}~${scene.timeEnd} | ${scene.location}</p>`
        scene.emotionKeywords.forEach(k => html += `<span class="tag">${k}</span>`)
        if (scene.assets?.storyboardFrames?.length) {
          html += '<div style="margin-top:12px">'
          scene.assets.storyboardFrames.forEach(f => {
            html += `<div class="frame"><b style="color:#e5e7eb;font-size:12px">Frame ${f.frameNumber}</b><p>${f.description}</p><p style="color:#6b7280;font-size:12px">${f.cameraNote}</p></div>`
          })
          html += '</div>'
        }
        html += '</div>\n'
      }
      html += '</body></html>'
      download(html, `${project?.titleEn || 'project'}_storyboard.html`, 'text/html')
      setDone('storyboard'); toast.success('스토리보드 HTML 내보내기 완료!')
    } finally { setLoading(null) }
  }

  async function exportJSON() {
    setLoading('json'); setDone(null)
    try {
      const scenes = await getAllScenes()
      const backup = { project, episodes, scenes, exportedAt: new Date().toISOString() }
      download(JSON.stringify(backup, null, 2), `${project?.titleEn || 'project'}_backup.json`, 'application/json')
      setDone('json'); toast.success('JSON 백업 완료!')
    } finally { setLoading(null) }
  }

  const EXPORTS = [
    { id: 'scripts', icon: FileText, label: '전체 연출 스크립트', desc: '모든 씬의 연출 스크립트를 Markdown으로', action: exportScripts, color: 'text-green-400', bg: 'bg-green-500/10' },
    { id: 'image', icon: Image, label: '이미지 프롬프트 전체', desc: 'MJ / Imagen / 네거티브 — Markdown', action: exportImagePrompts, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'video', icon: Video, label: '영상 프롬프트 전체', desc: 'Veo / Sora / Runway — 플랫폼별 TXT', action: exportVideoPrompts, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { id: 'storyboard', icon: Code, label: '스토리보드 HTML', desc: '모든 씬 스토리보드 프레임 — HTML 파일', action: exportStoryboard, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { id: 'json', icon: Database, label: '전체 프로젝트 백업', desc: '프로젝트 전체 데이터 JSON 백업', action: exportJSON, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ]

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">내보내기 센터</h1>
        <p className="text-sm text-muted-foreground mt-0.5">생성된 모든 에셋을 다양한 형식으로 내보냅니다.</p>
      </div>

      <div className="space-y-3">
        {EXPORTS.map((exp, i) => (
          <motion.div key={exp.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card hover:border-purple-500/30 transition-colors"
          >
            <div className={`w-10 h-10 rounded-xl ${exp.bg} flex items-center justify-center shrink-0`}>
              <exp.icon className={`w-5 h-5 ${exp.color}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{exp.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{exp.desc}</p>
            </div>
            <button
              onClick={exp.action}
              disabled={loading !== null}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-white text-xs font-medium transition-colors disabled:opacity-50 border border-border"
            >
              {loading === exp.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : done === exp.id ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {loading === exp.id ? '처리 중...' : '내보내기'}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
