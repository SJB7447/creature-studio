import { NextRequest, NextResponse } from 'next/server'
import { callGeminiWithRetry } from '@/lib/gemini'
import { buildScriptPrompt } from '@/agents/steps/step3_script'
import { Scene, Project, SceneAnalysis, CharacterContext } from '@/types'

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

    const prompt = buildScriptPrompt(scene, project, analysis, characterContext)
    const directorScript = await callGeminiWithRetry(prompt)

    return NextResponse.json({ result: directorScript })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
