import { NextRequest, NextResponse } from 'next/server'
import { callGeminiWithRetry } from '@/lib/gemini'
import { Scene, Project, Character, SceneAnalysis, CharacterContext, ImagePrompts, VideoPrompts, StoryboardFrame } from '@/types'
import { buildAnalyzePrompt, parseAnalysisResult } from '@/agents/steps/step1_analyze'
import { buildCharacterContext } from '@/agents/steps/step2_characters'
import { buildScriptPrompt } from '@/agents/steps/step3_script'
import { buildImagePromptPrompt, parseImagePrompts, buildImagePromptCutsPrompt, parseImagePromptCuts } from '@/agents/steps/step4_imagePrompt'
import { buildVideoPromptPrompt, parseVideoPrompts, buildVideoPromptCutsPrompt, parseVideoPromptCuts } from '@/agents/steps/step5_videoPrompt'
import { buildStoryboardPrompt, parseStoryboardFrames } from '@/agents/steps/step6_storyboard'
import { calculateCutCount } from '@/agents/steps/helpers'

type StepType = 'script' | 'imagePrompt' | 'videoPrompt' | 'storyboard'

interface RunSingleBody {
  stepType: StepType
  scene: Scene
  project: Project
  characters: Character[]
  previousResults?: {
    analysis?: SceneAnalysis
    characterContext?: CharacterContext
    directorScript?: string
    imagePrompts?: ImagePrompts
    videoPrompts?: VideoPrompts
    storyboardFrames?: StoryboardFrame[]
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as RunSingleBody
    const { stepType, scene, project, characters, previousResults } = body

    if (!stepType || !scene || !project) {
      return NextResponse.json({ error: 'stepType, scene, project가 필요합니다.' }, { status: 400 })
    }

    // Build prerequisite context if not provided
    let analysis: SceneAnalysis = previousResults?.analysis || { emotionFlow: '', narrativePosition: '', keyVisualMoment: '', technicalRequirements: '', childSafetyNotes: '', raw: '' }
    let characterContext: CharacterContext = previousResults?.characterContext || buildCharacterContext(scene, characters || [])

    // If analysis is empty and needed, auto-generate it
    if (!analysis.raw && (stepType === 'script' || stepType === 'imagePrompt' || stepType === 'storyboard')) {
      try {
        const prompt = buildAnalyzePrompt(scene, project)
        const raw = await callGeminiWithRetry(prompt)
        analysis = parseAnalysisResult(raw)
      } catch {
        // Continue with empty analysis
      }
    }

    let result: any

    switch (stepType) {
      case 'script': {
        const prompt = buildScriptPrompt(scene, project, analysis, characterContext)
        const raw = await callGeminiWithRetry(prompt)
        result = { directorScript: raw }
        break
      }

      case 'imagePrompt': {
        const prompt = buildImagePromptPrompt(scene, project, analysis, characterContext)
        const raw = await callGeminiWithRetry(prompt)
        const cutCount = calculateCutCount(scene)
        const cutsPrompt = buildImagePromptCutsPrompt(scene, project, analysis, characterContext, cutCount)
        const cutsRaw = await callGeminiWithRetry(cutsPrompt)
        result = { imagePrompts: parseImagePrompts(raw), imagePromptCuts: parseImagePromptCuts(cutsRaw) }
        break
      }

      case 'videoPrompt': {
        const directorScript = previousResults?.directorScript || ''
        const prompt = buildVideoPromptPrompt(scene, project, directorScript)
        const raw = await callGeminiWithRetry(prompt)
        const videoPrompts = parseVideoPrompts(raw)

        const frames = previousResults?.storyboardFrames || []
        const cutCount = calculateCutCount(scene)
        const cutsPrompt = buildVideoPromptCutsPrompt(scene, project, directorScript, frames, cutCount)
        const cutsRaw = await callGeminiWithRetry(cutsPrompt)
        const videoPromptCuts = parseVideoPromptCuts(cutsRaw)

        result = { videoPrompts, videoPromptCuts }
        break
      }

      case 'storyboard': {
        const directorScript = previousResults?.directorScript || ''
        const cutCount = calculateCutCount(scene)
        const prompt = buildStoryboardPrompt(scene, analysis, directorScript, cutCount)
        const raw = await callGeminiWithRetry(prompt)
        result = { storyboardFrames: parseStoryboardFrames(raw) }
        break
      }

      default:
        return NextResponse.json({ error: '지원하지 않는 stepType입니다.' }, { status: 400 })
    }

    return NextResponse.json({ result, analysis, characterContext })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
