'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getScenes, getEpisode } from '@/lib/firestore'
import { Scene } from '@/types'
import { motion } from 'framer-motion'
import { useState, useRef } from 'react'
import { Printer, Download, BarChart2 } from 'lucide-react'
import { cn, SCENE_STATUS_LABELS, TIME_OF_DAY_LABELS } from '@/lib/utils'
import Link from 'next/link'

const EMOTION_INTENSITY: Record<string, number> = {
  '기쁨': 8, '슬픔': 4, '분노': 9, '두려움': 3, '놀람': 7, '혐오': 2,
  '설렘': 8, '불안': 4, '희망': 7, '절망': 2, '해소': 6, '치유': 7,
  '억눌림': 3, '평온': 5,
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

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  inprogress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  final: 'bg-green-500/20 text-green-400 border-green-500/30',
}

function EmotionCurve({ scenes }: { scenes: Scene[] }) {
  if (scenes.length === 0) return null
  const scores = scenes.map(s => getEmotionScore(s.emotionKeywords))
  const maxScore = 10
  const height = 80
  const width = Math.max(scenes.length * 60, 300)

  const points = scores.map((score, i) => {
    const x = (i / Math.max(scenes.length - 1, 1)) * (width - 40) + 20
    const y = height - (score / maxScore) * (height - 10) - 5
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="p-5 rounded-xl border border-border bg-card mb-6 overflow-x-auto">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-medium text-white">감정 흐름 곡선</h3>
      </div>
      <div style={{ minWidth: width + 40 }}>
        <svg width={width} height={height + 20} className="overflow-visible">
          {/* Grid lines */}
          {[2, 4, 6, 8, 10].map(v => (
            <line key={v}
              x1={20} y1={height - (v / maxScore) * (height - 10) - 5}
              x2={width - 20} y2={height - (v / maxScore) * (height - 10) - 5}
              stroke="hsl(216 34% 17%)" strokeWidth={1}
            />
          ))}
          {/* Curve */}
          <polyline points={points} fill="none" stroke="url(#gradient)" strokeWidth={2.5} strokeLinejoin="round" />
          {/* Gradient */}
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          {/* Data points */}
          {scores.map((score, i) => {
            const x = (i / Math.max(scenes.length - 1, 1)) * (width - 40) + 20
            const y = height - (score / maxScore) * (height - 10) - 5
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={4} fill="#8b5cf6" />
                <text x={x} y={height + 15} textAnchor="middle" fontSize={9} fill="#6b7280">S{scenes[i].number}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export default function StoryboardPage() {
  const { projectId, episodeId } = useParams<{ projectId: string; episodeId: string }>()
  const printRef = useRef<HTMLDivElement>(null)

  const { data: episode } = useQuery({
    queryKey: ['episode', projectId, episodeId],
    queryFn: () => getEpisode(projectId, episodeId),
    enabled: !!episodeId,
  })

  const { data: scenes = [], isLoading } = useQuery({
    queryKey: ['scenes', projectId, episodeId],
    queryFn: () => getScenes(projectId, episodeId),
    enabled: !!episodeId,
  })

  function handlePrint() {
    window.print()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">스토리보드</h1>
          {episode && <p className="text-sm text-muted-foreground mt-0.5">EP.{episode.number} — {episode.title}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-white hover:bg-accent text-sm transition-colors">
            <Printer className="w-4 h-4" />인쇄
          </button>
        </div>
      </div>

      {/* Emotion curve */}
      {scenes.length > 1 && <EmotionCurve scenes={scenes} />}

      {/* Scene cards timeline */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1,2,3,4].map(i => <div key={i} className="w-64 h-72 rounded-xl bg-card border border-border animate-pulse shrink-0" />)}
        </div>
      ) : (
        <div ref={printRef}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {scenes.map((scene, i) => (
              <motion.div
                key={scene.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="w-64 shrink-0"
              >
                <Link href={`/projects/${projectId}/episodes/${episodeId}/scenes/${scene.id}`}>
                  <div className="rounded-xl border border-border bg-card hover:border-purple-500/40 transition-colors overflow-hidden">
                    {/* Storyboard frame area */}
                    <div className="h-36 bg-accent/50 flex items-center justify-center relative border-b border-border">
                      {scene.assets?.storyboardFrames?.[0] ? (
                        <div className="p-3 text-center">
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                            {scene.assets.storyboardFrames[0].description}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground/40">스토리보드 미생성</p>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center">
                        <span className="text-xs font-bold text-cyan-400">S{scene.number}</span>
                      </div>
                      {scene.isAITransformScene && (
                        <div className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-400">✦</div>
                      )}
                    </div>

                    <div className="p-3">
                      <p className="text-xs font-medium text-white mb-1 truncate">{scene.title}</p>
                      <p className="text-xs text-muted-foreground mb-2">{scene.timeStart}~{scene.timeEnd} · {TIME_OF_DAY_LABELS[scene.timeOfDay]}</p>

                      {/* Key dialogue */}
                      {scene.dialogues[0] && (
                        <p className="text-xs text-muted-foreground/80 italic line-clamp-2 mb-2">
                          "{scene.dialogues[0].line}"
                        </p>
                      )}

                      {/* Emotion tags */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {scene.emotionKeywords.slice(0, 2).map(k => (
                          <span key={k} className="text-xs px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400">{k}</span>
                        ))}
                      </div>

                      <span className={cn('text-xs px-2 py-0.5 rounded-full border', STATUS_COLORS[scene.status])}>
                        {SCENE_STATUS_LABELS[scene.status]}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {scenes.length === 0 && !isLoading && (
        <div className="text-center py-16 text-muted-foreground">씬이 없습니다.</div>
      )}
    </div>
  )
}
