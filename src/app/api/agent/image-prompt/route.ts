import { NextRequest, NextResponse } from 'next/server'
import { callGeminiWithRetry } from '@/lib/gemini'
import { buildImagePromptPrompt, parseImagePrompts, buildImagePromptCutsPrompt, parseImagePromptCuts } from '@/agents/steps/step4_imagePrompt'
import { Scene, Project, SceneAnalysis, CharacterContext } from '@/types'
import { calculateCutCount } from '@/agents/steps/helpers'

export async function POST(req: NextRequest) {
  try {
    const { scene, project, analysis, characterContext } = await req.json() as {
      scene: Scene
      project: Project
      analysis: SceneAnalysis
      characterContext: CharacterContext
    }

    if (!scene || !project || !analysis) {
      return NextResponse.json({ error: '씬, 프로젝트, 분석 데이터가 필요합니다.' }, { status: 400 })
    }

    const prompt = buildImagePromptPrompt(scene, project, analysis, characterContext)
    const raw = await callGeminiWithRetry(prompt)
    const imagePrompts = parseImagePrompts(raw)

    const cutCount = calculateCutCount(scene)
    const cutsPrompt = buildImagePromptCutsPrompt(scene, project, analysis, characterContext, cutCount)
    const cutsRaw = await callGeminiWithRetry(cutsPrompt)
    const imagePromptCuts = parseImagePromptCuts(cutsRaw)

    return NextResponse.json({ result: imagePrompts, imagePromptCuts })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
