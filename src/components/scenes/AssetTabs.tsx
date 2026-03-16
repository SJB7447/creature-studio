'use client'

import { Scene } from '@/types'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Copy, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

type AssetTab = 'script' | 'image' | 'video' | 'storyboard' | 'analysis'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('클립보드에 복사되었습니다.')
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-md hover:bg-accent transition-colors">
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" style={{ color: 'var(--color-text-sub)' }} />}
    </button>
  )
}

function CodeBlock({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-sub)' }}>{label}</span>
        <CopyButton text={value} />
      </div>
      <div className="p-3 rounded-lg bg-accent/50 border border-border">
        <p className="text-sm whitespace-pre-wrap leading-relaxed font-mono text-xs" style={{ color: 'var(--color-text)' }}>{value}</p>
      </div>
    </div>
  )
}

export function AssetTabs({ scene }: { scene: Scene }) {
  const { assets } = scene
  const [activeTab, setActiveTab] = useState<AssetTab>('script')

  const tabs: { id: AssetTab; label: string; available: boolean }[] = [
    { id: 'script', label: '연출 스크립트', available: !!assets.directorScript },
    { id: 'image', label: '이미지 프롬프트', available: !!assets.imagePrompt },
    { id: 'video', label: '영상 프롬프트', available: !!assets.videoPrompt },
    { id: 'storyboard', label: '스토리보드', available: !!(assets.storyboardFrames?.length) },
    { id: 'analysis', label: '품질 검수', available: !!assets.agentAnalysis },
  ]

  const hasAnyAsset = tabs.some(t => t.available)

  if (!hasAnyAsset) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4">
          <svg className="w-7 h-7" style={{ color: 'var(--color-text-sub)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>아직 생성된 에셋이 없습니다.</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-sub)' }}>AI 에이전트 탭에서 에셋을 생성해보세요.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Tab strip */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-accent/30 border border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => tab.available && setActiveTab(tab.id)}
            className={cn(
              'flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors',
              tab.available
                ? activeTab === tab.id
                  ? 'shadow'
                  : 'hover:opacity-80'
                : 'opacity-30 cursor-not-allowed'
            )}
            style={
              tab.available
                ? activeTab === tab.id
                  ? { background: 'var(--color-surface)', color: 'var(--color-text)' }
                  : { color: 'var(--color-text-sub)' }
                : { color: 'var(--color-text-sub)' }
            }
          >
            {tab.label}
            {!tab.available && <span className="ml-1" style={{ color: 'var(--color-text-sub)', opacity: 0.3 }}>—</span>}
          </button>
        ))}
      </div>

      {/* Director Script */}
      {activeTab === 'script' && assets.directorScript && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>연출 스크립트</h3>
            <CopyButton text={assets.directorScript} />
          </div>
          <div className="p-4 rounded-xl bg-accent/30 border border-border">
            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-text)' }}>{assets.directorScript}</p>
          </div>
        </div>
      )}

      {/* Image Prompts */}
      {activeTab === 'image' && assets.imagePrompt && (
        <div>
          <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--color-text)' }}>이미지 프롬프트</h3>
          <CodeBlock label="기본 프롬프트" value={assets.imagePrompt.base} />
          <CodeBlock label="Midjourney (파라미터 포함)" value={assets.imagePrompt.midjourney} />
          <CodeBlock label="Google Imagen" value={assets.imagePrompt.imagen} />
          <CodeBlock label="네거티브 프롬프트" value={assets.imagePrompt.negativePrompt} />
        </div>
      )}

      {/* Video Prompts */}
      {activeTab === 'video' && assets.videoPrompt && (
        <div>
          <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--color-text)' }}>영상 프롬프트</h3>
          <CodeBlock label="Google Veo 2" value={assets.videoPrompt.veo} />
          <CodeBlock label="OpenAI Sora" value={assets.videoPrompt.sora} />
          <CodeBlock label="Runway Gen-3" value={assets.videoPrompt.runway} />
        </div>
      )}

      {/* Storyboard */}
      {activeTab === 'storyboard' && assets.storyboardFrames && (
        <div>
          <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--color-text)' }}>
            스토리보드 프레임 ({assets.storyboardFrames.length}컷)
          </h3>
          <div className="space-y-4">
            {assets.storyboardFrames.map((frame, i) => (
              <div key={i} className="p-4 rounded-xl border border-border" style={{ background: 'var(--color-surface)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">
                    {frame.frameNumber}
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>프레임 {frame.frameNumber}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-xs" style={{ color: 'var(--color-text-sub)' }}>묘사</span>
                    <p className="mt-0.5" style={{ color: 'var(--color-text)' }}>{frame.description}</p>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: 'var(--color-text-sub)' }}>카메라</span>
                    <p className="mt-0.5" style={{ color: 'var(--color-text)' }}>{frame.cameraNote}</p>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: 'var(--color-text-sub)' }}>레이아웃</span>
                    <p className="mt-0.5" style={{ color: 'var(--color-text)' }}>{frame.layout}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis */}
      {activeTab === 'analysis' && assets.agentAnalysis && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>품질 검수 리포트</h3>
            <CopyButton text={assets.agentAnalysis} />
          </div>
          <div className="p-4 rounded-xl bg-accent/30 border border-border">
            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-text)' }}>{assets.agentAnalysis}</p>
          </div>
        </div>
      )}
    </div>
  )
}
