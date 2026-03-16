import { Scene, Project, VideoPrompts } from '@/types'

export function buildVideoPromptPrompt(
  scene: Scene,
  project: Project,
  directorScript: string
): string {
  return `당신은 AI 영상 생성 프롬프트 전문가입니다.
Google Veo 2, OpenAI Sora, Runway Gen-3 Alpha의 특성을 정확히 이해하고 있습니다.

[작품 컨텍스트]
작품명: ${project.title}
아트 스타일: ${project.artContext.style}
색감: ${project.artContext.colorPalette.join(', ')}
무드: ${project.artContext.moodKeywords.join(', ')}
화면 비율: ${project.artContext.aspectRatio}
프레임레이트: ${project.artContext.frameRate}

[씬 정보]
씬 ${scene.number}: ${scene.title}
시간: ${scene.timeStart} ~ ${scene.timeEnd}
장소: ${scene.location} (${scene.timeOfDay}${scene.weather ? ', ' + scene.weather : ''})
카메라: ${scene.cameraMovement} / ${scene.cameraAngle}
조명: ${scene.lighting}
감정 키워드: ${scene.emotionKeywords.join(', ')}
액션: ${scene.actionDescription}
사운드: ${scene.soundDesign}
${scene.isAITransformScene && scene.transform ? `
AI 변환 씬:
  트리거: ${scene.transform.triggerMoment}
  변환 전: ${scene.transform.stateBefore}
  변환 후: ${scene.transform.stateAfter}
  방식: ${scene.transform.transitionStyle}
  소요: ${scene.transform.duration}
` : ''}

[연출 스크립트 핵심]
${directorScript.substring(0, 800)}

각 플랫폼에 최적화된 영상 프롬프트를 JSON으로 반환하세요:
{
  "veo": "Google Veo 2 최적화 (카메라 무브먼트 서술, 분위기/조명 묘사, 장면 전환 포함, 영문, 200단어 이내)",
  "sora": "OpenAI Sora 최적화 (물리적 일관성 강조, 서술형 장면 묘사, 시간 흐름 포함, 영문, 200단어 이내)",
  "runway": "Runway Gen-3 Alpha 최적화 (간결, 동작/모션 중심, 스타일 키워드 포함, 영문, 150단어 이내)"
}

중요:
- 각 플랫폼의 강점에 맞게 프롬프트를 차별화
- Veo: 시네마틱 카메라워크 + 분위기 묘사에 강함
- Sora: 물리 시뮬레이션 + 복잡한 장면에 강함
- Runway: 스타일 전이 + 짧은 모션에 강함
- 반드시 JSON만 반환하세요.`
}

export function parseVideoPrompts(raw: string): VideoPrompts {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    return {
      veo: parsed.veo || '',
      sora: parsed.sora || '',
      runway: parsed.runway || '',
    }
  } catch {
    return { veo: raw, sora: '', runway: '' }
  }
}
