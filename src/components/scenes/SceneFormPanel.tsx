'use client'

import { useState } from 'react'
import { Scene, Character, Dialogue } from '@/types'
import { updateScene } from '@/lib/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, Save, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  scene: Scene
  characters: Character[]
  projectId: string
  episodeId: string
  sceneId: string
  onUpdate: (scene: Scene) => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-accent border border-border text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500 transition-colors"
const selectCls = "w-full px-3 py-2 rounded-lg bg-accent border border-border text-white text-sm focus:outline-none focus:border-purple-500"

export function SceneFormPanel({ scene, characters, projectId, episodeId, sceneId, onUpdate }: Props) {
  const [form, setForm] = useState(scene)
  const [saving, setSaving] = useState(false)
  const [emotionInput, setEmotionInput] = useState('')
  const queryClient = useQueryClient()

  function set(key: keyof Scene, value: any) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      await updateScene(projectId, episodeId, sceneId, form)
      queryClient.invalidateQueries({ queryKey: ['scene', projectId, episodeId, sceneId] })
      onUpdate(form)
      toast.success('씬이 저장되었습니다.')
    } catch (e: any) {
      toast.error('저장 실패: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  function addEmotionKeyword() {
    if (!emotionInput.trim()) return
    const keywords = emotionInput.split(',').map(k => k.trim()).filter(Boolean)
    set('emotionKeywords', [...form.emotionKeywords, ...keywords])
    setEmotionInput('')
  }

  function addDialogue() {
    const newDialogue: Dialogue = {
      characterId: '',
      characterName: '',
      line: '',
      emotion: '',
      direction: '',
    }
    set('dialogues', [...form.dialogues, newDialogue])
  }

  function updateDialogue(index: number, field: keyof Dialogue, value: string) {
    const updated = form.dialogues.map((d, i) => {
      if (i !== index) return d
      if (field === 'characterId') {
        const char = characters.find(c => c.id === value)
        return { ...d, characterId: value, characterName: char?.name || '' }
      }
      return { ...d, [field]: value }
    })
    set('dialogues', updated)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded">S{form.number}</span>
          <span className="text-sm font-medium text-white">{form.title}</span>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors disabled:opacity-60"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Basic info */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">기본 정보</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <Field label="씬 번호">
                <input type="number" value={form.number} onChange={e => set('number', Number(e.target.value))} className={inputCls} />
              </Field>
              <div className="col-span-3">
                <Field label="씬 제목">
                  <input value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} />
                </Field>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="장소">
                <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="병원 대기실" className={inputCls} />
              </Field>
              <Field label="시작">
                <input value={form.timeStart} onChange={e => set('timeStart', e.target.value)} placeholder="00:00" className={inputCls} />
              </Field>
              <Field label="종료">
                <input value={form.timeEnd} onChange={e => set('timeEnd', e.target.value)} placeholder="00:30" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="시간대">
                <select value={form.timeOfDay} onChange={e => set('timeOfDay', e.target.value as any)} className={selectCls}>
                  <option value="morning">아침</option>
                  <option value="afternoon">낮</option>
                  <option value="evening">저녁</option>
                  <option value="night">밤</option>
                  <option value="interior">실내</option>
                </select>
              </Field>
              <Field label="날씨">
                <input value={form.weather || ''} onChange={e => set('weather', e.target.value)} placeholder="맑음, 비, 눈..." className={inputCls} />
              </Field>
            </div>
          </div>
        </section>

        {/* Characters */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">등장 캐릭터</h3>
          <div className="flex flex-wrap gap-2">
            {characters.map(char => (
              <button
                key={char.id}
                onClick={() => {
                  const ids = form.characters.includes(char.id)
                    ? form.characters.filter(id => id !== char.id)
                    : [...form.characters, char.id]
                  set('characters', ids)
                }}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  form.characters.includes(char.id)
                    ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                    : 'bg-accent text-muted-foreground border border-border hover:text-white'
                )}
              >
                {form.characters.includes(char.id) && <span>✓</span>}
                {char.name}
              </button>
            ))}
            {characters.length === 0 && (
              <p className="text-xs text-muted-foreground">캐릭터가 없습니다. 프로젝트에서 캐릭터를 먼저 추가하세요.</p>
            )}
          </div>
        </section>

        {/* Camera */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">카메라</h3>
          <div className="grid grid-cols-2 gap-2">
            <Field label="카메라 무브먼트">
              <select value={form.cameraMovement} onChange={e => set('cameraMovement', e.target.value as any)} className={selectCls}>
                <option value="static">고정</option>
                <option value="pan">팬</option>
                <option value="tilt">틸트</option>
                <option value="zoom_in">줌인</option>
                <option value="zoom_out">줌아웃</option>
                <option value="tracking">트래킹</option>
                <option value="crane">크레인</option>
              </select>
            </Field>
            <Field label="카메라 앵글">
              <select value={form.cameraAngle} onChange={e => set('cameraAngle', e.target.value as any)} className={selectCls}>
                <option value="eye_level">아이레벨</option>
                <option value="high_angle">하이앵글</option>
                <option value="low_angle">로우앵글</option>
                <option value="birds_eye">조감</option>
                <option value="dutch">더치앵글</option>
              </select>
            </Field>
            <Field label="조명">
              <input value={form.lighting} onChange={e => set('lighting', e.target.value)} placeholder="부드러운 자연광" className={inputCls} />
            </Field>
            <Field label="색보정">
              <input value={form.colorGrade} onChange={e => set('colorGrade', e.target.value)} placeholder="웜톤 파스텔" className={inputCls} />
            </Field>
          </div>
        </section>

        {/* Emotion keywords */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">감정 키워드</h3>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.emotionKeywords.map((k, i) => (
              <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-pink-500/20 text-pink-400">
                {k}
                <button onClick={() => set('emotionKeywords', form.emotionKeywords.filter((_, j) => j !== i))}>×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={emotionInput}
              onChange={e => setEmotionInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEmotionKeyword())}
              placeholder="감정 키워드 입력 후 Enter"
              className={`${inputCls} flex-1`}
            />
            <button onClick={addEmotionKeyword} className="px-3 py-2 rounded-lg bg-accent border border-border text-muted-foreground hover:text-white text-sm">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Background */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">씬 묘사</h3>
          <div className="space-y-3">
            <Field label="배경 묘사">
              <textarea
                value={form.backgroundDescription}
                onChange={e => set('backgroundDescription', e.target.value)}
                rows={3}
                placeholder="배경 상세 묘사..."
                className={`${inputCls} resize-none`}
              />
            </Field>
            <Field label="액션 (화면 지문)">
              <textarea
                value={form.actionDescription}
                onChange={e => set('actionDescription', e.target.value)}
                rows={3}
                placeholder="씬에서 일어나는 일..."
                className={`${inputCls} resize-none`}
              />
            </Field>
          </div>
        </section>

        {/* Dialogues */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">대사</h3>
            <button onClick={addDialogue} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
              <Plus className="w-3.5 h-3.5" />추가
            </button>
          </div>
          <div className="space-y-3">
            {form.dialogues.map((d, i) => (
              <div key={i} className="p-3 rounded-xl border border-border bg-accent/30 space-y-2">
                <div className="flex items-center justify-between">
                  <select
                    value={d.characterId}
                    onChange={e => updateDialogue(i, 'characterId', e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-accent border border-border text-white text-xs focus:outline-none"
                  >
                    <option value="">캐릭터 선택</option>
                    {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={() => set('dialogues', form.dialogues.filter((_, j) => j !== i))} className="ml-2 p-1 hover:text-red-400 text-muted-foreground">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  value={d.line}
                  onChange={e => updateDialogue(i, 'line', e.target.value)}
                  placeholder="대사..."
                  rows={2}
                  className="w-full px-2 py-1.5 rounded-lg bg-accent border border-border text-white text-xs resize-none focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={d.emotion}
                    onChange={e => updateDialogue(i, 'emotion', e.target.value)}
                    placeholder="감정 (슬픔, 기쁨...)"
                    className="px-2 py-1.5 rounded-lg bg-accent border border-border text-white text-xs focus:outline-none"
                  />
                  <input
                    value={d.direction}
                    onChange={e => updateDialogue(i, 'direction', e.target.value)}
                    placeholder="연기 지시 (조용히...)"
                    className="px-2 py-1.5 rounded-lg bg-accent border border-border text-white text-xs focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sound & Director note */}
        <section>
          <div className="space-y-3">
            <Field label="사운드 디자인 / BGM">
              <input value={form.soundDesign} onChange={e => set('soundDesign', e.target.value)} placeholder="잔잔한 피아노 BGM..." className={inputCls} />
            </Field>
            <Field label="감독 노트">
              <textarea value={form.directorNote} onChange={e => set('directorNote', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
            </Field>
          </div>
        </section>

        {/* AI Transform Toggle */}
        <section>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-purple-500/30 bg-purple-500/5">
            <input
              type="checkbox"
              id="isTransform"
              checked={form.isAITransformScene}
              onChange={e => set('isAITransformScene', e.target.checked)}
              className="w-4 h-4 accent-purple-600"
            />
            <label htmlFor="isTransform" className="flex items-center gap-1.5 text-sm text-white cursor-pointer">
              <Zap className="w-4 h-4 text-purple-400" />AI 변환 씬
            </label>
          </div>

          {form.isAITransformScene && (
            <div className="mt-3 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-3">
              <Field label="변환 트리거 순간">
                <input value={form.transform?.triggerMoment || ''} onChange={e => set('transform', { ...form.transform, triggerMoment: e.target.value })} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="변환 전 상태">
                  <input value={form.transform?.stateBefore || ''} onChange={e => set('transform', { ...form.transform, stateBefore: e.target.value })} className={inputCls} />
                </Field>
                <Field label="변환 후 상태">
                  <input value={form.transform?.stateAfter || ''} onChange={e => set('transform', { ...form.transform, stateAfter: e.target.value })} className={inputCls} />
                </Field>
              </div>
              <Field label="변환 방식">
                <input value={form.transform?.transitionStyle || ''} onChange={e => set('transform', { ...form.transform, transitionStyle: e.target.value })} className={inputCls} />
              </Field>
              <Field label="변환 소요 시간">
                <input value={form.transform?.duration || ''} onChange={e => set('transform', { ...form.transform, duration: e.target.value })} className={inputCls} />
              </Field>
            </div>
          )}
        </section>

        {/* Status */}
        <section className="pb-6">
          <Field label="씬 상태">
            <select value={form.status} onChange={e => set('status', e.target.value as any)} className={selectCls}>
              <option value="draft">초안</option>
              <option value="inprogress">작업 중</option>
              <option value="review">검토 중</option>
              <option value="final">최종</option>
            </select>
          </Field>
        </section>
      </div>
    </div>
  )
}
