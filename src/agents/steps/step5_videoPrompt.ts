import { Scene, Project, VideoPrompts, VideoPromptCut, StoryboardFrame } from '@/types'
import { parseTimecode } from './helpers'

export function buildVideoPromptPrompt(
  scene: Scene,
  project: Project,
  directorScript: string
): string {
  return `당신은 AI 영상 생성 프롬프트 전문가입니다.
Kling AI, OpenAI Sora, Runway Gen-3 Alpha의 특성을 정확히 이해하고 있습니다.

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
  "kling": "Kling AI 최적화 (주체/동작/배경/카메라 무브먼트를 명확히 서술, 감정 톤과 조명 분위기 포함, 영문, 200단어 이내)",
  "sora": "OpenAI Sora 최적화 (물리적 일관성 강조, 서술형 장면 묘사, 시간 흐름 포함, 영문, 200단어 이내)",
  "runway": "Runway Gen-3 Alpha 최적화 (간결, 동작/모션 중심, 스타일 키워드 포함, 영문, 150단어 이내)"
}

중요:
- 각 플랫폼의 강점에 맞게 프롬프트를 차별화
- Kling: 주체·동작·배경을 구체적으로 서술, 카메라 무브먼트와 감정 톤 명시에 강함
- Sora: 물리 시뮬레이션 + 복잡한 장면에 강함
- Runway: 스타일 전이 + 짧은 모션에 강함
- 반드시 JSON만 반환하세요.`
}

/** 컷별 영상 프롬프트 빌더 — 스토리보드 프레임 + 연출 스크립트 기반 */
export function buildVideoPromptCutsPrompt(
  scene: Scene,
  project: Project,
  directorScript: string,
  storyboardFrames: StoryboardFrame[],
  cutCount: number
): string {
  const startSec = parseTimecode(scene.timeStart)
  const endSec = parseTimecode(scene.timeEnd)
  const durationSec = endSec - startSec
  const secPerCut = durationSec / cutCount

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const cutsSection = Array.from({ length: cutCount }, (_, i) => {
    const cutStart = startSec + Math.round(secPerCut * i)
    const cutEnd = i === cutCount - 1 ? endSec : startSec + Math.round(secPerCut * (i + 1))
    const frame = storyboardFrames[i]
    return [
      `[컷 ${i + 1}] ${fmtTime(cutStart)} ~ ${fmtTime(cutEnd)}`,
      frame ? `  스토리보드 묘사: ${frame.description}` : '',
      frame ? `  카메라 지시: ${frame.cameraNote}` : '',
      frame ? `  화면 레이아웃: ${frame.layout}` : '',
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  return `당신은 AI 영상 생성 프롬프트 전문가입니다.
Kling AI, OpenAI Sora, Runway Gen-3 Alpha의 특성을 정확히 이해하고 있습니다.

[작품 컨텍스트]
작품명: ${project.title}
아트 스타일: ${project.artContext.style}
색감: ${project.artContext.colorPalette.join(', ')}
무드: ${project.artContext.moodKeywords.join(', ')}
화면 비율: ${project.artContext.aspectRatio}
프레임레이트: ${project.artContext.frameRate}

[씬 정보]
씬 ${scene.number}: ${scene.title}
시간: ${scene.timeStart} ~ ${scene.timeEnd} (총 ${durationSec}초)
장소: ${scene.location} (${scene.timeOfDay}${scene.weather ? ', ' + scene.weather : ''})
카메라: ${scene.cameraMovement} / ${scene.cameraAngle}
조명: ${scene.lighting}
감정 키워드: ${scene.emotionKeywords.join(', ')}
액션: ${scene.actionDescription}
사운드: ${scene.soundDesign}
${scene.isAITransformScene && scene.transform ? `AI 변환 씬:
  트리거: ${scene.transform.triggerMoment}
  변환 전: ${scene.transform.stateBefore}
  변환 후: ${scene.transform.stateAfter}
  방식: ${scene.transform.transitionStyle}
` : ''}

[연출 스크립트 핵심]
${directorScript.substring(0, 600)}

[스토리보드 기반 컷 구성 — 반드시 각 컷의 스토리보드 지시를 영상 프롬프트에 반영하세요]
${cutsSection}

위 ${cutCount}개 컷 각각에 대해 3개 플랫폼 최적화 영상 프롬프트를 생성하세요.
연출 스크립트의 분위기와 스토리보드의 카메라 지시를 결합하여 일관된 시각 언어를 유지하세요.

JSON 배열로 반환:
[
  {
    "cutNumber": 1,
    "timeStart": "시작 타임코드",
    "timeEnd": "종료 타임코드",
    "storyboardFrame": 1,
    "description": "이 컷의 핵심 동작/장면 요약 (한국어, 1문장)",
    "prompts": {
      "kling": "Kling AI 최적화 (주체·동작·배경·카메라 무브먼트 명확히 서술, 감정 톤과 조명 분위기 포함, 영문, 100단어 이내)",
      "sora": "OpenAI Sora 최적화 (물리적 일관성·서술형 장면묘사·시간흐름, 영문, 100단어 이내)",
      "runway": "Runway Gen-3 Alpha 최적화 (간결·동작/모션 중심·스타일 키워드, 영문, 80단어 이내)"
    }
  }
]

중요:
- 스토리보드 카메라 지시(pan/tilt/zoom/static)를 영문 카메라 무브먼트로 변환하여 반드시 반영
- 연출 스크립트의 감정 톤을 각 컷에 일관되게 유지
- 컷 간 시각적 연속성 유지 (같은 장소·캐릭터·조명 톤)
- 반드시 JSON 배열만 반환하세요.`
}

export function parseVideoPromptCuts(raw: string): VideoPromptCut[] {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []
    return parsed.map((cut: any, i: number) => ({
      cutNumber: cut.cutNumber || i + 1,
      timeStart: cut.timeStart || '',
      timeEnd: cut.timeEnd || '',
      storyboardFrame: cut.storyboardFrame || i + 1,
      description: cut.description || '',
      prompts: {
        kling: cut.prompts?.kling || '',
        sora: cut.prompts?.sora || '',
        runway: cut.prompts?.runway || '',
      },
    }))
  } catch {
    return []
  }
}

export function parseVideoPrompts(raw: string): VideoPrompts {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    return {
      kling: parsed.kling || '',
      sora: parsed.sora || '',
      runway: parsed.runway || '',
    }
  } catch {
    return { kling: raw, sora: '', runway: '' }
  }
}
