'use client'

import { useState, ReactNode } from 'react'
import { Character, ConfirmedAsset } from '@/types'
import { ChevronDown, User, CheckCircle, Plus, X, ImageIcon, Pencil, Image, Paintbrush, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────

export interface CharacterSelection {
  id: string               // unique: char.id for scene chars, generated for custom
  characterId?: string     // scene character (links to Character in allCharacters)
  assetId?: string         // confirmed asset ID used as reference image
  label: string            // display name
  included: boolean
  emotionVariant: string   // emotion variant key (scene chars only)
  customPromptText?: string // extra prompt keywords (custom entries)
}

interface Props {
  sceneCharacterIds: string[]
  allCharacters: Character[]
  confirmedAssets: ConfirmedAsset[]
  selections: CharacterSelection[]
  onChange: (selections: CharacterSelection[]) => void
}

// ─── Helpers ──────────────────────────────────────────────

function getAssetImage(asset: ConfirmedAsset | null | undefined): string | null {
  if (!asset) return null
  return asset.thumbnailUrl || (asset.fileType?.startsWith('image') ? asset.fileUrl : null) || null
}

function findCharacterAsset(char: Character, confirmedAssets: ConfirmedAsset[]): ConfirmedAsset | null {
  return confirmedAssets.find(a =>
    a.category === 'character' &&
    (a.name === char.name || a.name === char.nameEn ||
      a.name.toLowerCase().includes(char.name.toLowerCase()) ||
      a.name.toLowerCase().includes((char.nameEn ?? '').toLowerCase()))
  ) ?? null
}

function genId(): string {
  return 'custom_' + Math.random().toString(36).slice(2, 9)
}

// ─── Sub-components ───────────────────────────────────────

/** 확정 에셋 선택 드롭다운 */
function AssetPicker({
  confirmedAssets,
  selectedId,
  onChange,
}: {
  confirmedAssets: ConfirmedAsset[]
  selectedId: string | undefined
  onChange: (id: string | undefined) => void
}) {
  const charAssets = confirmedAssets.filter(a => a.category === 'character')
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-sub)' }}>레퍼런스 에셋 (선택)</p>
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => onChange(undefined)}
          className="px-2 py-1 rounded-md text-[10px] border transition-colors"
          style={{
            background: !selectedId ? '#7C3AED' : 'var(--color-surface)',
            color: !selectedId ? 'white' : 'var(--color-text-sub)',
            borderColor: !selectedId ? '#7C3AED' : 'var(--color-border)',
          }}
        >
          없음
        </button>
        {charAssets.map(asset => (
          <button
            key={asset.id}
            onClick={() => onChange(asset.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] border transition-colors"
            style={{
              background: selectedId === asset.id ? '#7C3AED' : 'var(--color-surface)',
              color: selectedId === asset.id ? 'white' : 'var(--color-text-sub)',
              borderColor: selectedId === asset.id ? '#7C3AED' : 'var(--color-border)',
            }}
          >
            {getAssetImage(asset) && (
              <img src={getAssetImage(asset)!} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
            )}
            {asset.name}
          </button>
        ))}
      </div>
    </div>
  )
}

/** 커스텀 캐릭터 추가 폼 */
function CustomEntryForm({
  confirmedAssets,
  onAdd,
  onCancel,
}: {
  confirmedAssets: ConfirmedAsset[]
  onAdd: (sel: CharacterSelection) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState('')
  const [assetId, setAssetId] = useState<string | undefined>()
  const [promptText, setPromptText] = useState('')

  function handleAdd() {
    if (!label.trim()) return
    onAdd({
      id: genId(),
      label: label.trim(),
      assetId,
      included: true,
      emotionVariant: '',
      customPromptText: promptText.trim() || undefined,
    })
  }

  return (
    <div className="p-3 rounded-xl border space-y-3" style={{ borderColor: '#C4B5FD', background: '#FAFAF9' }}>
      <p className="text-[11px] font-semibold" style={{ color: '#7C3AED' }}>커스텀 캐릭터 추가</p>

      {/* Label */}
      <div>
        <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--color-text-sub)' }}>캐릭터 이름 *</p>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="예: 작아진 도티, 루루 3명, 큰 도티..."
          className="w-full px-2.5 py-1.5 rounded-lg border text-[11px]"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
      </div>

      {/* Asset picker */}
      <AssetPicker confirmedAssets={confirmedAssets} selectedId={assetId} onChange={setAssetId} />

      {/* Custom prompt */}
      <div>
        <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--color-text-sub)' }}>프롬프트 키워드 (선택)</p>
        <input
          type="text"
          value={promptText}
          onChange={e => setPromptText(e.target.value)}
          placeholder="예: small size, tiny, miniature..."
          className="w-full px-2.5 py-1.5 rounded-lg border text-[11px] font-mono"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={!label.trim()}
          className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-white disabled:opacity-40"
          style={{ background: '#7C3AED' }}
        >
          추가
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-[11px] border"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}
        >
          취소
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────

export function CharacterController({
  sceneCharacterIds,
  allCharacters,
  confirmedAssets,
  selections,
  onChange,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAssetPicker, setShowAssetPicker] = useState(false)

  const sceneChars = allCharacters.filter(c => sceneCharacterIds.includes(c.id))

  // confirmed character assets not already in scene characters
  const charAssets = confirmedAssets.filter(a => {
    if (a.category !== 'character') return false
    // 이미 씬 캐릭터로 매칭된 에셋은 제외
    const alreadyLinked = sceneChars.some(c =>
      a.name === c.name || a.name === c.nameEn ||
      a.name.toLowerCase().includes(c.name.toLowerCase())
    )
    return !alreadyLinked
  })

  function updateSel(id: string, patch: Partial<CharacterSelection>) {
    onChange(selections.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  function removeSel(id: string) {
    onChange(selections.filter(s => s.id !== id))
    if (expandedId === id) setExpandedId(null)
    if (editingId === id) setEditingId(null)
  }

  function addAssetSelection(asset: ConfirmedAsset) {
    if (selections.some(s => s.assetId === asset.id && !s.characterId)) return
    onChange([...selections, {
      id: 'asset_' + asset.id,
      assetId: asset.id,
      label: asset.name,
      included: true,
      emotionVariant: '',
    }])
    setShowAssetPicker(false)
  }

  function addCustomSelection(sel: CharacterSelection) {
    onChange([...selections, sel])
    setShowAddForm(false)
  }

  // Render a single selection card
  function renderCard(sel: CharacterSelection) {
    const char = sel.characterId ? allCharacters.find(c => c.id === sel.characterId) : null
    const asset = sel.assetId ? confirmedAssets.find(a => a.id === sel.assetId)
      : char ? findCharacterAsset(char, confirmedAssets) : null
    const isExpanded = expandedId === sel.id
    const isEditing = editingId === sel.id
    const isCustom = !sel.characterId
    const avatarUrl = getAssetImage(asset) || char?.profileImage || null

    const keywords = char
      ? [
          ...char.appearance.fixedPromptKeywords,
          ...(sel.emotionVariant
            ? [char.emotionVariants.find(v => v.emotion === sel.emotionVariant)?.promptAddition].filter(Boolean) as string[]
            : []),
          ...(sel.customPromptText ? sel.customPromptText.split(',').map(s => s.trim()).filter(Boolean) : []),
        ]
      : sel.customPromptText ? sel.customPromptText.split(',').map(s => s.trim()).filter(Boolean) : []

    return (
      <div
        key={sel.id}
        className="rounded-xl border overflow-hidden transition-opacity"
        style={{
          borderColor: sel.included ? '#C4B5FD' : 'var(--color-border)',
          background: sel.included ? '#FAFAF9' : 'var(--color-surface-2)',
          opacity: sel.included ? 1 : 0.5,
        }}
      >
        {/* Header row */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          {/* Toggle */}
          <button
            onClick={() => updateSel(sel.id, { included: !sel.included })}
            className="shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors"
            style={{
              background: sel.included ? '#7C3AED' : 'transparent',
              borderColor: sel.included ? '#7C3AED' : 'var(--color-border)',
            }}
          >
            {sel.included && <CheckCircle className="w-3 h-3 text-white" />}
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden border shrink-0 flex items-center justify-center"
            style={{ borderColor: '#C4B5FD', background: '#EDE9FE' }}>
            {avatarUrl
              ? <img src={avatarUrl} alt={sel.label} className="w-full h-full object-cover" />
              : <User className="w-4 h-4" style={{ color: '#7C3AED' }} />}
          </div>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{sel.label}</span>
              {asset && (
                <span className="text-[9px] px-1 py-0.5 rounded font-medium shrink-0" style={{ background: '#D1FAE5', color: '#065F46' }}>
                  확정
                </span>
              )}
              {isCustom && (
                <span className="text-[9px] px-1 py-0.5 rounded font-medium shrink-0" style={{ background: '#FEF3C7', color: '#92400E' }}>
                  커스텀
                </span>
              )}
            </div>
            {char && (
              <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--color-text-sub)' }}>{char.role}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Edit (custom entries) */}
            {isCustom && sel.included && (
              <button
                onClick={() => setEditingId(isEditing ? null : sel.id)}
                className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors"
              >
                <Pencil className={cn('w-3.5 h-3.5', isEditing ? 'text-purple-600' : '')}
                  style={{ color: isEditing ? '#7C3AED' : 'var(--color-text-sub)' }} />
              </button>
            )}
            {/* Expand (scene chars) */}
            {!isCustom && sel.included && (
              <button
                onClick={() => setExpandedId(isExpanded ? null : sel.id)}
                className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors"
              >
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isExpanded && 'rotate-180')}
                  style={{ color: 'var(--color-text-sub)' }} />
              </button>
            )}
            {/* Remove (custom/asset only) */}
            {isCustom && (
              <button
                onClick={() => removeSel(sel.id)}
                className="p-1 rounded-lg hover:bg-red-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
              </button>
            )}
          </div>
        </div>

        {/* Scene char expanded: asset override + emotion + custom prompt + keywords */}
        {!isCustom && sel.included && isExpanded && char && (
          <div className="px-3 pb-3 pt-1 border-t space-y-2.5" style={{ borderColor: '#E5E7EB', background: 'white' }}>
            {/* Manual asset selection — also fixes auto-match failures */}
            <AssetPicker
              confirmedAssets={confirmedAssets}
              selectedId={sel.assetId}
              onChange={assetId => updateSel(sel.id, { assetId })}
            />

            {/* Auto-matched asset info when no manual override */}
            {!sel.assetId && asset && (
              <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: '#F0FDF4' }}>
                <ImageIcon className="w-3 h-3 shrink-0" style={{ color: '#059669' }} />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium" style={{ color: '#065F46' }}>자동 매칭 에셋</p>
                  <p className="text-[10px] truncate" style={{ color: '#059669' }}>{asset.name}</p>
                </div>
              </div>
            )}

            {/* Emotion variant */}
            {char.emotionVariants.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--color-text-sub)' }}>감정 상태</p>
                <div className="flex flex-wrap gap-1">
                  {['', ...char.emotionVariants.map(v => v.emotion)].map(emotion => (
                    <button
                      key={emotion}
                      onClick={() => updateSel(sel.id, { emotionVariant: emotion })}
                      className="px-2 py-1 rounded-md text-[10px] font-medium border transition-colors"
                      style={{
                        background: sel.emotionVariant === emotion ? '#7C3AED' : 'var(--color-surface)',
                        color: sel.emotionVariant === emotion ? 'white' : 'var(--color-text-sub)',
                        borderColor: sel.emotionVariant === emotion ? '#7C3AED' : 'var(--color-border)',
                      }}
                    >
                      {emotion || '기본'}
                    </button>
                  ))}
                </div>
                {sel.emotionVariant && (() => {
                  const v = char.emotionVariants.find(v => v.emotion === sel.emotionVariant)
                  return v ? <p className="text-[10px] mt-1.5 italic" style={{ color: '#6D28D9' }}>{v.appearanceChange}</p> : null
                })()}
              </div>
            )}

            {/* Additional prompt keywords — available for all scene characters */}
            <div>
              <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--color-text-sub)' }}>추가 프롬프트 키워드 (선택)</p>
              <input
                type="text"
                value={sel.customPromptText ?? ''}
                onChange={e => updateSel(sel.id, { customPromptText: e.target.value || undefined })}
                placeholder="예: small size, 3 characters, tiny..."
                className="w-full px-2.5 py-1.5 rounded-lg border text-[11px] font-mono"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
              />
            </div>

            {/* Keywords preview */}
            {keywords.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--color-text-sub)' }}>적용 키워드</p>
                <div className="flex flex-wrap gap-1">
                  {keywords.map((kw, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                      style={{ background: '#EDE9FE', color: '#6D28D9' }}>{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom entry editing */}
        {isCustom && sel.included && isEditing && (
          <div className="px-3 pb-3 pt-2 border-t space-y-2.5" style={{ borderColor: '#E5E7EB', background: 'white' }}>
            <div>
              <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--color-text-sub)' }}>이름</p>
              <input
                type="text"
                value={sel.label}
                onChange={e => updateSel(sel.id, { label: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border text-[11px]"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
              />
            </div>
            <AssetPicker
              confirmedAssets={confirmedAssets}
              selectedId={sel.assetId}
              onChange={assetId => updateSel(sel.id, { assetId })}
            />
            <div>
              <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--color-text-sub)' }}>프롬프트 키워드</p>
              <input
                type="text"
                value={sel.customPromptText ?? ''}
                onChange={e => updateSel(sel.id, { customPromptText: e.target.value || undefined })}
                placeholder="예: small size, tiny, 3 characters..."
                className="w-full px-2.5 py-1.5 rounded-lg border text-[11px] font-mono"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Scene characters */}
      {selections.length === 0 && sceneChars.length === 0 && (
        <div className="p-3 rounded-xl border text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
          <User className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--color-text-sub)' }} />
          <p className="text-[11px]" style={{ color: 'var(--color-text-sub)' }}>이 씬에 등장하는 캐릭터가 없습니다.</p>
        </div>
      )}

      {selections.map(sel => renderCard(sel))}

      {/* Add buttons */}
      {!showAddForm && !showAssetPicker && (
        <div className="flex gap-1.5">
          {/* Add from confirmed assets */}
          {charAssets.length > 0 && (
            <button
              onClick={() => setShowAssetPicker(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] transition-colors hover:bg-[var(--color-surface-2)]"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}
            >
              <ImageIcon className="w-3 h-3" /> 에셋 추가
            </button>
          )}
          {/* Add custom */}
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] transition-colors hover:bg-[var(--color-surface-2)]"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}
          >
            <Plus className="w-3 h-3" /> 직접 추가
          </button>
        </div>
      )}

      {/* Asset picker panel */}
      {showAssetPicker && (
        <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: '#C4B5FD', background: '#FAFAF9' }}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold" style={{ color: '#7C3AED' }}>확정 에셋에서 추가</p>
            <button onClick={() => setShowAssetPicker(false)}><X className="w-3.5 h-3.5" style={{ color: 'var(--color-text-sub)' }} /></button>
          </div>
          <div className="space-y-1.5">
            {charAssets.map(asset => {
              const alreadyAdded = selections.some(s => s.assetId === asset.id && !s.characterId)
              return (
                <button
                  key={asset.id}
                  onClick={() => !alreadyAdded && addAssetSelection(asset)}
                  disabled={alreadyAdded}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors hover:bg-white disabled:opacity-50"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden border shrink-0 flex items-center justify-center"
                    style={{ borderColor: '#C4B5FD', background: '#EDE9FE' }}>
                    {getAssetImage(asset)
                      ? <img src={getAssetImage(asset)!} alt="" className="w-full h-full object-cover" />
                      : <User className="w-3.5 h-3.5" style={{ color: '#7C3AED' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate" style={{ color: 'var(--color-text)' }}>{asset.name}</p>
                    {alreadyAdded && <p className="text-[9px]" style={{ color: 'var(--color-text-sub)' }}>이미 추가됨</p>}
                  </div>
                  {!alreadyAdded && <Plus className="w-3.5 h-3.5 shrink-0" style={{ color: '#7C3AED' }} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Custom entry form */}
      {showAddForm && (
        <CustomEntryForm
          confirmedAssets={confirmedAssets}
          onAdd={addCustomSelection}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  )
}

// ─── buildCharacterPromptSuffix ───────────────────────────

export function buildCharacterPromptSuffix(
  selections: CharacterSelection[],
  allCharacters: Character[],
  confirmedAssets: ConfirmedAsset[]
): { promptSuffix: string; referenceImageUrls: string[] } {
  const included = selections.filter(s => s.included)
  const promptParts: string[] = []
  const referenceUrls: string[] = []

  for (const sel of included) {
    const char = sel.characterId ? allCharacters.find(c => c.id === sel.characterId) : null

    // Keywords
    let keywords: string[] = []
    if (char) {
      keywords = [...char.appearance.fixedPromptKeywords]
      if (sel.emotionVariant) {
        const variant = char.emotionVariants.find(v => v.emotion === sel.emotionVariant)
        if (variant?.promptAddition) keywords.push(variant.promptAddition)
      }
    }
    if (sel.customPromptText) {
      keywords.push(...sel.customPromptText.split(',').map(s => s.trim()).filter(Boolean))
    }
    if (keywords.length > 0) {
      promptParts.push(`${sel.label}: ${keywords.join(', ')}`)
    } else {
      promptParts.push(sel.label)
    }

    // Reference image
    const asset = sel.assetId
      ? confirmedAssets.find(a => a.id === sel.assetId)
      : char ? findCharacterAsset(char, confirmedAssets) : null
    const refUrl = asset?.fileUrl
    if (refUrl) referenceUrls.push(refUrl)
  }

  const promptSuffix = promptParts.length > 0
    ? `\n\n[Character details: ${promptParts.join(' | ')}]`
    : ''

  return { promptSuffix, referenceImageUrls: referenceUrls }
}

// ─── initCharacterSelections ──────────────────────────────

export function initCharacterSelections(
  sceneCharacterIds: string[],
  allCharacters: Character[],
  sceneEmotionKeywords: string[]
): CharacterSelection[] {
  return sceneCharacterIds.map(id => {
    const char = allCharacters.find(c => c.id === id)
    const matchedVariant = char?.emotionVariants.find(ev =>
      sceneEmotionKeywords.some(ek => ev.emotion.includes(ek) || ek.includes(ev.emotion))
    )
    return {
      id,
      characterId: id,
      label: char?.name ?? id,
      included: true,
      emotionVariant: matchedVariant?.emotion ?? '',
    }
  })
}

// ─── ConfirmedAssetSelection ──────────────────────────────

export interface ConfirmedAssetSelection {
  assetId: string
  included: boolean
}

// ─── Category config for non-character assets ─────────────

const ASSET_CATEGORY_CONFIG: Record<string, { label: string; icon: ReactNode; color: string; bg: string; promptLabel: string }> = {
  background: {
    label: '배경',
    icon: <Image className="w-3.5 h-3.5" />,
    color: '#0369A1',
    bg: '#E0F2FE',
    promptLabel: 'Background',
  },
  prop: {
    label: '소품/오브젝트',
    icon: <Paintbrush className="w-3.5 h-3.5" />,
    color: '#EA580C',
    bg: '#FFF7ED',
    promptLabel: 'Props',
  },
  effect: {
    label: '이펙트',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    color: '#059669',
    bg: '#ECFDF5',
    promptLabel: 'Effects',
  },
}

// ─── ConfirmedAssetController ─────────────────────────────

interface AssetControllerProps {
  confirmedAssets: ConfirmedAsset[]
  selections: ConfirmedAssetSelection[]
  onChange: (selections: ConfirmedAssetSelection[]) => void
}

export function ConfirmedAssetController({ confirmedAssets, selections, onChange }: AssetControllerProps) {
  const visibleAssets = confirmedAssets.filter(a =>
    a.category === 'background' || a.category === 'prop' || a.category === 'effect'
  )

  if (visibleAssets.length === 0) return null

  function toggle(assetId: string) {
    const exists = selections.find(s => s.assetId === assetId)
    if (exists) {
      onChange(selections.map(s => s.assetId === assetId ? { ...s, included: !s.included } : s))
    } else {
      onChange([...selections, { assetId, included: true }])
    }
  }

  const grouped = (['background', 'prop', 'effect'] as const).map(cat => ({
    cat,
    assets: visibleAssets.filter(a => a.category === cat),
  })).filter(g => g.assets.length > 0)

  return (
    <div className="space-y-2.5">
      {grouped.map(({ cat, assets }) => {
        const cfg = ASSET_CATEGORY_CONFIG[cat]
        return (
          <div key={cat}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span style={{ color: cfg.color }}>{cfg.icon}</span>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-sub)' }}>{cfg.label}</p>
            </div>
            <div className="space-y-1">
              {assets.map(asset => {
                const sel = selections.find(s => s.assetId === asset.id)
                const included = sel?.included ?? false
                const thumb = asset.thumbnailUrl || (asset.fileType?.startsWith('image') ? asset.fileUrl : null)
                return (
                  <div
                    key={asset.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-opacity cursor-pointer"
                    style={{
                      borderColor: included ? cfg.color : 'var(--color-border)',
                      background: included ? cfg.bg : 'var(--color-surface-2)',
                      opacity: included ? 1 : 0.55,
                    }}
                    onClick={() => toggle(asset.id)}
                  >
                    {/* Toggle */}
                    <div
                      className="shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors"
                      style={{
                        background: included ? cfg.color : 'transparent',
                        borderColor: included ? cfg.color : 'var(--color-border)',
                      }}
                    >
                      {included && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>

                    {/* Thumbnail */}
                    <div
                      className="w-8 h-8 rounded-lg overflow-hidden border shrink-0 flex items-center justify-center"
                      style={{ borderColor: cfg.color, background: cfg.bg }}
                    >
                      {thumb
                        ? <img src={thumb} alt={asset.name} className="w-full h-full object-cover" />
                        : <span style={{ color: cfg.color }}>{cfg.icon}</span>}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{asset.name}</p>
                      {asset.description && (
                        <p className="text-[10px] truncate" style={{ color: 'var(--color-text-sub)' }}>{asset.description}</p>
                      )}
                    </div>

                    {/* 확정 badge */}
                    <span className="text-[9px] px-1 py-0.5 rounded font-medium shrink-0" style={{ background: '#D1FAE5', color: '#065F46' }}>
                      확정
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── buildConfirmedAssetPromptSuffix ──────────────────────

export function buildConfirmedAssetPromptSuffix(
  selections: ConfirmedAssetSelection[],
  confirmedAssets: ConfirmedAsset[]
): { assetSuffix: string; assetReferenceImageUrls: string[] } {
  const included = selections.filter(s => s.included)
  if (included.length === 0) return { assetSuffix: '', assetReferenceImageUrls: [] }

  const byCategory: Record<string, string[]> = {}
  const referenceUrls: string[] = []

  for (const sel of included) {
    const asset = confirmedAssets.find(a => a.id === sel.assetId)
    if (!asset) continue
    const cfg = ASSET_CATEGORY_CONFIG[asset.category]
    if (!cfg) continue

    // 텍스트 프롬프트 수집
    const label = cfg.promptLabel
    const desc = asset.prompt || asset.description || asset.name
    if (!byCategory[label]) byCategory[label] = []
    byCategory[label].push(desc)

    // 레퍼런스 이미지 URL 수집 (이미지 파일만)
    const refUrl = asset.thumbnailUrl || (asset.fileType?.startsWith('image') ? asset.fileUrl : null)
    if (refUrl) referenceUrls.push(refUrl)
  }

  const parts = Object.entries(byCategory).map(([label, descs]) => `${label}: ${descs.join(', ')}`)
  const assetSuffix = parts.length > 0 ? `\n\n[Scene assets: ${parts.join(' | ')}]` : ''

  return { assetSuffix, assetReferenceImageUrls: referenceUrls }
}

// ─── initConfirmedAssetSelections ─────────────────────────

export function initConfirmedAssetSelections(confirmedAssets: ConfirmedAsset[]): ConfirmedAssetSelection[] {
  return confirmedAssets
    .filter(a => a.category === 'background' || a.category === 'prop' || a.category === 'effect')
    .map(a => ({ assetId: a.id, included: true }))
}
