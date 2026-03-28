'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getProject, getEpisodes, getScenes, getCharacters } from '@/lib/firestore'
import { Scene, Character } from '@/types'
import { useState } from 'react'
import { Download, FileText, Image, Video, Code, Database, Loader2, CheckCircle, Package } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

type ExportId = 'scripts' | 'image' | 'video' | 'storyboard' | 'json' | 'ebs'

export default function ExportPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [loading, setLoading] = useState<ExportId | null>(null)
  const [done, setDone] = useState<ExportId | null>(null)
  const [progress, setProgress] = useState(0)

  // EBS package checkboxes
  const [ebsItems, setEbsItems] = useState({
    scripts: true,
    storyboard: true,
    characters: true,
    prompts: true,
  })

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

  const { data: characters = [] } = useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => getCharacters(projectId),
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

  function download(content: string | Blob, filename: string, mime = 'text/plain') {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function markDone(id: ExportId) {
    setDone(id); setLoading(null); setProgress(0)
    setTimeout(() => setDone(null), 3000)
  }

  // ─── Export: Scripts PDF ──────────────────────────
  async function exportScripts() {
    setLoading('scripts'); setDone(null); setProgress(10)
    try {
      const scenes = await getAllScenes()
      setProgress(40)
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF('p', 'mm', 'a4')
      let y = 20

      doc.setFontSize(16)
      doc.text(project?.title || '', 20, y); y += 8
      doc.setFontSize(10)
      doc.text('Director Script Collection', 20, y); y += 12

      for (const scene of scenes) {
        if (!scene.assets?.directorScript) continue
        if (y > 250) { doc.addPage(); y = 20 }

        doc.setFontSize(11)
        doc.text(`EP.${scene.episodeNumber} S${scene.number}: ${scene.title}`, 20, y); y += 6

        doc.setFontSize(9)
        const lines = doc.splitTextToSize(scene.assets.directorScript, 170)
        for (const line of lines) {
          if (y > 280) { doc.addPage(); y = 20 }
          doc.text(line, 20, y); y += 4
        }
        y += 4
        doc.setDrawColor(200); doc.line(20, y, 190, y); y += 6
      }

      setProgress(80)
      doc.save(`${project?.titleEn || 'scripts'}_director_scripts.pdf`)
      markDone('scripts')
      toast.success('연출 스크립트 PDF 내보내기 완료!')
    } catch (e: any) {
      toast.error('내보내기 실패: ' + e.message)
      setLoading(null); setProgress(0)
    }
  }

  // ─── Export: Image Prompts MD ──────────────────────
  async function exportImagePrompts() {
    setLoading('image'); setDone(null); setProgress(10)
    try {
      const scenes = await getAllScenes()
      setProgress(50)
      let md = `# ${project?.title} — Image Prompts\n\n`
      for (const scene of scenes) {
        if (!scene.assets?.imagePrompt) continue
        md += `## EP.${scene.episodeNumber} S${scene.number}: ${scene.title}\n\n`
        md += `### Kling\n\`\`\`\n${scene.assets.imagePrompt.kling}\n\`\`\`\n\n`
        md += `### Midjourney\n\`\`\`\n${scene.assets.imagePrompt.midjourney}\n\`\`\`\n\n`
        md += `### Imagen\n\`\`\`\n${scene.assets.imagePrompt.imagen}\n\`\`\`\n\n`
        md += `### Negative\n\`\`\`\n${scene.assets.imagePrompt.negativePrompt}\n\`\`\`\n\n---\n\n`
      }
      download(md, `${project?.titleEn || 'project'}_image_prompts.md`, 'text/markdown')
      markDone('image')
      toast.success('이미지 프롬프트 내보내기 완료!')
    } catch (e: any) {
      toast.error('내보내기 실패: ' + e.message)
      setLoading(null); setProgress(0)
    }
  }

  // ─── Export: Video Prompts TXT (per platform) ──────
  async function exportVideoPrompts() {
    setLoading('video'); setDone(null); setProgress(10)
    try {
      const scenes = await getAllScenes()
      setProgress(50)
      const platforms = ['kling', 'sora', 'runway'] as const
      const labels = { kling: 'Kling', sora: 'OpenAI Sora', runway: 'Runway Gen-3' }

      for (const platform of platforms) {
        let txt = `${project?.title} — ${labels[platform]} Prompts\n${'='.repeat(50)}\n\n`
        let hasContent = false
        for (const scene of scenes) {
          if (!scene.assets?.videoPrompt?.[platform]) continue
          hasContent = true
          txt += `[EP.${scene.episodeNumber} S${scene.number}: ${scene.title}]\n${scene.assets.videoPrompt[platform]}\n\n---\n\n`
        }
        if (hasContent) {
          download(txt, `${project?.titleEn || 'project'}_${platform}_prompts.txt`)
        }
      }
      markDone('video')
      toast.success('영상 프롬프트 내보내기 완료!')
    } catch (e: any) {
      toast.error('내보내기 실패: ' + e.message)
      setLoading(null); setProgress(0)
    }
  }

  // ─── Export: Storyboard HTML ──────────────────────
  async function exportStoryboard() {
    setLoading('storyboard'); setDone(null); setProgress(10)
    try {
      const scenes = await getAllScenes()
      setProgress(50)
      const html = buildStoryboardHTML(scenes)
      download(html, `${project?.titleEn || 'project'}_storyboard.html`, 'text/html')
      markDone('storyboard')
      toast.success('스토리보드 HTML 내보내기 완료!')
    } catch (e: any) {
      toast.error('내보내기 실패: ' + e.message)
      setLoading(null); setProgress(0)
    }
  }

  function buildStoryboardHTML(scenes: (Scene & { episodeNumber: number; episodeTitle: string })[]) {
    return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${project?.title} Storyboard</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#FFFAF4;color:#374151;padding:32px;max-width:1200px;margin:0 auto}
h1{color:#7C3AED;margin-bottom:4px;font-size:24px}.sub{color:#6B7280;font-size:14px;margin-bottom:24px}
.scene{border:1px solid #E5E7EB;border-radius:12px;padding:16px;margin:12px 0;background:#fff}
.scene h2{font-size:14px;color:#374151;margin-bottom:4px}.scene .meta{font-size:12px;color:#6B7280;margin-bottom:8px}
.frame{background:#FFF4EE;border-radius:8px;padding:12px;margin:8px 0;border:1px solid #E5E7EB}
.frame b{font-size:12px;color:#374151}.frame p{font-size:12px;color:#6B7280;line-height:1.6;margin-top:4px}
.tag{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;margin:2px;background:#FBCFE8;color:#7C3AED}
</style></head><body>
<h1>${project?.title || ''}</h1><p class="sub">${project?.titleEn || ''}</p>\n` +
      scenes.map(scene => {
        let s = `<div class="scene"><h2>EP.${scene.episodeNumber} S${scene.number}: ${scene.title}</h2>`
        s += `<div class="meta">${scene.timeStart}~${scene.timeEnd} | ${scene.location}</div>`
        scene.emotionKeywords.forEach(k => s += `<span class="tag">${k}</span>`)
        if (scene.assets?.storyboardFrames?.length) {
          scene.assets.storyboardFrames.forEach(f => {
            s += `<div class="frame"><b>Frame ${f.frameNumber}</b><p>${f.description}</p><p style="color:#9CA3AF;font-size:11px">${f.cameraNote}</p></div>`
          })
        }
        return s + '</div>'
      }).join('\n') + '</body></html>'
  }

  // ─── Export: Full JSON Backup ─────────────────────
  async function exportJSON() {
    setLoading('json'); setDone(null); setProgress(10)
    try {
      const scenes = await getAllScenes()
      setProgress(50)
      const backup = { project, episodes, characters, scenes, exportedAt: new Date().toISOString() }
      const dateStr = new Date().toISOString().slice(0, 10)
      download(JSON.stringify(backup, null, 2), `creature-studio-backup-${dateStr}.json`, 'application/json')
      markDone('json')
      toast.success('JSON 백업 완료!')
    } catch (e: any) {
      toast.error('내보내기 실패: ' + e.message)
      setLoading(null); setProgress(0)
    }
  }

  // ─── Export: EBS Submission Package ───────────────
  async function exportEBS() {
    setLoading('ebs'); setDone(null); setProgress(5)
    try {
      const JSZip = (await import('jszip')).default
      const { jsPDF } = await import('jspdf')
      const zip = new JSZip()
      const scenes = await getAllScenes()
      setProgress(20)

      // 1. Scripts PDF
      if (ebsItems.scripts) {
        const doc = new jsPDF('p', 'mm', 'a4')
        let y = 20
        doc.setFontSize(16); doc.text(project?.title || '', 20, y); y += 8
        doc.setFontSize(10); doc.text('Production Director Script', 20, y); y += 12
        for (const scene of scenes) {
          if (!scene.assets?.directorScript) continue
          if (y > 250) { doc.addPage(); y = 20 }
          doc.setFontSize(11); doc.text(`EP.${scene.episodeNumber} S${scene.number}: ${scene.title}`, 20, y); y += 6
          doc.setFontSize(9)
          const lines = doc.splitTextToSize(scene.assets.directorScript, 170)
          for (const line of lines) {
            if (y > 280) { doc.addPage(); y = 20 }
            doc.text(line, 20, y); y += 4
          }
          y += 4; doc.setDrawColor(200); doc.line(20, y, 190, y); y += 6
        }
        zip.file('01_director_scripts.pdf', doc.output('blob'))
        setProgress(40)
      }

      // 2. Storyboard HTML
      if (ebsItems.storyboard) {
        const html = buildStoryboardHTML(scenes)
        zip.file('02_storyboard.html', html)
        setProgress(55)
      }

      // 3. Character PDF
      if (ebsItems.characters) {
        const doc = new jsPDF('p', 'mm', 'a4')
        let y = 20
        doc.setFontSize(16); doc.text(`${project?.title || ''} - Character Guide`, 20, y); y += 12
        for (const char of characters) {
          if (y > 250) { doc.addPage(); y = 20 }
          doc.setFontSize(12); doc.text(`${char.name} (${char.nameEn})`, 20, y); y += 6
          doc.setFontSize(9)
          doc.text(`Role: ${char.role} | Emotional Role: ${char.emotionalRole}`, 20, y); y += 5
          if (char.appearance.base) {
            const lines = doc.splitTextToSize(`Appearance: ${char.appearance.base}`, 170)
            for (const line of lines) {
              if (y > 280) { doc.addPage(); y = 20 }
              doc.text(line, 20, y); y += 4
            }
          }
          if (char.appearance.fixedPromptKeywords.length > 0) {
            doc.text(`Keywords: ${char.appearance.fixedPromptKeywords.join(', ')}`, 20, y); y += 5
          }
          if (char.emotionVariants.length > 0) {
            for (const v of char.emotionVariants) {
              if (y > 280) { doc.addPage(); y = 20 }
              doc.text(`  ${v.emotion}: ${v.appearanceChange}`, 20, y); y += 4
            }
          }
          y += 3; doc.setDrawColor(200); doc.line(20, y, 190, y); y += 6
        }
        zip.file('03_character_guide.pdf', doc.output('blob'))
        setProgress(70)
      }

      // 4. AI Strategy MD (prompts)
      if (ebsItems.prompts) {
        let md = `# ${project?.title} — AI Production Strategy\n\n`
        md += `## Image Prompts\n\n`
        for (const scene of scenes) {
          if (!scene.assets?.imagePrompt) continue
          md += `### EP.${scene.episodeNumber} S${scene.number}: ${scene.title}\n\n`
          md += `**Midjourney:**\n\`\`\`\n${scene.assets.imagePrompt.midjourney}\n\`\`\`\n\n`
          md += `**Imagen:**\n\`\`\`\n${scene.assets.imagePrompt.imagen}\n\`\`\`\n\n`
        }
        md += `## Video Prompts\n\n`
        for (const scene of scenes) {
          if (!scene.assets?.videoPrompt) continue
          md += `### EP.${scene.episodeNumber} S${scene.number}: ${scene.title}\n\n`
          if (scene.assets.videoPrompt.kling) md += `**Kling:**\n\`\`\`\n${scene.assets.videoPrompt.kling}\n\`\`\`\n\n`
          if (scene.assets.videoPrompt.sora) md += `**Sora:**\n\`\`\`\n${scene.assets.videoPrompt.sora}\n\`\`\`\n\n`
          if (scene.assets.videoPrompt.runway) md += `**Runway:**\n\`\`\`\n${scene.assets.videoPrompt.runway}\n\`\`\`\n\n`
        }
        zip.file('04_ai_strategy.md', md)
        setProgress(85)
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const dateStr = new Date().toISOString().slice(0, 10)
      download(blob, `EBS_submission_${project?.titleEn || 'project'}_${dateStr}.zip`, 'application/zip')
      markDone('ebs')
      toast.success('EBS 제출용 패키지 다운로드 완료!')
    } catch (e: any) {
      toast.error('내보내기 실패: ' + e.message)
      setLoading(null); setProgress(0)
    }
  }

  const EXPORTS: {
    id: ExportId; icon: any; label: string; desc: string; action: () => void
    color: string; bg: string; extra?: React.ReactNode
  }[] = [
    { id: 'scripts', icon: FileText, label: '전체 제작 스크립트', desc: '모든 씬의 연출 스크립트를 하나의 PDF로', action: exportScripts, color: '#059669', bg: '#D1FAE5' },
    { id: 'image', icon: Image, label: '이미지 프롬프트 모음', desc: '플랫폼별로 정리된 이미지 생성 프롬프트 — Markdown', action: exportImagePrompts, color: '#2563EB', bg: '#DBEAFE' },
    { id: 'video', icon: Video, label: '영상 프롬프트 모음', desc: '플랫폼별 TXT 파일로 내보내기 (Veo / Sora / Runway)', action: exportVideoPrompts, color: '#7C3AED', bg: '#EDE9FE' },
    { id: 'storyboard', icon: Code, label: '스토리보드', desc: '전체 스토리보드를 오프라인 HTML 파일로', action: exportStoryboard, color: '#0891B2', bg: '#CFFAFE' },
    { id: 'json', icon: Database, label: '프로젝트 전체 백업', desc: '프로젝트 모든 데이터를 JSON으로 백업', action: exportJSON, color: '#EA580C', bg: '#FED7AA' },
    {
      id: 'ebs', icon: Package, label: 'EBS 제출용 패키지', desc: 'EBS 공모전 제출에 필요한 파일 일괄 ZIP 생성', action: exportEBS, color: '#DC2626', bg: '#FEE2E2',
      extra: (
        <div className="mt-3 space-y-1.5">
          {[
            { key: 'scripts' as const, label: '기획안 (연출 스크립트 전체 PDF)' },
            { key: 'storyboard' as const, label: '스토리보드 (HTML)' },
            { key: 'characters' as const, label: '캐릭터 설정집 (캐릭터 정보 PDF)' },
            { key: 'prompts' as const, label: 'AI 활용 전략서 (프롬프트 Markdown)' },
          ].map(item => (
            <label key={item.key} className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--color-text-sub)' }}>
              <input
                type="checkbox"
                checked={ebsItems[item.key]}
                onChange={e => setEbsItems(prev => ({ ...prev, [item.key]: e.target.checked }))}
                className="rounded"
              />
              {item.label}
            </label>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>내보내기 센터</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-sub)' }}>생성된 모든 에셋을 다양한 형식으로 내보냅니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPORTS.map((exp, i) => (
          <motion.div key={exp.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="p-5 rounded-xl border transition-colors"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: exp.bg }}>
                <exp.icon className="w-5 h-5" style={{ color: exp.color }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{exp.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-sub)' }}>{exp.desc}</p>
                {exp.extra}
              </div>
            </div>

            {/* Progress bar */}
            {loading === exp.id && progress > 0 && (
              <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: exp.color }} />
              </div>
            )}

            <button
              onClick={exp.action}
              disabled={loading !== null}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 hover:opacity-80"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              {loading === exp.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : done === exp.id ? (
                <CheckCircle className="w-3.5 h-3.5" style={{ color: '#059669' }} />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {loading === exp.id ? '처리 중...' : done === exp.id ? '다운로드 완료' : '내보내기'}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
