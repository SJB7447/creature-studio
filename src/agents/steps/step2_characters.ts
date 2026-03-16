import { Scene, Character, CharacterContext } from '@/types'

export function buildCharacterContext(scene: Scene, characters: Character[]): CharacterContext {
  const sceneChars = characters.filter(c => scene.characters.includes(c.id))

  if (sceneChars.length === 0) {
    return {
      characterCount: 0,
      context: '(등장 캐릭터 없음)',
      characters: [],
    }
  }

  const charDetails = sceneChars.map(c => {
    // Find emotion variant matching scene's emotion keywords
    const matchingEmotions = c.emotionVariants.filter(ev =>
      scene.emotionKeywords.some(ek =>
        ev.emotion.includes(ek) || ek.includes(ev.emotion)
      )
    )

    // Find dialogue for this character in the scene
    const charDialogues = scene.dialogues.filter(d => d.characterId === c.id)
    const dialogueEmotions = charDialogues.map(d => d.emotion)

    return {
      name: c.name,
      nameEn: c.nameEn,
      role: c.role,
      emotionalRole: c.emotionalRole,
      appearance: c.appearance.base,
      styleKeywords: c.appearance.styleKeywords,
      colorScheme: c.appearance.colorScheme,
      fixedPromptKeywords: c.appearance.fixedPromptKeywords,
      matchingEmotions,
      dialogueEmotions,
    }
  })

  const context = charDetails.map(c => `
캐릭터: ${c.name} (${c.nameEn}) — ${c.role}
감정 역할: ${c.emotionalRole}
외형: ${c.appearance}
스타일 키워드: ${c.styleKeywords.join(', ')}
색상: ${c.colorScheme}
고정 프롬프트: ${c.fixedPromptKeywords.join(', ')}
${c.matchingEmotions.length > 0 ? `이 씬의 감정 변형:\n${c.matchingEmotions.map(e => `  - ${e.emotion}: ${e.appearanceChange} → 프롬프트 추가: ${e.promptAddition}`).join('\n')}` : ''}
${c.dialogueEmotions.length > 0 ? `대사 감정: ${c.dialogueEmotions.join(', ')}` : ''}
`.trim()).join('\n---\n')

  return {
    characterCount: sceneChars.length,
    context,
    characters: charDetails.map(c => ({
      name: c.name,
      role: c.role,
      appearance: c.appearance,
      keywords: c.fixedPromptKeywords,
    })),
  }
}
