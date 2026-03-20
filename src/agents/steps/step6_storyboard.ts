import { Scene, SceneAnalysis, StoryboardFrame } from '@/types'
import { formatDialoguesShort, formatTransform, calculateCutCount } from './helpers'

export function buildStoryboardPrompt(
  scene: Scene,
  analysis: SceneAnalysis,
  directorScript: string,
  cutCount?: number
): string {
  const dialogues = formatDialoguesShort(scene)
  const transform = formatTransform(scene)
  const frameCount = cutCount || calculateCutCount(scene)

  return `당신은 전문 스토리보드 아티스트이자 시각 내러티브 전문가입니다.

[씬 정보]
씬 ${scene.number}: ${scene.title}
시간: ${scene.timeStart} ~ ${scene.timeEnd}
장소: ${scene.location} (${scene.timeOfDay}${scene.weather ? ', ' + scene.weather : ''})
카메라: ${scene.cameraMovement} / ${scene.cameraAngle}
조명: ${scene.lighting}
감정 키워드: ${scene.emotionKeywords.join(', ')}
배경: ${scene.backgroundDescription}
액션: ${scene.actionDescription}
대사:
${dialogues}
${transform}

[씬 분석]
감정 흐름: ${analysis.emotionFlow}
핵심 시각적 순간: ${analysis.keyVisualMoment}

[연출 스크립트]
${directorScript.substring(0, 1000)}

이 씬을 정확히 **${frameCount}개**의 핵심 스토리보드 프레임으로 분해하세요.
(씬 길이 기반 자동 계산: 약 3초당 1컷)

각 프레임은:
- 씬의 감정 전환점이나 중요 액션 포인트에 배치
- 카메라 위치/앵글/무브먼트를 구체적으로 지시
- 레이아웃은 화면 내 요소 배치를 텍스트로 상세히 묘사

JSON 배열로 반환:
[
  {
    "frameNumber": 1,
    "description": "프레임 상세 묘사 — 캐릭터 위치, 표정, 동작, 배경 상태 등 (한국어, 2~3문장)",
    "cameraNote": "카메라 포지션/앵글/무브먼트 지시 (한국어, 1~2문장)",
    "layout": "화면 레이아웃 — 전경/중경/후경 구성, 캐릭터 위치(좌/중/우), 시선 유도 방향 (한국어)"
  }
]

반드시 JSON 배열만 반환하세요.`
}

export function parseStoryboardFrames(raw: string): StoryboardFrame[] {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []
    return parsed.map((f: any, i: number) => ({
      frameNumber: f.frameNumber || i + 1,
      description: f.description || '',
      cameraNote: f.cameraNote || '',
      layout: f.layout || '',
    }))
  } catch {
    return []
  }
}
