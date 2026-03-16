import { Scene, Project, ImagePrompts, VideoPrompts, StoryboardFrame, ValidationResult } from '@/types'

export function buildValidatePrompt(
  result: {
    directorScript: string
    imagePrompts: ImagePrompts
    videoPrompts: VideoPrompts
    storyboardFrames: StoryboardFrame[]
  },
  project: Project,
  scene: Scene
): string {
  return `당신은 애니메이션 제작 품질 관리(QC) 감독입니다.
생성된 모든 결과물이 작품의 아트 스타일과 규정을 준수하는지 검수합니다.

[작품 규정]
작품명: ${project.title}
아트 스타일: ${project.artContext.style}
색감 팔레트: ${project.artContext.colorPalette.join(', ')}
무드 키워드: ${project.artContext.moodKeywords.join(', ')}
금지 요소: ${project.artContext.prohibitedElements.join(', ')}
레퍼런스 작품: ${project.artContext.referenceWorks.join(', ')}
타겟 시청자: ${project.targetAudience}

[씬 정보]
씬 ${scene.number}: ${scene.title}
감정 키워드: ${scene.emotionKeywords.join(', ')}
${scene.isAITransformScene ? `AI 변환 씬: ${scene.transform?.triggerMoment} → ${scene.transform?.stateAfter}` : '일반 씬'}

[검수 대상 — 생성된 결과물]

1. 연출 스크립트 (앞 500자):
${result.directorScript.substring(0, 500)}

2. 이미지 프롬프트:
- Base: ${result.imagePrompts.base}
- Midjourney: ${result.imagePrompts.midjourney}
- Imagen: ${result.imagePrompts.imagen}
- Negative: ${result.imagePrompts.negativePrompt}

3. 영상 프롬프트:
- Veo: ${result.videoPrompts.veo}
- Sora: ${result.videoPrompts.sora}
- Runway: ${result.videoPrompts.runway}

4. 스토리보드: ${result.storyboardFrames.length}컷
${result.storyboardFrames.map(f => `  F${f.frameNumber}: ${f.description.substring(0, 80)}`).join('\n')}

다음 JSON 형식으로 검수 결과를 반환하세요:
{
  "styleCompliance": "아트 스타일/색감/무드 준수 여부 평가 (1~2문장)",
  "prohibitedCheck": "금지 요소 포함 여부 검토 결과 (1~2문장)",
  "keyElementReflection": "핵심 씬 요소 반영 여부 — AI 변환 씬이면 변환 요소 반영 확인 (1~2문장)",
  "recommendations": "개선 권고사항 (있으면 구체적으로, 없으면 '없음')",
  "qualityGrade": "A"
}

등급 기준:
- A: 모든 항목 충족, 즉시 사용 가능
- B: 대부분 충족, 소폭 수정 권고
- C: 주요 항목 미충족, 재생성 권고

반드시 JSON만 반환하세요.`
}

export function parseValidationResult(raw: string): ValidationResult {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    return {
      styleCompliance: parsed.styleCompliance || '',
      prohibitedCheck: parsed.prohibitedCheck || '',
      keyElementReflection: parsed.keyElementReflection || '',
      recommendations: parsed.recommendations || '',
      qualityGrade: (['A', 'B', 'C'].includes(parsed.qualityGrade) ? parsed.qualityGrade : 'B') as 'A' | 'B' | 'C',
      raw: cleaned,
    }
  } catch {
    return {
      styleCompliance: '',
      prohibitedCheck: '',
      keyElementReflection: '',
      recommendations: raw,
      qualityGrade: 'B',
      raw,
    }
  }
}
