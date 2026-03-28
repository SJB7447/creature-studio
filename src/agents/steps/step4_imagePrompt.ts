import { Scene, Project, SceneAnalysis, CharacterContext, ImagePrompts, ImagePromptCut, ConfirmedAsset, StoryboardFrame } from '@/types'
import { calculateCutCount, parseTimecode } from './helpers'

function buildConfirmedAssetBlock(confirmedAssets: ConfirmedAsset[]): string {
  if (confirmedAssets.length === 0) return ''
  const chars = confirmedAssets.filter(a => a.category === 'character')
  const bgs = confirmedAssets.filter(a => a.category === 'background')
  const props = confirmedAssets.filter(a => a.category === 'prop')
  const effects = confirmedAssets.filter(a => a.category === 'effect')

  return `
[★ 확정 에셋 — 프롬프트에 반드시 반영할 확정된 비주얼 요소]
${chars.length > 0 ? `▸ 확정 캐릭터 (외형 키워드 그대로 사용):
${chars.map(a => `  - ${a.name}: ${a.prompt || a.description || '(확정 이미지 있음)'}`).join('\n')}` : ''}
${bgs.length > 0 ? `▸ 확정 배경:
${bgs.map(a => `  - ${a.name}: ${a.prompt || a.description || '(확정 이미지 있음)'}`).join('\n')}` : ''}
${props.length > 0 ? `▸ 확정 소품/오브젝트:
${props.map(a => `  - ${a.name}: ${a.prompt || a.description || '(확정 이미지 있음)'}`).join('\n')}` : ''}
${effects.length > 0 ? `▸ 확정 이펙트:
${effects.map(a => `  - ${a.name}: ${a.prompt || a.description || '(확정 이미지 있음)'}`).join('\n')}` : ''}
→ 확정 에셋의 비주얼 키워드는 모든 프롬프트에 그대로 포함하여 작품 전체의 일관성을 유지하세요.
`
}

/** 씬에 한글 텍스트 요소가 있는지 감지하고 플랫폼별 가이드라인 반환 */
function buildKoreanTextGuidance(scene: Scene): string {
  const koreanPattern = /[가-힣]/
  const hasKorean =
    koreanPattern.test(scene.backgroundDescription || '') ||
    koreanPattern.test(scene.actionDescription || '') ||
    koreanPattern.test(scene.title || '')

  if (!hasKorean) return ''

  return `
[★ 한글 텍스트 렌더링 가이드 — 이 씬에 한글 텍스트 요소가 포함될 수 있음]
플랫폼별 한글 텍스트 처리 전략:

▸ Kling: 텍스트가 포함된 오브젝트(간판, 책, 자막 등)는 "clean, sharp Korean Hangul text" + "crisp legible characters" + "high-resolution typography" 키워드를 반드시 추가. 텍스트 영역을 별도 레이어처럼 묘사하되, 배경과 대비가 명확한 색상 지정.

▸ Midjourney: 한글 텍스트를 직접 렌더링하지 말고, 텍스트가 있는 오브젝트를 "Korean-style signage/typography aesthetic", "clean minimalist Korean text design", "Korean calligraphy style" 등으로 간접 묘사. 네거티브 프롬프트에 "garbled text, gibberish, misspelled characters, broken typography, illegible text" 반드시 추가.

▸ Imagen 3: 텍스트 렌더링이 가장 우수. 한글 텍스트가 필요한 경우 해당 텍스트를 큰따옴표(" ") 안에 직접 명시 (예: "the sign reads '서울'"처럼). 자연어로 텍스트 배치·서체·색상 상세 기술.

→ 텍스트 품질 공통 원칙: 고해상도 + 선명한 획 + 명확한 배경 대비 강조
`
}

/** 기존 단일 이미지 프롬프트 빌더 (하위 호환용, 대표 1장) */
export function buildImagePromptPrompt(
  scene: Scene,
  project: Project,
  analysis: SceneAnalysis,
  characterContext: CharacterContext,
  confirmedAssets: ConfirmedAsset[] = []
): string {
  const charKeywords = characterContext.characters
    .map(c => `${c.name}: ${c.keywords.join(', ')}`)
    .join('\n')

  const confirmedBlock = buildConfirmedAssetBlock(confirmedAssets)
  const koreanTextGuidance = buildKoreanTextGuidance(scene)

  return `당신은 AI 이미지 생성 전문 프롬프트 엔지니어입니다.
Midjourney, Google Imagen 3, Kling 등의 도구에 정통하며, 특히 한글 텍스트가 포함된 장면의 고품질 렌더링에 특화되어 있습니다.

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
${confirmedBlock}${koreanTextGuidance}
${scene.isAITransformScene && scene.transform ? `[AI 변환 씬 — 변환 후 상태를 중심으로 프롬프트 생성]
변환 후: ${scene.transform.stateAfter}
방식: ${scene.transform.transitionStyle}
` : ''}

다음 4가지 이미지 프롬프트를 JSON 형식으로 반환하세요:
{
  "kling": "Kling 이미지 모델 최적화 (주체·배경·조명·카메라 앵글·스타일 구체적 서술, 영문 150~200단어. 한글 텍스트 포함 시: 'clean sharp Korean Hangul text', 'crisp legible characters', 'high-resolution typography', 'high contrast text against background' 추가)",
  "midjourney": "Midjourney v6 최적화 (--ar ${project.artContext.aspectRatio.replace(':', ':')} --style raw --v 6.1 포함, 영문. 한글 텍스트 포함 시: 직접 렌더링 대신 'Korean-style typography aesthetic', 'minimalist Korean signage design' 등으로 간접 묘사)",
  "imagen": "Google Imagen 3 최적화 (자연어 서술형, 영문. 한글 텍스트 포함 시: 텍스트 내용을 큰따옴표 안에 직접 명시 — 예: the sign reads '한글텍스트'. 서체 스타일·크기·색상·배치 상세 기술)",
  "negativePrompt": "네거티브 프롬프트 (금지 요소 + 품질 관련, 영문, 쉼표 구분. 반드시 포함: garbled text, gibberish, illegible text, broken typography, misspelled characters, blurry text, distorted letters)"
}

중요:
- 확정 에셋의 비주얼 키워드를 최우선으로 반영 (일관성 유지)
- 캐릭터의 고정 프롬프트 키워드를 반드시 포함
- 작품의 아트 스타일을 정확히 반영
- 금지 요소는 반드시 네거티브 프롬프트에 포함
- 한글 텍스트가 있는 경우: 각 플랫폼별 가이드라인에 따라 텍스트 품질 키워드 필수 적용
- 네거티브 프롬프트에 텍스트 품질 관련 항목(garbled text, illegible text 등) 항상 포함
- 반드시 JSON만 반환하세요.`
}

/** 컷별 이미지 프롬프트 빌더 — 스토리보드 프레임 + 씬 길이에 따라 다수의 컷 프롬프트 생성 */
export function buildImagePromptCutsPrompt(
  scene: Scene,
  project: Project,
  analysis: SceneAnalysis,
  characterContext: CharacterContext,
  cutCount: number,
  confirmedAssets: ConfirmedAsset[] = [],
  storyboardFrames: StoryboardFrame[] = []
): string {
  const charKeywords = characterContext.characters
    .map(c => `${c.name}: ${c.keywords.join(', ')}`)
    .join('\n')

  const confirmedBlock = buildConfirmedAssetBlock(confirmedAssets)

  const startSec = parseTimecode(scene.timeStart)
  const endSec = parseTimecode(scene.timeEnd)
  const durationSec = endSec - startSec
  const secPerCut = durationSec / cutCount

  // 각 컷의 시간 구간 생성
  const cutTimeRanges = Array.from({ length: cutCount }, (_, i) => {
    const cutStart = startSec + Math.round(secPerCut * i)
    const cutEnd = i === cutCount - 1 ? endSec : startSec + Math.round(secPerCut * (i + 1))
    const fmtTime = (s: number) => {
      const m = Math.floor(s / 60)
      const sec = s % 60
      return `${m}:${String(sec).padStart(2, '0')}`
    }
    return `컷 ${i + 1}: ${fmtTime(cutStart)} ~ ${fmtTime(cutEnd)}`
  }).join('\n')

  // 스토리보드 프레임이 있으면 컷별 참조 섹션 구성
  const storyboardSection = storyboardFrames.length > 0
    ? `\n[★ 스토리보드 컷별 카메라·레이아웃 지시 — 반드시 이미지 프롬프트에 반영]\n` +
      Array.from({ length: cutCount }, (_, i) => {
        const frame = storyboardFrames[i]
        if (!frame) return `컷 ${i + 1}: (스토리보드 없음)`
        return [
          `컷 ${i + 1} — 프레임 ${frame.frameNumber}:`,
          `  묘사: ${frame.description}`,
          `  카메라: ${frame.cameraNote}`,
          `  레이아웃: ${frame.layout}`,
        ].join('\n')
      }).join('\n\n')
    : ''

  const koreanTextGuidance = buildKoreanTextGuidance(scene)

  return `당신은 AI 이미지 생성 전문 프롬프트 엔지니어입니다.
Midjourney, Google Imagen 3, Kling 등의 도구에 정통하며, 한글 텍스트가 포함된 장면의 고품질 렌더링에 특화되어 있습니다.

이 씬은 총 ${durationSec}초 분량이며, 영상 제작을 위해 **${cutCount}장의 이미지 컷**이 필요합니다.
각 컷은 씬의 시간 흐름에 따라 장면이 자연스럽게 이어져야 합니다.

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
${confirmedBlock}${koreanTextGuidance}
${scene.isAITransformScene && scene.transform ? `[AI 변환 씬]
변환 전: ${scene.transform.stateBefore}
변환 후: ${scene.transform.stateAfter}
방식: ${scene.transform.transitionStyle}
트리거: ${scene.transform.triggerMoment}
` : ''}

[컷 시간 구간]
${cutTimeRanges}
${storyboardSection}

다음 형식의 JSON 배열을 반환하세요. **정확히 ${cutCount}개의 컷**을 생성합니다:
[
  {
    "cutNumber": 1,
    "timeStart": "시작 타임코드",
    "timeEnd": "종료 타임코드",
    "description": "이 컷에서 보여줄 장면 설명 (한국어, 1~2문장)",
    "prompts": {
      "kling": "Kling 이미지 모델 최적화 (주체·배경·조명·카메라 앵글·스타일 구체적 서술, 영문 100~150단어. 한글 텍스트 포함 시: 'clean sharp Korean Hangul text', 'crisp legible characters', 'high contrast text against background' 추가)",
      "midjourney": "Midjourney v6 최적화 (--ar ${project.artContext.aspectRatio.replace(':', ':')} --style raw --v 6.1 포함, 영문. 한글 텍스트 포함 시: 'Korean-style typography aesthetic' 등으로 간접 묘사)",
      "imagen": "Google Imagen 3 최적화 (자연어 서술형, 영문. 한글 텍스트 포함 시: 텍스트 내용을 큰따옴표 안에 직접 명시 — 예: the sign reads '한글텍스트'. 서체·크기·색상·배치 상세 기술)",
      "negativePrompt": "네거티브 프롬프트 (금지 요소 + 품질 관련, 영문, 쉼표 구분. 반드시 포함: garbled text, gibberish, illegible text, broken typography, blurry text, distorted letters)"
    }
  }
]

중요:
- 스토리보드의 카메라 지시(cameraNote)와 레이아웃(layout)을 각 컷 프롬프트의 구도·카메라 앵글에 반드시 반영
- 확정 에셋의 비주얼 키워드를 최우선으로 모든 컷에 반영 (일관성 유지)
- 각 컷은 시간 순서대로 장면이 자연스럽게 이어져야 함
- 캐릭터의 고정 프롬프트 키워드를 모든 컷에 반드시 포함
- 작품의 아트 스타일을 모든 컷에 정확히 반영
- 금지 요소는 모든 컷의 네거티브 프롬프트에 포함
- 컷 간 시각적 일관성 유지 (같은 장소, 같은 캐릭터 외형, 같은 조명 톤)
- 감정 흐름에 따라 컷별로 표정/포즈/구도가 점진적으로 변화
- 한글 텍스트가 있는 경우: 각 플랫폼별 한글 텍스트 가이드라인 필수 적용, 모든 컷의 negativePrompt에 'garbled text, illegible text' 포함
- 반드시 JSON 배열만 반환하세요.`
}

export function parseImagePrompts(raw: string): ImagePrompts {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    return {
      kling: parsed.kling || '',
      midjourney: parsed.midjourney || '',
      imagen: parsed.imagen || '',
      negativePrompt: parsed.negativePrompt || '',
    }
  } catch {
    return { kling: raw, midjourney: '', imagen: '', negativePrompt: '' }
  }
}

export function parseImagePromptCuts(raw: string): ImagePromptCut[] {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []
    return parsed.map((cut: any, i: number) => ({
      cutNumber: cut.cutNumber || i + 1,
      timeStart: cut.timeStart || '',
      timeEnd: cut.timeEnd || '',
      description: cut.description || '',
      prompts: {
        kling: cut.prompts?.kling || '',
        midjourney: cut.prompts?.midjourney || '',
        imagen: cut.prompts?.imagen || '',
        negativePrompt: cut.prompts?.negativePrompt || '',
      },
    }))
  } catch {
    return []
  }
}
