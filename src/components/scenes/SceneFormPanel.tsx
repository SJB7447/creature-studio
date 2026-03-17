'use client'

import { useState, KeyboardEvent } from 'react'
import { Scene, Character, Dialogue } from '@/types'
import { Plus, Trash2, Zap, GripVertical, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReferenceUploadButton from '@/components/common/ReferenceUploadButton'

interface Props {
  scene: Scene
  characters: Character[]
  onUpdate: (scene: Scene) => void
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-sub)' }}>{children}</h3>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors"
const inputStyle = { background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }
const selectStyle = { ...inputStyle }

function TagInputInline({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('')
  function add(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = input.trim().replace(/,$/, '')
      if (val && !tags.includes(val)) onChange([...tags, val])
      setInput('')
    }
  }
  return (
    <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border min-h-[38px]" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {tags.map(t => (
        <span key={t} className="tag-chip" style={{ background: 'var(--color-accent)', color: 'var(--color-primary-dark)' }}>
          {t}
          <button onClick={() => onChange(tags.filter(x => x !== t))}><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input
        value={input} onChange={e => setInput(e.target.value)} onKeyDown={add}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[80px] text-xs bg-transparent outline-none"
        style={{ color: 'var(--color-text)' }}
      />
    </div>
  )
}

export function SceneFormPanel({ scene, characters, onUpdate }: Props) {
  const [form, setForm] = useState(scene)

  function set<K extends keyof Scene>(key: K, value: Scene[K]) {
    const updated = { ...form, [key]: value }
    setForm(updated)
    onUpdate(updated)
  }

  function addDialogue() {
    const d: Dialogue = { characterId: '', characterName: '', line: '', emotion: '', direction: '' }
    set('dialogues', [...form.dialogues, d])
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

  function removeDialogue(index: number) {
    set('dialogues', form.dialogues.filter((_, i) => i !== index))
  }

  function moveDialogue(from: number, to: number) {
    if (to < 0 || to >= form.dialogues.length) return
    const arr = [...form.dialogues]
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    set('dialogues', arr)
  }

  return (
    <div className="p-5 space-y-6">
      {/* 섹션 1: 씬 기본 */}
      <section>
        <SectionTitle>씬 기본</SectionTitle>
        <div className="space-y-3">
          <div className="grid grid-cols-[70px_1fr] gap-2">
            <Field label="번호">
              <input type="number" value={form.number} onChange={e => set('number', Number(e.target.value))} className={inputCls} style={inputStyle} />
            </Field>
            <Field label="제목">
              <input value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} style={inputStyle} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="시작 타임코드">
              <input value={form.timeStart} onChange={e => set('timeStart', e.target.value)} placeholder="0:00" className={inputCls} style={inputStyle} />
            </Field>
            <Field label="종료 타임코드">
              <input value={form.timeEnd} onChange={e => set('timeEnd', e.target.value)} placeholder="0:30" className={inputCls} style={inputStyle} />
            </Field>
          </div>
        </div>
      </section>

      {/* 섹션 2: 장소/환경 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>장소 / 환경</SectionTitle>
          <ReferenceUploadButton
            contextType="background"
            compact
            label="배경 레퍼런스"
            onResult={(data) => {
              if (data.location) set('location', data.location)
              if (data.backgroundDescription) set('backgroundDescription', data.backgroundDescription)
              if (data.lighting) set('lighting', data.lighting)
              if (data.colorGrade) set('colorGrade', data.colorGrade)
              if (data.timeOfDay) set('timeOfDay', data.timeOfDay)
              if (data.weather) set('weather', data.weather)
            }}
          />
        </div>
        <div className="space-y-3">
          <Field label="장소명">
            <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="상상동물병원 진료실" className={inputCls} style={inputStyle} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="시간대">
              <select value={form.timeOfDay} onChange={e => set('timeOfDay', e.target.value as any)} className={inputCls} style={selectStyle}>
                <option value="morning">아침</option>
                <option value="afternoon">낮</option>
                <option value="evening">저녁</option>
                <option value="night">밤</option>
                <option value="interior">실내</option>
              </select>
            </Field>
            <Field label="날씨 (선택)">
              <input value={form.weather || ''} onChange={e => set('weather', e.target.value)} placeholder="맑음, 비..." className={inputCls} style={inputStyle} />
            </Field>
          </div>
        </div>
      </section>

      {/* 섹션 3: 연출 */}
      <section>
        <SectionTitle>연출</SectionTitle>
        <div className="space-y-3">
          {/* Characters */}
          <Field label="등장 캐릭터">
            <div className="flex flex-wrap gap-1.5">
              {characters.map(char => (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => {
                    const ids = form.characters.includes(char.id)
                      ? form.characters.filter(id => id !== char.id)
                      : [...form.characters, char.id]
                    set('characters', ids)
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                  style={{
                    borderColor: form.characters.includes(char.id) ? 'var(--color-primary-dark)' : 'var(--color-border)',
                    background: form.characters.includes(char.id) ? '#EDE9FE' : 'var(--color-surface)',
                    color: form.characters.includes(char.id) ? 'var(--color-primary-dark)' : 'var(--color-text-sub)',
                  }}
                >
                  {form.characters.includes(char.id) && '✓ '}{char.name}
                </button>
              ))}
              {characters.length === 0 && <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>캐릭터가 없습니다.</p>}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="카메라 무빙">
              <select value={form.cameraMovement} onChange={e => set('cameraMovement', e.target.value as any)} className={inputCls} style={selectStyle}>
                <option value="static">고정</option><option value="pan">팬</option><option value="tilt">틸트</option>
                <option value="zoom_in">줌인</option><option value="zoom_out">줌아웃</option>
                <option value="tracking">트래킹</option><option value="crane">크레인</option>
              </select>
            </Field>
            <Field label="카메라 앵글">
              <select value={form.cameraAngle} onChange={e => set('cameraAngle', e.target.value as any)} className={inputCls} style={selectStyle}>
                <option value="eye_level">아이레벨</option><option value="high_angle">하이앵글</option>
                <option value="low_angle">로우앵글</option><option value="birds_eye">조감</option><option value="dutch">더치앵글</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="조명">
              <input value={form.lighting} onChange={e => set('lighting', e.target.value)} placeholder="부드러운 자연광" className={inputCls} style={inputStyle} />
            </Field>
            <Field label="색 그레이딩">
              <input value={form.colorGrade} onChange={e => set('colorGrade', e.target.value)} placeholder="웜톤 파스텔" className={inputCls} style={inputStyle} />
            </Field>
          </div>
        </div>
      </section>

      {/* 섹션 4: 내용 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>내용</SectionTitle>
          <ReferenceUploadButton
            contextType="scene"
            compact
            label="씬 레퍼런스"
            onResult={(data) => {
              if (data.backgroundDescription) set('backgroundDescription', data.backgroundDescription)
              if (data.actionDescription) set('actionDescription', data.actionDescription)
              if (data.emotionKeywords) {
                const keywords = typeof data.emotionKeywords === 'string'
                  ? data.emotionKeywords.split(',').map((s: string) => s.trim()).filter(Boolean)
                  : data.emotionKeywords
                set('emotionKeywords', keywords)
              }
              if (data.cameraMovement) set('cameraMovement', data.cameraMovement)
              if (data.cameraAngle) set('cameraAngle', data.cameraAngle)
              if (data.lighting) set('lighting', data.lighting)
              if (data.colorGrade) set('colorGrade', data.colorGrade)
              if (data.soundDesign) set('soundDesign', data.soundDesign)
              if (data.directorNote) set('directorNote', data.directorNote)
            }}
          />
        </div>
        <div className="space-y-3">
          <Field label="감정 키워드">
            <TagInputInline tags={form.emotionKeywords} onChange={t => set('emotionKeywords', t)} placeholder="감정 키워드 입력 후 Enter" />
          </Field>
          <Field label="배경 묘사">
            <textarea value={form.backgroundDescription} onChange={e => set('backgroundDescription', e.target.value)} rows={3} placeholder="배경 상세 묘사..." className={`${inputCls} resize-none`} style={inputStyle} />
          </Field>
          <Field label="액션 묘사">
            <textarea value={form.actionDescription} onChange={e => set('actionDescription', e.target.value)} rows={3} placeholder="씬에서 일어나는 일..." className={`${inputCls} resize-none`} style={inputStyle} />
          </Field>
        </div>
      </section>

      {/* 섹션 5: 대사 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>대사</SectionTitle>
          <button type="button" onClick={addDialogue} className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-primary-dark)' }}>
            <Plus className="w-3.5 h-3.5" />추가
          </button>
        </div>
        <div className="space-y-3">
          {form.dialogues.map((d, i) => (
            <div key={i} className="p-3 rounded-xl border space-y-2" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                {/* Drag handle (visual only for now) */}
                <div className="flex flex-col gap-0.5 cursor-grab" style={{ color: 'var(--color-text-sub)' }}>
                  <button type="button" onClick={() => moveDialogue(i, i - 1)} className="hover:text-[var(--color-text)]">▲</button>
                  <button type="button" onClick={() => moveDialogue(i, i + 1)} className="hover:text-[var(--color-text)]">▼</button>
                </div>
                <select
                  value={d.characterId}
                  onChange={e => updateDialogue(i, 'characterId', e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg border text-xs"
                  style={selectStyle}
                >
                  <option value="">캐릭터 선택</option>
                  {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" onClick={() => removeDialogue(i)} className="p-1 hover:text-red-500" style={{ color: 'var(--color-text-sub)' }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                value={d.line} onChange={e => updateDialogue(i, 'line', e.target.value)}
                placeholder="대사..." rows={2}
                className="w-full px-2.5 py-1.5 rounded-lg border text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                style={inputStyle}
              />
              <div className="grid grid-cols-2 gap-2">
                <input value={d.emotion} onChange={e => updateDialogue(i, 'emotion', e.target.value)} placeholder="감정" className="px-2 py-1.5 rounded-lg border text-xs focus:outline-none" style={inputStyle} />
                <input value={d.direction} onChange={e => updateDialogue(i, 'direction', e.target.value)} placeholder="연기 지시" className="px-2 py-1.5 rounded-lg border text-xs focus:outline-none" style={inputStyle} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 섹션 6: 음향/감독 노트 */}
      <section>
        <SectionTitle>음향 / 감독 노트</SectionTitle>
        <div className="space-y-3">
          <Field label="음향/BGM 지시">
            <textarea value={form.soundDesign} onChange={e => set('soundDesign', e.target.value)} rows={2} placeholder="잔잔한 피아노 BGM..." className={`${inputCls} resize-none`} style={inputStyle} />
          </Field>
          <Field label="감독 노트">
            <textarea value={form.directorNote} onChange={e => set('directorNote', e.target.value)} rows={2} placeholder="연출 참고 사항..." className={`${inputCls} resize-none`} style={inputStyle} />
          </Field>
        </div>
      </section>

      {/* 섹션 7: AI 변환 씬 */}
      <section className="pb-6">
        <SectionTitle>AI 변환 씬</SectionTitle>
        <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: form.isAITransformScene ? '#EDE9FE' : 'var(--color-surface)', borderColor: form.isAITransformScene ? 'var(--color-primary)' : 'var(--color-border)' }}>
          <button
            type="button"
            onClick={() => set('isAITransformScene', !form.isAITransformScene)}
            className={cn('w-10 h-6 rounded-full transition-colors relative', form.isAITransformScene ? 'bg-[var(--color-primary-dark)]' : 'bg-gray-300')}
          >
            <div className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', form.isAITransformScene ? 'translate-x-4' : 'translate-x-0.5')} />
          </button>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--color-text)' }} onClick={() => set('isAITransformScene', !form.isAITransformScene)}>
            <Zap className="w-4 h-4" style={{ color: 'var(--color-primary-dark)' }} />AI 변환 씬 활성화
          </label>
        </div>
        {form.isAITransformScene && (
          <div className="mt-3 p-4 rounded-xl border space-y-3" style={{ background: '#FAF5FF', borderColor: 'var(--color-primary)' }}>
            <Field label="변환 트리거 순간">
              <input value={form.transform?.triggerMoment || ''} onChange={e => set('transform', { ...form.transform, triggerMoment: e.target.value } as any)} className={inputCls} style={inputStyle} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="변환 전">
                <input value={form.transform?.stateBefore || ''} onChange={e => set('transform', { ...form.transform, stateBefore: e.target.value } as any)} className={inputCls} style={inputStyle} />
              </Field>
              <Field label="변환 후">
                <input value={form.transform?.stateAfter || ''} onChange={e => set('transform', { ...form.transform, stateAfter: e.target.value } as any)} className={inputCls} style={inputStyle} />
              </Field>
            </div>
            <Field label="변환 방식">
              <input value={form.transform?.transitionStyle || ''} onChange={e => set('transform', { ...form.transform, transitionStyle: e.target.value } as any)} className={inputCls} style={inputStyle} />
            </Field>
            <Field label="소요 시간">
              <input value={form.transform?.duration || ''} onChange={e => set('transform', { ...form.transform, duration: e.target.value } as any)} className={inputCls} style={inputStyle} />
            </Field>
          </div>
        )}
      </section>
    </div>
  )
}
