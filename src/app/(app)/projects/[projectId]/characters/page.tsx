'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCharacters, createCharacter, deleteCharacter } from '@/lib/firestore'
import { Character } from '@/types'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, User, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

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

function NewCharacterModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset } = useForm<CharFormData>()

  const createMutation = useMutation({
    mutationFn: async (data: CharFormData) => {
      return createCharacter(projectId, {
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
        emotionVariants: [],
        episodeAppearances: [],
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters', projectId] })
      toast.success('캐릭터가 추가되었습니다!')
      reset()
      onClose()
    },
    onError: (e: any) => toast.error('추가 실패: ' + e.message),
  })

  if (!open) return null

  const inputCls = "w-full px-3 py-2 rounded-lg bg-accent border border-border text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-xl mx-4 bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold text-white">새 캐릭터 추가</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">이름 *</label>
                <input {...register('name', { required: true })} placeholder="두두" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">영문 이름</label>
                <input {...register('nameEn')} placeholder="Dudu" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">역할</label>
                <input {...register('role')} placeholder="의사, 조력자..." className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">감정적 역할</label>
                <input {...register('emotionalRole')} placeholder="감정 번역가..." className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">기본 외형 묘사</label>
              <textarea {...register('appearanceBase')} rows={3} placeholder="동그란 얼굴, 파란 가운, 큰 눈..."
                className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">스타일 키워드 (쉼표 구분)</label>
              <input {...register('styleKeywords')} placeholder="둥근 얼굴, 안경, 클레이 질감" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">색상 스킴</label>
              <input {...register('colorScheme')} placeholder="파란 가운, 크림화이트 피부" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">고정 프롬프트 키워드 (쉼표 구분)</label>
              <input {...register('fixedPromptKeywords')} placeholder="clay texture, soft lighting, pastel" className={inputCls} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground hover:text-white hover:bg-accent text-sm">취소</button>
              <button type="submit" disabled={createMutation.isPending} className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm disabled:opacity-60">
                {createMutation.isPending ? '추가 중...' : '캐릭터 추가'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function CharacterCard({ char, projectId }: { char: Character; projectId: string }) {
  const queryClient = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: () => deleteCharacter(projectId, char.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters', projectId] })
      toast.success('캐릭터가 삭제되었습니다.')
    },
  })

  return (
    <div className="p-5 rounded-xl border border-border bg-card hover:border-purple-500/30 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-medium text-white">{char.name}</h3>
            <p className="text-xs text-muted-foreground">{char.nameEn} · {char.role}</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm(`"${char.name}" 캐릭터를 삭제할까요?`)) deleteMutation.mutate()
          }}
          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>

      {char.emotionalRole && (
        <p className="text-xs text-blue-400 mb-2">💙 {char.emotionalRole}</p>
      )}

      {char.appearance.base && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{char.appearance.base}</p>
      )}

      {char.appearance.styleKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {char.appearance.styleKeywords.map(k => (
            <span key={k} className="text-xs px-1.5 py-0.5 rounded bg-accent text-muted-foreground">{k}</span>
          ))}
        </div>
      )}

      {char.appearance.fixedPromptKeywords.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">고정 프롬프트:</p>
          <p className="text-xs text-green-400 font-mono">{char.appearance.fixedPromptKeywords.join(', ')}</p>
        </div>
      )}
    </div>
  )
}

export default function CharactersPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [modalOpen, setModalOpen] = useState(false)

  const { data: characters = [], isLoading } = useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => getCharacters(projectId),
    enabled: !!projectId,
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">캐릭터</h1>
          <p className="text-sm text-muted-foreground mt-0.5">이 프로젝트의 등장 캐릭터를 관리합니다</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          캐릭터 추가
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-xl bg-card border border-border animate-pulse" />)}
        </div>
      ) : characters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-xl">
          <User className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">등록된 캐릭터가 없습니다.</p>
          <button onClick={() => setModalOpen(true)} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm">
            <Plus className="w-4 h-4" />첫 캐릭터 추가
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {characters.map((char, i) => (
            <motion.div key={char.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <CharacterCard char={char} projectId={projectId} />
            </motion.div>
          ))}
        </div>
      )}

      <NewCharacterModal open={modalOpen} onClose={() => setModalOpen(false)} projectId={projectId} />
    </div>
  )
}
