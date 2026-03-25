import {
  Scene, Project, Character, ConfirmedAsset,
  AgentResult, AgentStepInfo, AgentProgress, AgentStepName,
  SceneAnalysis, CharacterContext, ImagePrompts, ImagePromptCut, VideoPrompts, VideoPromptCut, StoryboardFrame, ValidationResult,
} from '@/types'
import { buildAnalyzePrompt, parseAnalysisResult } from './steps/step1_analyze'
import { buildCharacterContext } from './steps/step2_characters'
import { buildScriptPrompt } from './steps/step3_script'
import { buildImagePromptPrompt, parseImagePrompts, buildImagePromptCutsPrompt, parseImagePromptCuts } from './steps/step4_imagePrompt'
import { buildVideoPromptPrompt, parseVideoPrompts, buildVideoPromptCutsPrompt, parseVideoPromptCuts } from './steps/step5_videoPrompt'
import { buildStoryboardPrompt, parseStoryboardFrames } from './steps/step6_storyboard'
import { buildValidatePrompt, parseValidationResult } from './steps/step7_validate'
import { calculateCutCount } from './steps/helpers'
import { GoogleGenerativeAI } from '@google/generative-ai'

// ─── Gemini Helper (with retry) ─────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
const MAX_RETRIES = 2

async function callGemini(prompt: string): Promise<string> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (e: any) {
      lastError = e
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
  }
  throw lastError
}

// ─── Main Agent Class ───────────────────────────────────
export class SceneDirectorAgent {
  private onProgress: (progress: AgentProgress) => void

  constructor(onProgress: (progress: AgentProgress) => void) {
    this.onProgress = onProgress
  }

  private report(step: AgentStepName, stepNumber: number, message: string, result?: any) {
    this.onProgress({ step, stepNumber, message, result })
  }

  async run(
    scene: Scene,
    project: Project,
    characters: Character[],
    confirmedAssets: ConfirmedAsset[] = []
  ): Promise<AgentResult> {
    const steps: AgentStepInfo[] = [
      { id: 'analyze', label: '씬 감정 흐름 분석 중...', status: 'pending' },
      { id: 'character', label: '캐릭터 컨텍스트 구성 중...', status: 'pending' },
      { id: 'script', label: '연출 스크립트 작성 중...', status: 'pending' },
      { id: 'storyboard', label: '스토리보드 프레임 분해 중...', status: 'pending' },
      { id: 'image', label: '이미지 프롬프트 생성 중...', status: 'pending' },
      { id: 'video', label: '영상 프롬프트 생성 중...', status: 'pending' },
      { id: 'validate', label: '품질 검증 및 정제 중...', status: 'pending' },
    ]

    let analysis: SceneAnalysis = { emotionFlow: '', narrativePosition: '', keyVisualMoment: '', technicalRequirements: '', childSafetyNotes: '', raw: '' }
    let characterContext: CharacterContext = { characterCount: 0, context: '', characters: [] }
    let directorScript = ''
    let storyboardFrames: StoryboardFrame[] = []
    let imagePrompts: ImagePrompts = { base: '', midjourney: '', imagen: '', negativePrompt: '' }
    let imagePromptCuts: ImagePromptCut[] = []
    let videoPrompts: VideoPrompts = { veo: '', sora: '', runway: '' }
    let videoPromptCuts: VideoPromptCut[] = []
    const cutCount = calculateCutCount(scene)
    let validation: ValidationResult = { styleCompliance: '', prohibitedCheck: '', keyElementReflection: '', recommendations: '', qualityGrade: 'B', raw: '' }

    // ── Step 1: 씬 분석 ──
    steps[0].status = 'running'
    this.report('analyzing', 1, '씬 감정 흐름 분석 중...')
    try {
      const prompt = buildAnalyzePrompt(scene, project)
      const raw = await callGemini(prompt)
      analysis = parseAnalysisResult(raw)
      steps[0].status = 'done'
      steps[0].result = `감정 흐름: ${analysis.emotionFlow.substring(0, 60)}...`
      this.report('analyzing', 1, '씬 분석 완료', { analysis })
    } catch (e: any) {
      steps[0].status = 'error'
      steps[0].error = e.message
      this.report('error', 1, `씬 분석 실패: ${e.message}`)
      // Continue with empty analysis
    }

    // ── Step 2: 캐릭터 컨텍스트 ──
    steps[1].status = 'running'
    this.report('characters', 2, '캐릭터 컨텍스트 구성 중...')
    try {
      characterContext = buildCharacterContext(scene, characters)
      steps[1].status = 'done'
      steps[1].result = `${characterContext.characterCount}명의 캐릭터 컨텍스트 로드 완료`
      this.report('characters', 2, `${characterContext.characterCount}명 캐릭터 컨텍스트 구성 완료`, { characterContext })
    } catch (e: any) {
      steps[1].status = 'error'
      steps[1].error = e.message
      this.report('error', 2, `캐릭터 컨텍스트 구성 실패: ${e.message}`)
      // Continue with empty character context
    }

    // ── Step 3: 연출 스크립트 ──
    steps[2].status = 'running'
    this.report('scripting', 3, '연출 스크립트 작성 중...')
    try {
      const prompt = buildScriptPrompt(scene, project, analysis, characterContext, confirmedAssets)
      directorScript = await callGemini(prompt)
      steps[2].status = 'done'
      steps[2].result = '연출 스크립트 생성 완료'
      this.report('scripting', 3, '연출 스크립트 생성 완료', { directorScript: directorScript.substring(0, 200) })
    } catch (e: any) {
      steps[2].status = 'error'
      steps[2].error = e.message
      directorScript = '스크립트 생성 실패'
      this.report('error', 3, `연출 스크립트 생성 실패: ${e.message}`)
    }

    // ── Step 4: 스토리보드 (연출 스크립트 기반 먼저 생성 → 이미지/영상 프롬프트에 반영) ──
    steps[3].status = 'running'
    this.report('storyboard', 4, '스토리보드 프레임 분해 중...')
    try {
      const prompt = buildStoryboardPrompt(scene, analysis, directorScript, cutCount)
      const raw = await callGemini(prompt)
      storyboardFrames = parseStoryboardFrames(raw)
      steps[3].status = 'done'
      steps[3].result = `스토리보드 ${storyboardFrames.length}컷 생성 완료`
      this.report('storyboard', 4, `스토리보드 ${storyboardFrames.length}컷 생성 완료`, { storyboardFrames })
    } catch (e: any) {
      steps[3].status = 'error'
      steps[3].error = e.message
      this.report('error', 4, `스토리보드 생성 실패: ${e.message}`)
    }

    // ── Step 5: 이미지 프롬프트 (스토리보드 + 연출 스크립트 기반) ──
    steps[4].status = 'running'
    this.report('imagePrompt', 5, `이미지 프롬프트 생성 중... (${cutCount}컷)`)
    try {
      // 대표 프롬프트 1세트 (하위 호환용)
      const prompt = buildImagePromptPrompt(scene, project, analysis, characterContext, confirmedAssets)
      const raw = await callGemini(prompt)
      imagePrompts = parseImagePrompts(raw)

      // 컷별 프롬프트 생성 — 스토리보드 프레임 주입
      const cutsPrompt = buildImagePromptCutsPrompt(scene, project, analysis, characterContext, cutCount, confirmedAssets, storyboardFrames)
      const cutsRaw = await callGemini(cutsPrompt)
      imagePromptCuts = parseImagePromptCuts(cutsRaw)

      steps[4].status = 'done'
      steps[4].result = `이미지 프롬프트 ${imagePromptCuts.length}컷 생성 완료`
      this.report('imagePrompt', 5, `이미지 프롬프트 ${imagePromptCuts.length}컷 생성 완료`, { imagePrompts, imagePromptCuts })
    } catch (e: any) {
      steps[4].status = 'error'
      steps[4].error = e.message
      this.report('error', 5, `이미지 프롬프트 생성 실패: ${e.message}`)
    }

    // ── Step 6: 영상 프롬프트 컷별 (스토리보드 + 연출 스크립트 기반) ──
    steps[5].status = 'running'
    this.report('videoPrompt', 6, `영상 프롬프트 생성 중... (${cutCount}컷)`)
    try {
      // 대표 씬 단위 프롬프트 (하위 호환용)
      const prompt = buildVideoPromptPrompt(scene, project, directorScript)
      const raw = await callGemini(prompt)
      videoPrompts = parseVideoPrompts(raw)

      // 컷별 영상 프롬프트 생성 — 스토리보드 + 연출 스크립트 기반
      const cutsPrompt = buildVideoPromptCutsPrompt(scene, project, directorScript, storyboardFrames, cutCount)
      const cutsRaw = await callGemini(cutsPrompt)
      videoPromptCuts = parseVideoPromptCuts(cutsRaw)

      steps[5].status = 'done'
      steps[5].result = `영상 프롬프트 ${videoPromptCuts.length}컷 생성 완료`
      this.report('videoPrompt', 6, `Veo/Sora/Runway ${videoPromptCuts.length}컷 생성 완료`, { videoPrompts, videoPromptCuts })
    } catch (e: any) {
      steps[5].status = 'error'
      steps[5].error = e.message
      this.report('error', 6, `영상 프롬프트 생성 실패: ${e.message}`)
    }

    // ── Step 7: 품질 검증 ──
    steps[6].status = 'running'
    this.report('validating', 7, '품질 검증 및 정제 중...')
    try {
      const prompt = buildValidatePrompt(
        { directorScript, imagePrompts, videoPrompts, storyboardFrames },
        project,
        scene
      )
      const raw = await callGemini(prompt)
      validation = parseValidationResult(raw)
      steps[6].status = 'done'
      steps[6].result = `검수 완료 — 등급: ${validation.qualityGrade}`
      this.report('validating', 7, `품질 검증 완료 — 등급: ${validation.qualityGrade}`, { validation })
    } catch (e: any) {
      steps[6].status = 'error'
      steps[6].error = e.message
      this.report('error', 7, `품질 검증 실패: ${e.message}`)
    }

    this.report('done', 7, '모든 스텝 완료!')

    return {
      analysis,
      characterContext,
      directorScript,
      imagePrompts,
      imagePromptCuts,
      videoPrompts,
      videoPromptCuts,
      storyboardFrames,
      validation,
      agentAnalysis: validation.raw,
      steps,
    }
  }
}
