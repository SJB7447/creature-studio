'use client'

import { Scene } from '@/types'
import { CAMERA_ANGLE_LABELS, CAMERA_MOVEMENT_LABELS, TIME_OF_DAY_LABELS } from '@/lib/utils'
import { Camera, MapPin, Clock, Music, Lightbulb, Zap } from 'lucide-react'

interface Props {
  scene: Scene
  projectId: string
  episodeId: string
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="p-5 border-b border-border">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
        <h3 className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex gap-3 text-sm py-1">
      <span className="w-28 shrink-0" style={{ color: 'var(--color-text-sub)' }}>{label}</span>
      <span style={{ color: 'var(--color-text)' }}>{value}</span>
    </div>
  )
}

export function SceneInfoPanel({ scene }: Props) {
  return (
    <div className="divide-y divide-border">
      {/* Location & Time */}
      <Section title="장소 / 시간" icon={MapPin}>
        <div className="grid grid-cols-2 gap-x-8">
          <InfoRow label="장소" value={scene.location} />
          <InfoRow label="시간대" value={TIME_OF_DAY_LABELS[scene.timeOfDay]} />
          <InfoRow label="시작" value={scene.timeStart} />
          <InfoRow label="종료" value={scene.timeEnd} />
          {scene.weather && <InfoRow label="날씨" value={scene.weather} />}
        </div>
      </Section>

      {/* Camera */}
      <Section title="카메라" icon={Camera}>
        <div className="grid grid-cols-2 gap-x-8">
          <InfoRow label="무브먼트" value={CAMERA_MOVEMENT_LABELS[scene.cameraMovement]} />
          <InfoRow label="앵글" value={CAMERA_ANGLE_LABELS[scene.cameraAngle]} />
          <InfoRow label="조명" value={scene.lighting} />
          <InfoRow label="색보정" value={scene.colorGrade} />
        </div>
      </Section>

      {/* Emotion keywords */}
      {scene.emotionKeywords.length > 0 && (
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm" style={{ color: 'var(--color-text-sub)' }}>감정 키워드</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {scene.emotionKeywords.map(k => (
              <span key={k} className="text-xs px-2 py-1 rounded-full bg-pink-500/20 text-pink-400">{k}</span>
            ))}
          </div>
        </div>
      )}

      {/* Background */}
      {scene.backgroundDescription && (
        <div className="p-5 border-b border-border">
          <p className="text-xs mb-2" style={{ color: 'var(--color-text-sub)' }}>배경 묘사</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{scene.backgroundDescription}</p>
        </div>
      )}

      {/* Action */}
      {scene.actionDescription && (
        <div className="p-5 border-b border-border">
          <p className="text-xs mb-2" style={{ color: 'var(--color-text-sub)' }}>액션 (화면 지문)</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{scene.actionDescription}</p>
        </div>
      )}

      {/* Dialogues */}
      {scene.dialogues.length > 0 && (
        <div className="p-5 border-b border-border">
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-sub)' }}>대사</p>
          <div className="space-y-3">
            {scene.dialogues.map((d, i) => (
              <div key={i} className="p-3 rounded-lg bg-accent/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-blue-400">{d.characterName}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-sub)' }}>({d.emotion})</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--color-text)' }}>"{d.line}"</p>
                {d.direction && (
                  <p className="text-xs mt-1 italic" style={{ color: 'var(--color-text-sub)' }}>[{d.direction}]</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sound */}
      {scene.soundDesign && (
        <Section title="사운드 디자인" icon={Music}>
          <p className="text-sm" style={{ color: 'var(--color-text)' }}>{scene.soundDesign}</p>
        </Section>
      )}

      {/* Director note */}
      {scene.directorNote && (
        <Section title="연출 노트" icon={Lightbulb}>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{scene.directorNote}</p>
        </Section>
      )}

      {/* AI Transform */}
      {scene.isAITransformScene && scene.transform && (
        <Section title="AI 변환 씬 설정" icon={Zap}>
          <div className="space-y-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <InfoRow label="트리거" value={scene.transform.triggerMoment} />
            <InfoRow label="변환 전" value={scene.transform.stateBefore} />
            <InfoRow label="변환 후" value={scene.transform.stateAfter} />
            <InfoRow label="방식" value={scene.transform.transitionStyle} />
            <InfoRow label="소요 시간" value={scene.transform.duration} />
          </div>
        </Section>
      )}
    </div>
  )
}
