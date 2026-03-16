import { NextRequest, NextResponse } from 'next/server'
import { callGeminiWithRetry } from '@/lib/gemini'
import { buildStoryboardPrompt, parseStoryboardFrames } from '@/agents/steps/step6_storyboard'
import { Scene, SceneAnalysis } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { scene, analysis, directorScript } = await req.json() as {
      scene: Scene
      analysis: SceneAnalysis
      directorScript: string
    }

    if (!scene || !analysis || !directorScript) {
      return NextResponse.json({ error: '씬, 분석, 연출 스크립트가 필요합니다.' }, { status: 400 })
    }

    const prompt = buildStoryboardPrompt(scene, analysis, directorScript)
    const raw = await callGeminiWithRetry(prompt)
    const storyboardFrames = parseStoryboardFrames(raw)

    return NextResponse.json({ result: storyboardFrames })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
