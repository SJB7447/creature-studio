import { Scene, Project, SceneAnalysis, CharacterContext, ImagePrompts } from '@/types'

export function buildImagePromptPrompt(
  scene: Scene,
  project: Project,
  analysis: SceneAnalysis,
  characterContext: CharacterContext
): string {
  const charKeywords = characterContext.characters
    .map(c => `${c.name}: ${c.keywords.join(', ')}`)
    .join('\n')

  return `당신은 AI 이미지 생성 전문 프롬프트 엔지니어입니다.
Midjourney, Google Imagen, Stable Diffusion 등의 도구에 정통합니다.

[작품 아트 스타일]
스타일: ${project.artContext.style}
색감 팔레트: ${project.artContext.colorPalette.join(', ')}
무드 키워드: ${project.artContext.moodKeywords.join(', ')}
금지 요소: ${project.artContext.prohibitedElements.join(', ')}
레퍼런스 작품: ${project.artContext.referenceWorks.join(', ')}
화면 비율: ${project.artContext.aspectRatio}

[씬 정보]
씬 ${scene.number}: ${scene.title}
장소: ${scene.location} (${scene.timeOfDay}${scene.weather ? ', ' + scene.weather : ''})
카메라: ${scene.cameraMovement} / ${scene.cameraAngle}
조명: ${scene.lighting} | 색보정: ${scene.colorGrade}
감정 키워드: ${scene.emotionKeywords.join(', ')}
배경 묘사: ${scene.backgroundDescription}
액션: ${scene.actionDescription}

[캐릭터 프롬프트 키워드]
${charKeywords || '(캐릭터 없음)'}

[씬 분석]
핵심 시각적 순간: ${analysis.keyVisualMoment}
감정 흐름: ${analysis.emotionFlow}

${scene.isAITransformScene && scene.transform ? `[AI 변환 씬 — 변환 후 상태를 중심으로 프롬프트 생성]
변환 후: ${scene.transform.stateAfter}
방식: ${scene.transform.transitionStyle}
` : ''}

다음 4가지 이미지 프롬프트를 JSON 형식으로 반환하세요:
{
  "base": "기본 이미지 프롬프트 (영문, 150~200단어, 상세 묘사형)",
  "midjourney": "Midjourney v6 최적화 (--ar ${project.artContext.aspectRatio.replace(':', ':')} --style raw --v 6.1 포함, 영문)",
  "imagen": "Google Imagen 3 최적화 (자연어 서술형, 영문, 디테일한 장면 묘사)",
  "negativePrompt": "네거티브 프롬프트 (금지 요소 + 품질 관련, 영문, 쉼표 구분)"
}

중요:
- 캐릭터의 고정 프롬프트 키워드를 반드시 포함
- 작품의 아트 스타일을 정확히 반영
- 금지 요소는 반드시 네거티브 프롬프트에 포함
- 반드시 JSON만 반환하세요.`
}

export function parseImagePrompts(raw: string): ImagePrompts {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    return {
      base: parsed.base || '',
      midjourney: parsed.midjourney || '',
      imagen: parsed.imagen || '',
      negativePrompt: parsed.negativePrompt || '',
    }
  } catch {
    return { base: raw, midjourney: '', imagen: '', negativePrompt: '' }
  }
}
