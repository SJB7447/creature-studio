'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getScenes, getEpisode, getEpisodes, getProject } from '@/lib/firestore'
import { Scene, Episode } from '@/types'
import { motion } from 'framer-motion'
import { useState, useRef, useMemo } from 'react'
import { Download, ChevronDown, BarChart2 } from 'lucide-react'
import { cn, TIME_OF_DAY_LABELS } from '@/lib/utils'
import Link from 'next/link'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const EMOTION_INTENSITY: Record<string, number> = {
  '기쁨': 8, '슬픔': 4, '분노': 9, '두려움': 3, '놀람': 7, '혐오': 2,
  '설렘': 8, '불안': 4, '희망': 7, '절망': 2, '해소': 6, '치유': 7,
  '억눌림': 3, '평온': 5, '카타르시스': 9, '감동': 8, '긴장': 6,
}

function getEmotionScore(keywords: string[]): number {
  if (!keywords.length) return 5
  const scores = keywords.map(k => {
    for (const [key, val] of Object.entries(EMOTION_INTENSITY)) {
      if (k.includes(key)) return val
    }
    return 5
  })
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

function getAIStatus(scene: Scene): { label: string; color: string } {
  const a = scene.assets || {}
  const has = [a.directorScript, a.imagePrompt?.base, a.videoPrompt?.veo, a.storyboardFrames?.length]
  const count = has.filter(Boolean).length
  if (count === 4) return { label: '전체완료', color: 'bg-green-500/20 text-green-400 border-green-500/30' }
  if (count > 0) return { label: '일부완료', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' }
  return { label: '미생성', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
}

function getQualityScore(scene: Scene): number | null {
  const raw = scene.assets?.agentAnalysis
  if (!raw) return null
  if (raw.includes('"A"') || raw.includes('Grade: A')) return 100
  if (raw.includes('"B"') || raw.includes('Grade: B')) return 75
  if (raw.includes('"C"') || raw.includes('Grade: C')) return 50
  return null
}

function parseRuntime(t: string): number {
  const m = t.match(/(\d+):(\d+)/)
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2])
  return 0
}

function formatSeconds(s: number): string {
  const min = Math.floor(s / 60)
  const sec = s % 60
  return `${min}분 ${sec > 0 ? sec + '초' : ''}`
}

function EmotionChart({ scenes }: { scenes: Scene[] }) {
  const data = useMemo(() => ({
    labels: scenes.map(s => `S${s.number}`),
    datasets: [{
      data: scenes.map(s => getEmotionScore(s.emotionKeywords)),
      borderColor: 'var(--color-primary-dark)',
      backgroundColor: 'rgba(124, 58, 237, 0.1)',
      pointBackgroundColor: 'var(--color-primary-dark)',
      pointBorderColor: '#fff',
      pointRadius: 5,
      pointHoverRadius: 7,
      tension: 0.4,
      fill: true,
    }],
  }), [scenes])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { min: 0, max: 10, ticks: { color: 'var(--color-text-sub)', stepSize: 2 }, grid: { color: 'var(--color-border)' } },
      x: { ticks: { color: 'var(--color-text-sub)' }, grid: { display: false } },
    },
    plugins: { tooltip: { callbacks: { label: (ctx: any) => `감정 강도: ${ctx.raw}/10` } } },
  }), [])

  return (
    <div className="p-5 rounded-xl border bg-card mb-6" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-4 h-4" style={{ color: 'var(--color-primary-dark)' }} />
        <h3 className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>감정 흐름 곡선</h3>
      </div>
      <div style={{ height: 160 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  )
}

function StatsBar({ scenes }: { scenes: Scene[] }) {
  const totalScenes = scenes.length
  const completedScenes = scenes.filter(s => {
    const a = s.assets || {}
    return a.directorScript && a.imagePrompt?.base && a.videoPrompt?.veo && a.storyboardFrames?.length
  }).length
  const totalRuntime = scenes.reduce((sum, s) => sum + parseRuntime(s.timeEnd) - parseRuntime(s.timeStart), 0)
  const qualityScores = scenes.map(getQualityScore).filter((s): s is number => s !== null)
  const avgQuality = qualityScores.length > 0 ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length) : null

  const stats = [
    { label: '총 씬 수', value: `${totalScenes}개` },
    { label: 'AI 생성 완료', value: `${completedScenes}/${totalScenes}` },
    { label: '총 러닝타임', value: formatSeconds(Math.abs(totalRuntime)) },
    { label: '평균 품질', value: avgQuality ? `${avgQuality}점` : '-' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {stats.map(s => (
        <div key={s.label} className="p-3 rounded-xl border bg-card text-center" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-lg font-bold" style={{ color: 'var(--color-primary-dark)' }}>{s.value}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-sub)' }}>{s.label}</p>
        </div>
      ))}
    </div>
  )
}

export default function StoryboardPage() {
  const { projectId, episodeId } = useParams<{ projectId: string; episodeId: string }>()
  const [exportOpen, setExportOpen] = useState(false)
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(episodeId)

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

  const { data: episode } = useQuery({
    queryKey: ['episode', projectId, selectedEpisodeId],
    queryFn: () => getEpisode(projectId, selectedEpisodeId),
    enabled: !!selectedEpisodeId,
  })

  const { data: scenes = [], isLoading } = useQuery({
    queryKey: ['scenes', projectId, selectedEpisodeId],
    queryFn: () => getScenes(projectId, selectedEpisodeId),
    enabled: !!selectedEpisodeId,
  })

  async function exportHTML() {
    setExportOpen(false)
    let html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${project?.title || ''} Storyboard</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#FFFAF4;color:#374151;padding:32px;max-width:1200px;margin:0 auto}
h1{color:#7C3AED;margin-bottom:4px;font-size:24px}h2{color:#374151;font-size:14px;margin:24px 0 8px}
.subtitle{color:#6B7280;font-size:14px;margin-bottom:24px}
.timeline{display:flex;gap:16px;overflow-x:auto;padding:16px 0}
.card{min-width:280px;max-width:280px;border:1px solid #E5E7EB;border-radius:12px;background:#fff;overflow:hidden}
.card-frame{height:140px;background:#FFF4EE;display:flex;align-items:center;justify-content:center;padding:12px;border-bottom:1px solid #E5E7EB}
.card-frame p{font-size:12px;color:#6B7280;line-height:1.6}
.card-body{padding:12px}
.card-body h3{font-size:13px;font-weight:600;margin-bottom:4px}
.card-body .meta{font-size:11px;color:#6B7280;margin-bottom:8px}
.tag{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;margin:2px;background:#FBCFE8;color:#7C3AED}
.badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;margin-top:8px}
.badge-green{background:#D1FAE5;color:#059669}.badge-yellow{background:#FEF3C7;color:#D97706}.badge-gray{background:#F3F4F6;color:#9CA3AF}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.stat{border:1px solid #E5E7EB;border-radius:12px;padding:12px;text-align:center;background:#fff}
.stat-val{font-size:18px;font-weight:700;color:#7C3AED}.stat-label{font-size:11px;color:#6B7280;margin-top:2px}
</style></head><body>
<h1>${project?.title || 'Storyboard'}</h1>
<p class="subtitle">EP.${episode?.number || ''} ${episode?.title || ''}</p>\n`

    // Stats
    const totalScenes = scenes.length
    const completed = scenes.filter(s => {
      const a = s.assets || {}
      return a.directorScript && a.imagePrompt?.base && a.videoPrompt?.veo && a.storyboardFrames?.length
    }).length
    const runtime = scenes.reduce((sum, s) => sum + parseRuntime(s.timeEnd) - parseRuntime(s.timeStart), 0)
    html += `<div class="stats">
<div class="stat"><div class="stat-val">${totalScenes}개</div><div class="stat-label">총 씬 수</div></div>
<div class="stat"><div class="stat-val">${completed}/${totalScenes}</div><div class="stat-label">AI 생성 완료</div></div>
<div class="stat"><div class="stat-val">${formatSeconds(Math.abs(runtime))}</div><div class="stat-label">총 러닝타임</div></div>
<div class="stat"><div class="stat-val">-</div><div class="stat-label">평균 품질</div></div>
</div>\n`

    html += `<div class="timeline">\n`
    for (const scene of scenes) {
      const status = getAIStatus(scene)
      const badgeClass = status.label === '전체완료' ? 'badge-green' : status.label === '일부완료' ? 'badge-yellow' : 'badge-gray'
      html += `<div class="card">
<div class="card-frame">${scene.assets?.storyboardFrames?.[0]
        ? `<p>${scene.assets.storyboardFrames[0].description}</p>`
        : `<p style="color:#9CA3AF">스토리보드 미생성</p>`
      }</div>
<div class="card-body">
<h3>S${scene.number}. ${scene.title}</h3>
<div class="meta">${scene.timeStart}~${scene.timeEnd} · ${TIME_OF_DAY_LABELS[scene.timeOfDay] || ''}</div>
${scene.dialogues[0] ? `<p style="font-size:12px;color:#6B7280;font-style:italic;margin-bottom:8px">"${scene.dialogues[0].line}"</p>` : ''}
${scene.emotionKeywords.slice(0, 3).map(k => `<span class="tag">${k}</span>`).join('')}
<div><span class="badge ${badgeClass}">${status.label}</span></div>
</div></div>\n`
    }
    html += `</div></body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `storyboard_EP${episode?.number || ''}.html`; a.click()
    URL.revokeObjectURL(url)
  }

  async function exportPDF() {
    setExportOpen(false)
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageW = 210
    let y = 20

    doc.setFontSize(18)
    doc.text(project?.title || 'Storyboard', 20, y)
    y += 8
    doc.setFontSize(11)
    doc.text(`EP.${episode?.number || ''} ${episode?.title || ''}`, 20, y)
    y += 12

    for (const scene of scenes) {
      if (y > 260) { doc.addPage(); y = 20 }

      doc.setFontSize(12)
      doc.text(`S${scene.number}. ${scene.title}`, 20, y)
      y += 6
      doc.setFontSize(9)
      doc.text(`${scene.timeStart}~${scene.timeEnd} | ${scene.location} | ${TIME_OF_DAY_LABELS[scene.timeOfDay] || ''}`, 20, y)
      y += 5

      if (scene.emotionKeywords.length > 0) {
        doc.text(`Keywords: ${scene.emotionKeywords.join(', ')}`, 20, y)
        y += 5
      }

      const status = getAIStatus(scene)
      doc.text(`AI: ${status.label}`, 20, y)
      y += 5

      if (scene.dialogues[0]) {
        doc.text(`"${scene.dialogues[0].line}"`, 20, y)
        y += 5
      }

      if (scene.assets?.storyboardFrames?.length) {
        for (const f of scene.assets.storyboardFrames) {
          if (y > 270) { doc.addPage(); y = 20 }
          doc.text(`  Frame ${f.frameNumber}: ${f.description.substring(0, 80)}`, 20, y)
          y += 4
          doc.text(`    Camera: ${f.cameraNote}`, 20, y)
          y += 5
        }
      }

      y += 4
      doc.setDrawColor(200)
      doc.line(20, y, pageW - 20, y)
      y += 6
    }

    doc.save(`storyboard_EP${episode?.number || ''}.pdf`)
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>스토리보드</h1>
          {episode && <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-sub)' }}>EP.{episode.number} — {episode.title}</p>}
        </div>
        <div className="flex items-center gap-3">
          {/* Episode selector */}
          {episodes.length > 1 && (
            <select
              value={selectedEpisodeId}
              onChange={e => setSelectedEpisodeId(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              {episodes.map(ep => <option key={ep.id} value={ep.id}>EP.{ep.number} {ep.title}</option>)}
            </select>
          )}

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)', background: 'var(--color-surface)' }}
            >
              <Download className="w-4 h-4" />내보내기<ChevronDown className="w-3 h-3" />
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border shadow-lg z-50 py-1" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <button onClick={exportHTML} className="w-full text-left px-4 py-2 text-sm hover:opacity-70" style={{ color: 'var(--color-text)' }}>HTML로 저장</button>
                  <button onClick={exportPDF} className="w-full text-left px-4 py-2 text-sm hover:opacity-70" style={{ color: 'var(--color-text)' }}>PDF로 저장</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {scenes.length > 0 && <StatsBar scenes={scenes} />}

      {/* Emotion curve chart */}
      {scenes.length > 1 && <EmotionChart scenes={scenes} />}

      {/* Scene cards timeline */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1,2,3,4].map(i => <div key={i} className="w-[280px] h-72 rounded-xl border animate-pulse shrink-0" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} />)}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {scenes.map((scene, i) => {
            const status = getAIStatus(scene)
            return (
              <motion.div
                key={scene.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="w-[280px] shrink-0"
              >
                <Link href={`/projects/${projectId}/episodes/${selectedEpisodeId}/scenes/${scene.id}`}>
                  <div className="rounded-xl border overflow-hidden transition-all hover:shadow-md" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    {/* Frame area */}
                    <div className="h-36 flex items-center justify-center relative border-b" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}>
                      {scene.assets?.storyboardFrames?.[0] ? (
                        <div className="p-3 text-center">
                          <p className="text-xs leading-relaxed line-clamp-4" style={{ color: 'var(--color-text-sub)' }}>
                            {scene.assets.storyboardFrames[0].description}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: 'var(--color-text-sub)', opacity: 0.5 }}>스토리보드 미생성</p>
                      )}
                      <div className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
                        <span className="text-xs font-bold" style={{ color: 'var(--color-primary-dark)' }}>S{scene.number}</span>
                      </div>
                      {scene.isAITransformScene && (
                        <div className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-primary)', color: 'var(--color-primary-dark)' }}>✦</div>
                      )}
                    </div>

                    <div className="p-3">
                      {/* Title + timecode */}
                      <p className="text-xs font-medium mb-1 truncate" style={{ color: 'var(--color-text)' }}>{scene.title}</p>
                      <p className="text-xs mb-2" style={{ color: 'var(--color-text-sub)' }}>{scene.timeStart}~{scene.timeEnd} · {TIME_OF_DAY_LABELS[scene.timeOfDay]}</p>

                      {/* Key dialogue */}
                      {scene.dialogues[0] ? (
                        <p className="text-xs italic line-clamp-1 mb-2" style={{ color: 'var(--color-text-sub)' }}>
                          "{scene.dialogues[0].line}"
                        </p>
                      ) : scene.actionDescription ? (
                        <p className="text-xs line-clamp-1 mb-2" style={{ color: 'var(--color-text-sub)' }}>
                          {scene.actionDescription.substring(0, 30)}
                        </p>
                      ) : null}

                      {/* Emotion tags */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {scene.emotionKeywords.slice(0, 3).map(k => (
                          <span key={k} className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-accent)', color: 'var(--color-primary-dark)' }}>{k}</span>
                        ))}
                      </div>

                      {/* AI status badge */}
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border', status.color)}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}

      {scenes.length === 0 && !isLoading && (
        <div className="text-center py-16" style={{ color: 'var(--color-text-sub)' }}>씬이 없습니다.</div>
      )}
    </div>
  )
}
