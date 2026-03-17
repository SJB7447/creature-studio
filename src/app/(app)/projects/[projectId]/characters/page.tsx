'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCharacters, createCharacter, updateCharacter, deleteCharacter } from '@/lib/firestore'
import { Character, EmotionVariant } from '@/types'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, User, X, Edit3, Sparkles, Copy, CheckCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import ReferenceUploadButton from '@/components/common/ReferenceUploadButton'

interface CharFormData {
  name: string
  nameEn: string
  role: string
  emotionalRole: string
  appearanceBase: string
  styleKeywords: string
  colorScheme: string
  fixedPromptKeywords: string
}

function CharacterModal({
  open, onClose, projectId, editChar,
}: {
  open: boolean; onClose: () => void; projectId: string; editChar?: Character | null
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, getValues } = useForm<CharFormData>({
    defaultValues: editChar ? {
      name: editChar.name,
      nameEn: editChar.nameEn,
      role: editChar.role,
      emotionalRole: editChar.emotionalRole,
      appearanceBase: editChar.appearance.base,
      styleKeywords: editChar.appearance.styleKeywords.join(', '),
      colorScheme: editChar.appearance.colorScheme,
      fixedPromptKeywords: editChar.appearance.fixedPromptKeywords.join(', '),
    } : {},
  })

  const [emotionVariants, setEmotionVariants] = useState<EmotionVariant[]>(editChar?.emotionVariants || [])

  function addVariant() {
    setEmotionVariants(prev => [...prev, { emotion: '', appearanceChange: '', promptAddition: '' }])
  }

  function removeVariant(idx: number) {
    setEmotionVariants(prev => prev.filter((_, i) => i !== idx))
  }

  function updateVariant(idx: number, field: keyof EmotionVariant, value: string) {
    setEmotionVariants(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v))
  }

  const createMutation = useMutation({
    mutationFn: async (data: CharFormData) => {
      const payload = {
        name: data.name,
        nameEn: data.nameEn,
        role: data.role,
        emotionalRole: data.emotionalRole,
        appearance: {
          base: data.appearanceBase,
          styleKeywords: data.styleKeywords.split(',').map(s => s.trim()).filter(Boolean),
          colorScheme: data.colorScheme,
          fixedPromptKeywords: data.fixedPromptKeywords.split(',').map(s => s.trim()).filter(Boolean),
        },
        emotionVariants,
        episodeAppearances: editChar?.episodeAppearances || [],
      }
      if (editChar) {
        await updateCharacter(projectId, editChar.id, payload)
      } else {
        await createCharacter(projectId, payload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters', projectId] })
      toast.success(editChar ? '캐릭터가 수정되었습니다!' : '캐릭터가 추가되었습니다!')
      reset()
      onClose()
    },
    onError: (e: any) => toast.error('저장 실패: ' + e.message),
  })

  if (!open) return null

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" +
    " placeholder:opacity-50"
  const inputStyle = { background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-xl mx-4 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>{editChar ? '캐릭터 편집' : '새 캐릭터 추가'}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70"><X className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} /></button>
          </div>
          <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="p-5 space-y-4">
            {/* Reference upload */}
            <ReferenceUploadButton
              contextType="character"
              label="캐릭터 레퍼런스 이미지/문서 업로드"
              onResult={(data) => {
                if (data.name) reset({ ...getValues(), name: data.name })
                if (data.role) reset({ ...getValues(), role: data.role })
                if (data.emotionalRole) reset({ ...getValues(), emotionalRole: data.emotionalRole })
                if (data.appearanceBase) reset({ ...getValues(), appearanceBase: data.appearanceBase })
                if (data.styleKeywords) {
                  const kw = typeof data.styleKeywords === 'string' ? data.styleKeywords : (data.styleKeywords || []).join(', ')
                  reset({ ...getValues(), styleKeywords: kw })
                }
                if (data.colorScheme) reset({ ...getValues(), colorScheme: data.colorScheme })
                if (data.fixedPromptKeywords) {
                  const kw = typeof data.fixedPromptKeywords === 'string' ? data.fixedPromptKeywords : (data.fixedPromptKeywords || []).join(', ')
                  reset({ ...getValues(), fixedPromptKeywords: kw })
                }
                if (data.emotionVariants && Array.isArray(data.emotionVariants)) {
                  setEmotionVariants(prev => [...prev, ...data.emotionVariants])
                }
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>이름 *</label>
                <input {...register('name', { required: true })} placeholder="두두" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>영문 이름</label>
                <input {...register('nameEn')} placeholder="Dudu" className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>역할</label>
                <input {...register('role')} placeholder="의사, 조력자..." className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>감정적 역할</label>
                <input {...register('emotionalRole')} placeholder="감정 번역가..." className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>기본 외형 묘사</label>
              <textarea {...register('appearanceBase')} rows={3} placeholder="동그란 얼굴, 파란 가운, 큰 눈..."
                className={`${inputCls} resize-none`} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>스타일 키워드 (쉼표 구분)</label>
              <input {...register('styleKeywords')} placeholder="둥근 얼굴, 안경, 클레이 질감" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>색상 스킴</label>
              <input {...register('colorScheme')} placeholder="파란 가운, 크림화이트 피부" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>고정 프롬프트 키워드 (쉼표 구분, 영어)</label>
              <input {...register('fixedPromptKeywords')} placeholder="clay texture, soft lighting, pastel" className={inputCls} style={inputStyle} />
            </div>

            {/* Emotion variants */}
            <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>감정 상태별 외형 변화</label>
                <button type="button" onClick={addVariant} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--color-primary)', color: 'var(--color-primary-dark)' }}>
                  + 추가
                </button>
              </div>
              {emotionVariants.map((v, idx) => (
                <div key={idx} className="p-3 rounded-lg border mb-2 space-y-2" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-2">
                    <input value={v.emotion} onChange={e => updateVariant(idx, 'emotion', e.target.value)}
                      placeholder="감정명 (예: 걱정)" className="flex-1 px-2 py-1.5 rounded text-xs border" style={inputStyle} />
                    <button type="button" onClick={() => removeVariant(idx)} className="p-1 hover:opacity-70">
                      <X className="w-3 h-3" style={{ color: 'var(--color-text-sub)' }} />
                    </button>
                  </div>
                  <input value={v.appearanceChange} onChange={e => updateVariant(idx, 'appearanceChange', e.target.value)}
                    placeholder="외형 변화 (예: 귀 살짝 접힘, 눈 반쯤 감김)" className="w-full px-2 py-1.5 rounded text-xs border" style={inputStyle} />
                  <input value={v.promptAddition} onChange={e => updateVariant(idx, 'promptAddition', e.target.value)}
                    placeholder="프롬프트 추가 키워드 (예: droopy ears, half-closed eyes)" className="w-full px-2 py-1.5 rounded text-xs border" style={inputStyle} />
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}>취소</button>
              <button type="submit" disabled={createMutation.isPending}
                className="flex-1 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-60"
                style={{ background: 'var(--color-primary-dark)' }}
              >
                {createMutation.isPending ? '저장 중...' : editChar ? '수정 완료' : '캐릭터 추가'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function ImagePromptModal({ open, onClose, char }: { open: boolean; onClose: () => void; char: Character }) {
  const [emotion, setEmotion] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate() {
    setLoading(true); setResult('')
    try {
      const variant = char.emotionVariants.find(v => v.emotion === emotion)
      const promptText = `Generate an image generation prompt for the following character:
Name: ${char.nameEn || char.name}
Role: ${char.role}
Base Appearance: ${char.appearance.base}
Style Keywords: ${char.appearance.styleKeywords.join(', ')}
Color Scheme: ${char.appearance.colorScheme}
Fixed Keywords: ${char.appearance.fixedPromptKeywords.join(', ')}
${emotion ? `Current Emotion: ${emotion}` : ''}
${variant ? `Emotion Visual Change: ${variant.appearanceChange}` : ''}
${variant ? `Emotion Prompt Addition: ${variant.promptAddition}` : ''}

Generate a detailed Midjourney-style image prompt for this character. Include composition, lighting, mood, and all visual details. Output ONLY the prompt text.`

      const res = await fetch('/api/agent/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, type: 'character-image' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data.result)
    } catch (e: any) {
      toast.error('생성 실패: ' + e.message)
    } finally { setLoading(false) }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-lg mx-4 rounded-2xl shadow-2xl border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>{char.name} 이미지 프롬프트</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70"><X className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} /></button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>감정 상태 선택</label>
              <select value={emotion} onChange={e => setEmotion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <option value="">기본 (감정 없음)</option>
                {char.emotionVariants.map(v => (
                  <option key={v.emotion} value={v.emotion}>{v.emotion}</option>
                ))}
              </select>
            </div>

            <button onClick={generate} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60"
              style={{ background: 'var(--color-primary-dark)' }}
            >
              <Sparkles className="w-4 h-4" />
              {loading ? '생성 중...' : '프롬프트 생성'}
            </button>

            {result && (
              <div className="p-4 rounded-lg border" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}>
                <p className="text-xs font-mono whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-text)' }}>{result}</p>
                <button onClick={async () => {
                  await navigator.clipboard.writeText(result)
                  setCopied(true); toast.success('복사됨')
                  setTimeout(() => setCopied(false), 2000)
                }} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}>
                  {copied ? <CheckCircle className="w-3 h-3" style={{ color: 'green' }} /> : <Copy className="w-3 h-3" />}
                  {copied ? '복사됨' : '복사'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function CharacterCard({ char, projectId, onEdit }: { char: Character; projectId: string; onEdit: () => void }) {
  const queryClient = useQueryClient()
  const [imgPromptOpen, setImgPromptOpen] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => deleteCharacter(projectId, char.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters', projectId] })
      toast.success('캐릭터가 삭제되었습니다.')
    },
  })

  return (
    <>
      <div className="p-5 rounded-xl border transition-colors group" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
              <User className="w-5 h-5" style={{ color: 'var(--color-primary-dark)' }} />
            </div>
            <div>
              <h3 className="font-medium" style={{ color: 'var(--color-text)' }}>{char.name}</h3>
              <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>{char.nameEn} · {char.role}</p>
            </div>
          </div>
          <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 rounded-md hover:opacity-70">
              <Edit3 className="w-4 h-4" style={{ color: 'var(--color-primary-dark)' }} />
            </button>
            <button
              onClick={() => { if (confirm(`"${char.name}" 삭제할까요?`)) deleteMutation.mutate() }}
              className="p-1.5 rounded-md hover:opacity-70"
            >
              <Trash2 className="w-4 h-4" style={{ color: '#EF4444' }} />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex gap-1.5 mb-2">
          {char.role && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-primary)', color: 'var(--color-primary-dark)' }}>{char.role}</span>}
          {char.emotionalRole && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-accent-2)', color: '#0369A1' }}>{char.emotionalRole}</span>}
        </div>

        {char.appearance.base && (
          <p className="text-xs line-clamp-2 mb-3" style={{ color: 'var(--color-text-sub)' }}>{char.appearance.base}</p>
        )}

        {/* Fixed prompt keywords */}
        {char.appearance.fixedPromptKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {char.appearance.fixedPromptKeywords.map(k => (
              <span key={k} className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-sub)' }}>{k}</span>
            ))}
          </div>
        )}

        {/* Emotion variants */}
        {char.emotionVariants.length > 0 && (
          <div className="border-t pt-2 mb-3 space-y-1" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-sub)' }}>감정별 외형 변화:</p>
            {char.emotionVariants.slice(0, 3).map(v => (
              <p key={v.emotion} className="text-xs" style={{ color: 'var(--color-text-sub)' }}>
                <span className="font-medium" style={{ color: 'var(--color-primary-dark)' }}>{v.emotion}:</span> {v.appearanceChange}
              </p>
            ))}
            {char.emotionVariants.length > 3 && (
              <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>+{char.emotionVariants.length - 3}개 더</p>
            )}
          </div>
        )}

        {/* Episode count */}
        {char.episodeAppearances?.length > 0 && (
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-sub)' }}>
            등장: {char.episodeAppearances.length}개 에피소드
          </p>
        )}

        {/* Image prompt button */}
        <button
          onClick={() => setImgPromptOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary-dark)' }}
        >
          <Sparkles className="w-3.5 h-3.5" />이미지 프롬프트 생성
        </button>
      </div>

      <ImagePromptModal open={imgPromptOpen} onClose={() => setImgPromptOpen(false)} char={char} />
    </>
  )
}

export default function CharactersPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editChar, setEditChar] = useState<Character | null>(null)

  const { data: characters = [], isLoading } = useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => getCharacters(projectId),
    enabled: !!projectId,
  })

  function openEdit(char: Character) {
    setEditChar(char)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditChar(null)
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>캐릭터 관리</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-sub)' }}>이 프로젝트의 등장 캐릭터를 관리합니다</p>
        </div>
        <button
          onClick={() => { setEditChar(null); setModalOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors hover:opacity-90 shrink-0"
          style={{ background: 'var(--color-primary-dark)' }}
        >
          <Plus className="w-4 h-4" />
          새 캐릭터 추가
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-xl border animate-pulse" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} />)}
        </div>
      ) : characters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-xl" style={{ borderColor: 'var(--color-border)' }}>
          <User className="w-10 h-10 mb-3" style={{ color: 'var(--color-text-sub)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>등록된 캐릭터가 없습니다.</p>
          <button onClick={() => setModalOpen(true)} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm"
            style={{ background: 'var(--color-primary-dark)' }}>
            <Plus className="w-4 h-4" />첫 캐릭터 추가
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {characters.map((char, i) => (
            <motion.div key={char.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <CharacterCard char={char} projectId={projectId} onEdit={() => openEdit(char)} />
            </motion.div>
          ))}
        </div>
      )}

      {modalOpen && (
        <CharacterModal
          key={editChar?.id || 'new'}
          open={modalOpen}
          onClose={closeModal}
          projectId={projectId}
          editChar={editChar}
        />
      )}
    </div>
  )
}
