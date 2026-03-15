import { GoogleGenerativeAI } from '@google/generative-ai'
import { Scene, Project, Character, AgentResult, AgentStep, ImagePrompts, VideoPrompts, StoryboardFrame } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

async function callGemini(prompt: string): Promise<string> {
  const result = await model.generateContent(prompt)
  return result.response.text()
}

function buildProjectContext(project: Project): string {
  return `
작품명: ${project.title} (${project.titleEn})
장르: ${project.genre.join(', ')}
타겟 시청자: ${project.targetAudience}
아트 스타일: ${project.artContext.style}
색감: ${project.artContext.colorPalette.join(', ')}
무드 키워드: ${project.artContext.moodKeywords.join(', ')}
금지 요소: ${project.artContext.prohibitedElements.join(', ')}
레퍼런스 작품: ${project.artContext.referenceWorks.join(', ')}
화면 비율: ${project.artContext.aspectRatio}
`.trim()
}

function buildCharacterContext(scene: Scene, characters: Character[]): string {
  const sceneChars = characters.filter(c => scene.characters.includes(c.id))
  if (sceneChars.length === 0) return '(등장 캐릭터 없음)'
  return sceneChars.map(c => `
캐릭터: ${c.name} (${c.role})
외형: ${c.appearance.base}
스타일 키워드: ${c.appearance.styleKeywords.join(', ')}
색상: ${c.appearance.colorScheme}
고정 프롬프트: ${c.appearance.fixedPromptKeywords.join(', ')}
`).join('\n---\n')
}

function buildSceneContext(scene: Scene): string {
  return `
씬 ${scene.number}: ${scene.title}
시간: ${scene.timeStart} ~ ${scene.timeEnd}
장소: ${scene.location} (${scene.timeOfDay}${scene.weather ? ', ' + scene.weather : ''})
카메라 무브먼트: ${scene.cameraMovement}
카메라 앵글: ${scene.cameraAngle}
조명: ${scene.lighting}
색보정: ${scene.colorGrade}
감정 키워드: ${scene.emotionKeywords.join(', ')}
배경 묘사: ${scene.backgroundDescription}
액션: ${scene.actionDescription}
대사:
${scene.dialogues.map(d => `  ${d.characterName} (${d.emotion}): "${d.line}" [${d.direction}]`).join('\n')}
사운드: ${scene.soundDesign}
연출 노트: ${scene.directorNote}
${scene.isAITransformScene && scene.transform ? `
AI 변환 씬:
  트리거: ${scene.transform.triggerMoment}
  변환 전: ${scene.transform.stateBefore}
  변환 후: ${scene.transform.stateAfter}
  방식: ${scene.transform.transitionStyle}
  소요: ${scene.transform.duration}
` : ''}
`.trim()
}

export class SceneDirectorAgent {
  private onStep?: (step: AgentStep) => void

  constructor(onStep?: (step: AgentStep) => void) {
    this.onStep = onStep
  }

  private updateStep(step: AgentStep) {
    this.onStep?.(step)
  }

  async run(scene: Scene, project: Project, characters: Character[]): Promise<AgentResult> {
    const steps: AgentStep[] = [
      { id: 'analyze', label: '씬 분석 중...', status: 'pending' },
      { id: 'character', label: '캐릭터 컨텍스트 구성 중...', status: 'pending' },
      { id: 'script', label: '연출 스크립트 생성 중...', status: 'pending' },
      { id: 'image', label: '이미지 프롬프트 생성 중...', status: 'pending' },
      { id: 'video', label: '영상 프롬프트 생성 중...', status: 'pending' },
      { id: 'storyboard', label: '스토리보드 프레임 분해 중...', status: 'pending' },
      { id: 'validate', label: '검수 및 최종 정제 중...', status: 'pending' },
    ]

    const projectCtx = buildProjectContext(project)
    const sceneCtx = buildSceneContext(scene)
    const charCtx = buildCharacterContext(scene, characters)

    // Step 1: Analyze
    steps[0].status = 'running'
    this.updateStep(steps[0])
    let analysis = ''
    try {
      analysis = await callGemini(`
당신은 애니메이션/영화 제작 전문 씬 분석가입니다.

[작품 컨텍스트]
${projectCtx}

[씬 정보]
${sceneCtx}

위 씬의 다음 항목을 분석하세요:
1. 감정 흐름 (씬 시작→끝 감정 변화)
2. 서사적 위치 (이 씬이 에피소드에서 하는 역할)
3. 핵심 시각적 이미지 (가장 임팩트 있는 순간)
4. 기술적 요구사항 (특수 효과, 복잡한 카메라워크 등)
5. 아동 시청자 배려 포인트

한국어로 간결하게 작성하세요.
`)
      steps[0].status = 'done'
      steps[0].result = analysis.substring(0, 100) + '...'
    } catch (e: any) {
      steps[0].status = 'error'
      steps[0].error = e.message
    }
    this.updateStep(steps[0])

    // Step 2: Character context (no API call needed)
    steps[1].status = 'running'
    this.updateStep(steps[1])
    await new Promise(r => setTimeout(r, 300))
    steps[1].status = 'done'
    steps[1].result = `${scene.characters.length}명의 캐릭터 컨텍스트 로드 완료`
    this.updateStep(steps[1])

    // Step 3: Director Script
    steps[2].status = 'running'
    this.updateStep(steps[2])
    let directorScript = ''
    try {
      directorScript = await callGemini(`
당신은 베테랑 애니메이션 감독입니다.

[작품 컨텍스트]
${projectCtx}

[씬 분석]
${analysis}

[씬 정보]
${sceneCtx}

[등장 캐릭터]
${charCtx}

위 씬에 대한 상세 연출 스크립트를 작성하세요. 포함 항목:
- 시퀀스별 카메라 포지션 및 무브먼트
- 캐릭터 동작 지시 (표정, 몸짓, 동선)
- 조명/색감 연출 지시
- 음향 연출 타이밍
- 편집 포인트 및 컷 연결 지시

한국어 전문 연출 스크립트 형식으로 작성하세요.
`)
      steps[2].status = 'done'
      steps[2].result = '연출 스크립트 생성 완료'
    } catch (e: any) {
      steps[2].status = 'error'
      steps[2].error = e.message
      directorScript = '스크립트 생성 실패'
    }
    this.updateStep(steps[2])

    // Step 4: Image Prompts
    steps[3].status = 'running'
    this.updateStep(steps[3])
    let imagePrompts: ImagePrompts = { base: '', midjourney: '', imagen: '', negativePrompt: '' }
    try {
      const imgRaw = await callGemini(`
당신은 AI 이미지 생성 전문 프롬프트 엔지니어입니다.

[작품 아트 스타일]
${projectCtx}

[씬 정보]
${sceneCtx}

[등장 캐릭터]
${charCtx}

[씬 분석]
${analysis}

다음 4가지를 JSON 형식으로 반환하세요:
{
  "base": "기본 이미지 프롬프트 (영문, 200자 이내)",
  "midjourney": "Midjourney 최적화 버전 (--ar, --style, --v 파라미터 포함)",
  "imagen": "Google Imagen 최적화 버전 (자연어 서술형)",
  "negativePrompt": "네거티브 프롬프트 (금지 요소 + 품질 관련)"
}

반드시 JSON만 반환하세요.
`)
      const cleaned = imgRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      imagePrompts = JSON.parse(cleaned)
      steps[3].status = 'done'
      steps[3].result = '이미지 프롬프트 4종 생성 완료'
    } catch (e: any) {
      steps[3].status = 'error'
      steps[3].error = e.message
    }
    this.updateStep(steps[3])

    // Step 5: Video Prompts
    steps[4].status = 'running'
    this.updateStep(steps[4])
    let videoPrompts: VideoPrompts = { veo: '', sora: '', runway: '' }
    try {
      const vidRaw = await callGemini(`
당신은 AI 영상 생성 프롬프트 전문가입니다.

[씬 정보]
${sceneCtx}

[연출 스크립트 요약]
${directorScript.substring(0, 500)}

[이미지 프롬프트 기반]
${imagePrompts.base}

각 플랫폼에 최적화된 영상 프롬프트를 JSON으로 반환하세요:
{
  "veo": "Google Veo 2 최적화 (카메라 무브먼트, 분위기, 장면 묘사 중심, 영문)",
  "sora": "OpenAI Sora 최적화 (서술형, 물리 묘사 정확, 영문)",
  "runway": "Runway Gen-3 최적화 (간결, 동작 중심, 영문)"
}

반드시 JSON만 반환하세요.
`)
      const cleaned = vidRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      videoPrompts = JSON.parse(cleaned)
      steps[4].status = 'done'
      steps[4].result = 'Veo/Sora/Runway 프롬프트 생성 완료'
    } catch (e: any) {
      steps[4].status = 'error'
      steps[4].error = e.message
    }
    this.updateStep(steps[4])

    // Step 6: Storyboard Frames
    steps[5].status = 'running'
    this.updateStep(steps[5])
    let storyboardFrames: StoryboardFrame[] = []
    try {
      const sbRaw = await callGemini(`
당신은 스토리보드 아티스트입니다.

[씬 정보]
${sceneCtx}

[연출 스크립트]
${directorScript.substring(0, 800)}

이 씬을 3~6개의 핵심 스토리보드 프레임으로 분해하세요. JSON 배열로 반환:
[
  {
    "frameNumber": 1,
    "description": "프레임 상세 묘사 (한국어)",
    "cameraNote": "카메라 포지션/무브먼트 (한국어)",
    "layout": "화면 레이아웃 텍스트 묘사 (한국어)"
  }
]

반드시 JSON 배열만 반환하세요.
`)
      const cleaned = sbRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      storyboardFrames = JSON.parse(cleaned)
      steps[5].status = 'done'
      steps[5].result = `스토리보드 ${storyboardFrames.length}컷 생성 완료`
    } catch (e: any) {
      steps[5].status = 'error'
      steps[5].error = e.message
    }
    this.updateStep(steps[5])

    // Step 7: Validate & Refine
    steps[6].status = 'running'
    this.updateStep(steps[6])
    let agentAnalysis = ''
    try {
      agentAnalysis = await callGemini(`
당신은 품질 관리 감독입니다.

[작품 컨텍스트]
${projectCtx}

[씬 정보]
${sceneCtx}

[생성된 결과물 요약]
- 연출 스크립트: ${directorScript.substring(0, 300)}
- 이미지 프롬프트: ${imagePrompts.base}
- 영상 프롬프트(Veo): ${videoPrompts.veo}
- 스토리보드: ${storyboardFrames.length}컷

다음을 검토하고 한국어로 보고서 작성:
1. 작품 아트 스타일 준수 여부
2. 금지 요소 포함 여부 검토
3. 핵심 씬 요소 (특히 AI 변환 씬이면 변환 요소) 반영 여부
4. 개선 권고사항 (있다면)
5. 최종 품질 등급: A / B / C

간결하게 작성하세요.
`)
      steps[6].status = 'done'
      steps[6].result = '검수 완료'
    } catch (e: any) {
      steps[6].status = 'error'
      steps[6].error = e.message
      agentAnalysis = '검수 실패'
    }
    this.updateStep(steps[6])

    return {
      directorScript,
      imagePrompts,
      videoPrompts,
      storyboardFrames,
      agentAnalysis,
      steps,
    }
  }
}
