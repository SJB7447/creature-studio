'use client'

import { useState } from 'react'
import { Character, ConfirmedAsset } from '@/types'
import { ChevronDown, User, CheckCircle, X, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CharacterSelection {
  characterId: string
  included: boolean
  emotionVariant: string  // '' = 기본 외형
}

interface Props {
  /** 씬에 등장하는 캐릭터 ID 목록 */
  sceneCharacterIds: string[]
  allCharacters: Character[]
  confirmedAssets: ConfirmedAsset[]
  selections: CharacterSelection[]
  onChange: (selections: CharacterSelection[]) => void
}

export function CharacterController({
  sceneCharacterIds,
  allCharacters,
  confirmedAssets,
  selections,
  onChange,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sceneChars = allCharacters.filter(c => sceneCharacterIds.includes(c.id))

  function getSelection(charId: string): CharacterSelection {
    return selections.find(s => s.characterId === charId) ?? {
      characterId: charId,
      included: true,
      emotionVariant: '',
    }
  }

  function updateSelection(charId: string, patch: Partial<CharacterSelection>) {
    const current = getSelection(charId)
    const next = { ...current, ...patch }
    const others = selections.filter(s => s.characterId !== charId)
    onChange([...others, next])
  }

  /** 캐릭터 ID에 대응하는 확정 에셋 이미지 찾기 */
  function getCharacterAsset(char: Character): ConfirmedAsset | null {
    return confirmedAssets.find(a =>
      a.category === 'character' &&
      (a.name === char.name ||
        a.name === char.nameEn ||
        a.name.toLowerCase().includes(char.name.toLowerCase()) ||
        a.name.toLowerCase().includes((char.nameEn ?? '').toLowerCase()))
    ) ?? null
  }

  /** 선택된 캐릭터 상태에서 프롬프트 키워드 추출 */
  function getActiveKeywords(char: Character, selection: CharacterSelection): string[] {
    const base = [...char.appearance.fixedPromptKeywords]
    if (selection.emotionVariant) {
      const variant = char.emotionVariants.find(v => v.emotion === selection.emotionVariant)
      if (variant?.promptAddition) {
        base.push(variant.promptAddition)
      }
    }
    return base
  }

  if (sceneChars.length === 0) {
    return (
      <div className="p-3 rounded-xl border text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
        <User className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--color-text-sub)' }} />
        <p className="text-[11px]" style={{ color: 'var(--color-text-sub)' }}>이 씬에 등장하는 캐릭터가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sceneChars.map(char => {
        const sel = getSelection(char.id)
        const asset = getCharacterAsset(char)
        const isExpanded = expandedId === char.id
        const activeKeywords = getActiveKeywords(char, sel)

        return (
          <div
            key={char.id}
            className="rounded-xl border overflow-hidden transition-opacity"
            style={{
              borderColor: sel.included ? '#C4B5FD' : 'var(--color-border)',
              background: sel.included ? '#FAFAF9' : 'var(--color-surface-2)',
              opacity: sel.included ? 1 : 0.5,
            }}
          >
            {/* Character row header */}
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              {/* Toggle */}
              <button
                onClick={() => updateSelection(char.id, { included: !sel.included })}
                className="shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors"
                style={{
                  background: sel.included ? '#7C3AED' : 'transparent',
                  borderColor: sel.included ? '#7C3AED' : 'var(--color-border)',
                }}
              >
                {sel.included && <CheckCircle className="w-3 h-3 text-white" />}
              </button>

              {/* Avatar / confirmed asset image */}
              <div className="w-8 h-8 rounded-full overflow-hidden border shrink-0 flex items-center justify-center"
                style={{ borderColor: '#C4B5FD', background: '#EDE9FE' }}>
                {asset?.thumbnailUrl ? (
                  <img src={asset.thumbnailUrl} alt={char.name} className="w-full h-full object-cover" />
                ) : asset?.fileUrl && asset.fileType?.startsWith('image') ? (
                  <img src={asset.fileUrl} alt={char.name} className="w-full h-full object-cover" />
                ) : char.profileImage ? (
                  <img src={char.profileImage} alt={char.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4" style={{ color: '#7C3AED' }} />
                )}
              </div>

              {/* Name + role */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{char.name}</span>
                  {char.nameEn && (
                    <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text-sub)' }}>{char.nameEn}</span>
                  )}
                  {asset && (
                    <span className="text-[9px] px-1 py-0.5 rounded font-medium shrink-0" style={{ background: '#D1FAE5', color: '#065F46' }}>
                      확정
                    </span>
                  )}
                </div>
                <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--color-text-sub)' }}>{char.role}</p>
              </div>

              {/* Expand toggle */}
              {sel.included && (
                <button
                  onClick={() => setExpandedId(isExpanded ? null : char.id)}
                  className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors shrink-0"
                >
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isExpanded && 'rotate-180')}
                    style={{ color: 'var(--color-text-sub)' }} />
                </button>
              )}
            </div>

            {/* Expanded: emotion + keyword preview */}
            {sel.included && isExpanded && (
              <div className="px-3 pb-3 pt-1 border-t space-y-2.5" style={{ borderColor: '#E5E7EB', background: 'white' }}>
                {/* Confirmed asset reference info */}
                {asset && (
                  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: '#F0FDF4' }}>
                    <ImageIcon className="w-3 h-3 shrink-0" style={{ color: '#059669' }} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium" style={{ color: '#065F46' }}>확정 에셋 레퍼런스 사용</p>
                      <p className="text-[10px] truncate" style={{ color: '#059669' }}>{asset.name}</p>
                    </div>
                  </div>
                )}

                {/* Emotion variant selector */}
                {char.emotionVariants.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--color-text-sub)' }}>감정 상태</p>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => updateSelection(char.id, { emotionVariant: '' })}
                        className="px-2 py-1 rounded-md text-[10px] font-medium border transition-colors"
                        style={{
                          background: sel.emotionVariant === '' ? '#7C3AED' : 'var(--color-surface)',
                          color: sel.emotionVariant === '' ? 'white' : 'var(--color-text-sub)',
                          borderColor: sel.emotionVariant === '' ? '#7C3AED' : 'var(--color-border)',
                        }}
                      >
                        기본
                      </button>
                      {char.emotionVariants.map(v => (
                        <button
                          key={v.emotion}
                          onClick={() => updateSelection(char.id, { emotionVariant: v.emotion })}
                          className="px-2 py-1 rounded-md text-[10px] font-medium border transition-colors"
                          style={{
                            background: sel.emotionVariant === v.emotion ? '#7C3AED' : 'var(--color-surface)',
                            color: sel.emotionVariant === v.emotion ? 'white' : 'var(--color-text-sub)',
                            borderColor: sel.emotionVariant === v.emotion ? '#7C3AED' : 'var(--color-border)',
                          }}
                          title={v.appearanceChange}
                        >
                          {v.emotion}
                        </button>
                      ))}
                    </div>
                    {sel.emotionVariant && (() => {
                      const variant = char.emotionVariants.find(v => v.emotion === sel.emotionVariant)
                      return variant ? (
                        <p className="text-[10px] mt-1.5 italic" style={{ color: '#6D28D9' }}>
                          {variant.appearanceChange}
                        </p>
                      ) : null
                    })()}
                  </div>
                )}

                {/* Active prompt keywords preview */}
                {activeKeywords.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--color-text-sub)' }}>적용 키워드</p>
                    <div className="flex flex-wrap gap-1">
                      {activeKeywords.map((kw, i) => (
                        <span
                          key={i}
                          className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                          style={{ background: '#EDE9FE', color: '#6D28D9' }}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * 선택된 캐릭터 상태에서 프롬프트 suffix 생성
 * 씬 이미지 프롬프트에 append해서 캐릭터 일관성 강화
 */
export function buildCharacterPromptSuffix(
  selections: CharacterSelection[],
  allCharacters: Character[],
  confirmedAssets: ConfirmedAsset[]
): { promptSuffix: string; referenceImageUrls: string[] } {
  const included = selections.filter(s => s.included)

  const promptParts: string[] = []
  const referenceUrls: string[] = []

  for (const sel of included) {
    const char = allCharacters.find(c => c.id === sel.characterId)
    if (!char) continue

    // Fixed prompt keywords
    const keywords = [...char.appearance.fixedPromptKeywords]

    // Emotion variant addition
    if (sel.emotionVariant) {
      const variant = char.emotionVariants.find(v => v.emotion === sel.emotionVariant)
      if (variant?.promptAddition) {
        keywords.push(variant.promptAddition)
      }
    }

    if (keywords.length > 0) {
      promptParts.push(`${char.nameEn || char.name}: ${keywords.join(', ')}`)
    }

    // Confirmed asset reference image
    const asset = confirmedAssets.find(a =>
      a.category === 'character' &&
      a.fileUrl &&
      (a.name === char.name ||
        a.name === char.nameEn ||
        a.name.toLowerCase().includes(char.name.toLowerCase()))
    )
    if (asset?.fileUrl) {
      referenceUrls.push(asset.fileUrl)
    }
  }

  const promptSuffix = promptParts.length > 0
    ? `\n\n[Character details: ${promptParts.join(' | ')}]`
    : ''

  return { promptSuffix, referenceImageUrls: referenceUrls }
}

/**
 * 씬의 캐릭터 ID 목록에서 초기 선택 상태 생성
 */
export function initCharacterSelections(
  sceneCharacterIds: string[],
  allCharacters: Character[],
  sceneEmotionKeywords: string[]
): CharacterSelection[] {
  return sceneCharacterIds.map(id => {
    const char = allCharacters.find(c => c.id === id)
    // 씬의 감정 키워드와 매칭되는 emotion variant 자동 선택
    const matchedVariant = char?.emotionVariants.find(ev =>
      sceneEmotionKeywords.some(ek =>
        ev.emotion.includes(ek) || ek.includes(ev.emotion)
      )
    )
    return {
      characterId: id,
      included: true,
      emotionVariant: matchedVariant?.emotion ?? '',
    }
  })
}
