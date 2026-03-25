'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getConfirmedAssets, createConfirmedAsset, updateConfirmedAsset, deleteConfirmedAsset } from '@/lib/firestore'
import { uploadConfirmedAsset } from '@/lib/storage'
import { ConfirmedAsset, ConfirmedAssetCategory } from '@/types'
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, X, Edit3, Lock, Upload, Loader2,
  Image, Volume2, Paintbrush, Sparkles, Search, Filter,
  Play, Pause, Tag, CheckCircle2, User, FileText
} from 'lucide-react'
import { toast } from 'sonner'

const CATEGORY_CONFIG: Record<ConfirmedAssetCategory, {
  label: string; icon: typeof Image; color: string; bgColor: string; accept: string; desc: string
}> = {
  character: {
    label: '캐릭터', icon: User, color: '#DB2777', bgColor: '#FCE7F3',
    accept: '.png,.jpg,.jpeg,.webp', desc: '확정된 캐릭터 디자인/외형',
  },
  background: {
    label: '배경', icon: Image, color: '#0369A1', bgColor: '#E0F2FE',
    accept: '.png,.jpg,.jpeg,.webp', desc: '확정된 배경/환경 이미지',
  },
  sound: {
    label: '사운드', icon: Volume2, color: '#9333EA', bgColor: '#F3E8FF',
    accept: '.wav,.mp3,.ogg,.aac', desc: '확정된 효과음/배경음',
  },
  prop: {
    label: '소품/오브젝트', icon: Paintbrush, color: '#EA580C', bgColor: '#FFF7ED',
    accept: '.png,.jpg,.jpeg,.webp', desc: '확정된 소품/오브젝트 디자인',
  },
  effect: {
    label: '이펙트', icon: Sparkles, color: '#059669', bgColor: '#ECFDF5',
    accept: '.png,.jpg,.jpeg,.webp,.gif', desc: '확정된 시각 효과',
  },
}

const ALL_CATEGORIES: ConfirmedAssetCategory[] = ['character', 'background', 'sound', 'prop', 'effect']

// ─── Asset Modal ──────────────────────────────────────────────
function AssetModal({
  open, onClose, projectId, editAsset,
}: {
  open: boolean; onClose: () => void; projectId: string; editAsset?: ConfirmedAsset | null
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(editAsset?.name || '')
  const [category, setCategory] = useState<ConfirmedAssetCategory>(editAsset?.category || 'character')
  const [description, setDescription] = useState(editAsset?.description || '')
  const [tags, setTags] = useState(editAsset?.tags?.join(', ') || '')
  const [prompt, setPrompt] = useState(editAsset?.prompt || '')
  const [fileUrl, setFileUrl] = useState(editAsset?.fileUrl || '')
  const [thumbnailUrl, setThumbnailUrl] = useState(editAsset?.thumbnailUrl || '')
  const [fileType, setFileType] = useState(editAsset?.fileType || '')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(editAsset?.fileUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setFileType(file.type)

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else if (file.type.startsWith('audio/')) {
      setPreview(null)
    }

    try {
      const url = await uploadConfirmedAsset(projectId, category, file)
      setFileUrl(url)
      if (file.type.startsWith('image/')) setThumbnailUrl(url)
      toast.success('파일 업로드 완료!')
    } catch (err: any) {
      toast.error('업로드 실패: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('이름을 입력해주세요.'); return }
    if (!fileUrl && !editAsset) { toast.error('파일을 업로드해주세요.'); return }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        category,
        description: description.trim(),
        fileUrl,
        thumbnailUrl: thumbnailUrl || undefined,
        fileType,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        prompt: prompt.trim() || undefined,
      }

      if (editAsset) {
        await updateConfirmedAsset(projectId, editAsset.id, payload)
      } else {
        await createConfirmedAsset(projectId, payload)
      }

      queryClient.invalidateQueries({ queryKey: ['confirmedAssets', projectId] })
      toast.success(editAsset ? '에셋이 수정되었습니다!' : '확정 에셋이 등록되었습니다!')
      onClose()
    } catch (err: any) {
      toast.error('저장 실패: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null
  const cfg = CATEGORY_CONFIG[category]
  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none placeholder:opacity-50"
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
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" style={{ color: '#10B981' }} />
              <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>
                {editAsset ? '확정 에셋 수정' : '새 확정 에셋 등록'}
              </h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70">
              <X className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* File upload area */}
            <input ref={fileInputRef} type="file" className="hidden" accept={cfg.accept} onChange={handleFileUpload} />
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-purple-400"
              style={{ borderColor: fileUrl ? '#10B981' : 'var(--color-border)', background: fileUrl ? '#F0FDF4' : 'var(--color-surface-2)' }}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary-dark)' }} />
                  <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>파일 업로드 중...</p>
                </div>
              ) : preview ? (
                <div className="space-y-2">
                  <img src={preview} alt="preview" className="max-h-40 mx-auto rounded-lg object-contain" />
                  <p className="text-[10px]" style={{ color: '#059669' }}>클릭하여 다른 파일로 교체</p>
                </div>
              ) : fileUrl && fileType.startsWith('audio/') ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#F3E8FF' }}>
                    <Volume2 className="w-8 h-8" style={{ color: '#9333EA' }} />
                  </div>
                  <p className="text-xs" style={{ color: '#059669' }}>오디오 파일 업로드 완료</p>
                  <audio controls src={fileUrl} className="mt-2 max-w-full" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8" style={{ color: 'var(--color-text-sub)' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>확정된 에셋 파일 업로드</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-sub)' }}>{cfg.desc}</p>
                </div>
              )}
            </div>

            {/* Category select */}
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>카테고리 *</label>
              <div className="grid grid-cols-5 gap-2">
                {ALL_CATEGORIES.map(cat => {
                  const c = CATEGORY_CONFIG[cat]
                  const active = category === cat
                  return (
                    <button
                      key={cat} type="button"
                      onClick={() => setCategory(cat)}
                      className="flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs transition-all"
                      style={{
                        borderColor: active ? c.color : 'var(--color-border)',
                        background: active ? c.bgColor : 'var(--color-surface-2)',
                        color: active ? c.color : 'var(--color-text-sub)',
                      }}
                    >
                      <c.icon className="w-4 h-4" />
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>이름 *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="예: 숲속 마을 낮 배경, 발걸음 효과음..."
                className={inputCls} style={inputStyle} />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>설명</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={2} placeholder="이 에셋의 용도, 사용 장면 등..."
                className={`${inputCls} resize-none`} style={inputStyle} />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>태그 (쉼표 구분)</label>
              <input value={tags} onChange={e => setTags(e.target.value)}
                placeholder="숲, 낮, 밝은분위기, EP1..."
                className={inputCls} style={inputStyle} />
            </div>

            {/* Prompt */}
            <div>
              <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: 'var(--color-text-sub)' }}>
                <FileText className="w-3.5 h-3.5" />
                이미지 프롬프트 (AI 생성용)
              </label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                rows={4} placeholder="이 에셋을 AI로 재현할 때 사용할 프롬프트를 입력하세요.&#10;예: a young female character with short brown hair, wearing a white lab coat, anime style, soft lighting..."
                className={`${inputCls} resize-none font-mono text-[11px] leading-relaxed`} style={inputStyle} />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}>
                취소
              </button>
              <button type="submit" disabled={saving || uploading}
                className="flex-1 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: '#10B981' }}>
                <Lock className="w-3.5 h-3.5" />
                {saving ? '저장 중...' : editAsset ? '수정 완료' : '에셋 확정 등록'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ─── Asset Card ───────────────────────────────────────────────
function AssetCard({
  asset, projectId, onEdit,
}: {
  asset: ConfirmedAsset; projectId: string; onEdit: () => void
}) {
  const queryClient = useQueryClient()
  const [audioPlaying, setAudioPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const cfg = CATEGORY_CONFIG[asset.category]

  const deleteMutation = useMutation({
    mutationFn: () => deleteConfirmedAsset(projectId, asset.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confirmedAssets', projectId] })
      toast.success('에셋이 삭제되었습니다.')
    },
  })

  const isImage = asset.fileType?.startsWith('image/')
  const isAudio = asset.fileType?.startsWith('audio/')

  function toggleAudio() {
    if (!audioRef.current) return
    if (audioPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setAudioPlaying(!audioPlaying)
  }

  return (
    <div className="rounded-xl border overflow-hidden transition-colors group" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {/* Preview area */}
      <div className="relative h-40 flex items-center justify-center" style={{ background: cfg.bgColor }}>
        {isImage && asset.fileUrl ? (
          <img src={asset.fileUrl} alt={asset.name} className="w-full h-full object-cover" />
        ) : isAudio ? (
          <button onClick={toggleAudio} className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110"
            style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            {audioPlaying ? <Pause className="w-6 h-6" style={{ color: cfg.color }} /> : <Play className="w-6 h-6 ml-0.5" style={{ color: cfg.color }} />}
          </button>
        ) : (
          <cfg.icon className="w-12 h-12" style={{ color: cfg.color, opacity: 0.5 }} />
        )}

        {isAudio && <audio ref={audioRef} src={asset.fileUrl} onEnded={() => setAudioPlaying(false)} />}

        {/* Confirmed badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-white text-[10px] font-medium"
          style={{ background: '#10B981' }}>
          <Lock className="w-2.5 h-2.5" />확정
        </div>

        {/* Category badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium"
          style={{ background: 'white', color: cfg.color }}>
          <cfg.icon className="w-2.5 h-2.5" />{cfg.label}
        </div>

        {/* Actions */}
        <div className="absolute bottom-2 right-2 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.9)' }}>
            <Edit3 className="w-3.5 h-3.5" style={{ color: 'var(--color-primary-dark)' }} />
          </button>
          <button onClick={() => { if (confirm(`"${asset.name}" 삭제할까요?`)) deleteMutation.mutate() }}
            className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.9)' }}>
            <Trash2 className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{asset.name}</h3>
        {asset.description && (
          <p className="text-xs line-clamp-2 mt-1" style={{ color: 'var(--color-text-sub)' }}>{asset.description}</p>
        )}
        {asset.prompt && (
          <div className="mt-2 rounded-lg p-2" style={{ background: 'var(--color-surface-2)' }}>
            <div className="flex items-center gap-1 mb-1">
              <FileText className="w-3 h-3 shrink-0" style={{ color: 'var(--color-text-sub)' }} />
              <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-sub)' }}>프롬프트</span>
            </div>
            <p className="text-[10px] font-mono line-clamp-3 leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>{asset.prompt}</p>
          </div>
        )}
        {asset.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {asset.tags.map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-sub)' }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function ConfirmedAssetsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editAsset, setEditAsset] = useState<ConfirmedAsset | null>(null)
  const [filterCategory, setFilterCategory] = useState<ConfirmedAssetCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['confirmedAssets', projectId],
    queryFn: () => getConfirmedAssets(projectId),
    enabled: !!projectId,
  })

  const filtered = assets.filter(a => {
    if (filterCategory !== 'all' && a.category !== filterCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return a.name.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.tags?.some(t => t.toLowerCase().includes(q))
    }
    return true
  })

  const categoryCounts = ALL_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = assets.filter(a => a.category === cat).length
    return acc
  }, {} as Record<string, number>)

  function openEdit(asset: ConfirmedAsset) {
    setEditAsset(asset)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditAsset(null)
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5" style={{ color: '#10B981' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>확정 에셋</h1>
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-sub)' }}>
            디자인이 확정된 캐릭터, 배경, 사운드, 소품 등을 관리합니다. 이미지와 프롬프트를 함께 저장해 일관성을 유지합니다.
          </p>
        </div>
        <button
          onClick={() => { setEditAsset(null); setModalOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors hover:opacity-90 shrink-0"
          style={{ background: '#10B981' }}
        >
          <Plus className="w-4 h-4" />
          새 에셋 확정
        </button>
      </div>

      {/* Category summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {ALL_CATEGORIES.map(cat => {
          const c = CATEGORY_CONFIG[cat]
          const count = categoryCounts[cat] || 0
          const active = filterCategory === cat
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(active ? 'all' : cat)}
              className="p-3 rounded-xl border text-left transition-all hover:shadow-sm"
              style={{
                borderColor: active ? c.color : 'var(--color-border)',
                background: active ? c.bgColor : 'var(--color-surface)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: c.bgColor }}>
                  <c.icon className="w-4 h-4" style={{ color: c.color }} />
                </div>
                <span className="text-lg font-bold" style={{ color: c.color }}>{count}</span>
              </div>
              <p className="text-xs font-medium" style={{ color: active ? c.color : 'var(--color-text)' }}>{c.label}</p>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="에셋 이름, 설명, 태그로 검색..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          />
        </div>
        {filterCategory !== 'all' && (
          <button onClick={() => setFilterCategory('all')}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border text-xs hover:opacity-70"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}>
            <X className="w-3 h-3" />필터 초기화
          </button>
        )}
      </div>

      {/* Asset grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-56 rounded-xl border animate-pulse"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-xl"
          style={{ borderColor: 'var(--color-border)' }}>
          {assets.length === 0 ? (
            <>
              <Lock className="w-10 h-10 mb-3" style={{ color: 'var(--color-text-sub)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>등록된 확정 에셋이 없습니다.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-sub)' }}>
                캐릭터, 배경, 사운드, 소품 등의 디자인이 확정되면 여기에 등록하세요.
              </p>
              <button onClick={() => setModalOpen(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm"
                style={{ background: '#10B981' }}>
                <Plus className="w-4 h-4" />첫 에셋 등록
              </button>
            </>
          ) : (
            <>
              <Search className="w-10 h-10 mb-3" style={{ color: 'var(--color-text-sub)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>검색 결과가 없습니다.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((asset, i) => (
            <motion.div key={asset.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}>
              <AssetCard asset={asset} projectId={projectId} onEdit={() => openEdit(asset)} />
            </motion.div>
          ))}
        </div>
      )}

      {modalOpen && (
        <AssetModal
          key={editAsset?.id || 'new'}
          open={modalOpen}
          onClose={closeModal}
          projectId={projectId}
          editAsset={editAsset}
        />
      )}
    </div>
  )
}
