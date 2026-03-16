import { Scene, Project, SceneAnalysis } from '@/types'
import { formatProjectContext, formatSceneInfo } from './helpers'

export function buildAnalyzePrompt(scene: Scene, project: Project): string {
  const projectCtx = formatProjectContext(project)
  const sceneInfo = formatSceneInfo(scene)

  return `당신은 애니메이션/영화 제작 전문 씬 분석가입니다.

[작품 컨텍스트]
${projectCtx}

[씬 정보]
${sceneInfo}

위 씬을 다음 JSON 형식으로 분석하세요:
{
  "emotionFlow": "씬 시작→끝 감정 변화 흐름 (2~3문장)",
  "narrativePosition": "이 씬이 에피소드에서 하는 서사적 역할 (1~2문장)",
  "keyVisualMoment": "가장 임팩트 있는 핵심 시각적 순간 묘사 (1~2문장)",
  "technicalRequirements": "특수 효과, 복잡한 카메라워크 등 기술 요구사항 (1~2문장)",
  "childSafetyNotes": "아동 시청자 배려 포인트 (1문장)"
}

반드시 JSON만 반환하세요.`
}

export function parseAnalysisResult(raw: string): SceneAnalysis {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    return {
      emotionFlow: parsed.emotionFlow || '',
      narrativePosition: parsed.narrativePosition || '',
      keyVisualMoment: parsed.keyVisualMoment || '',
      technicalRequirements: parsed.technicalRequirements || '',
      childSafetyNotes: parsed.childSafetyNotes || '',
      raw: cleaned,
    }
  } catch {
    return {
      emotionFlow: raw,
      narrativePosition: '',
      keyVisualMoment: '',
      technicalRequirements: '',
      childSafetyNotes: '',
      raw,
    }
  }
}
