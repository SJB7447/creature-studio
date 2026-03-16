import { NextRequest, NextResponse } from 'next/server'
import { callGeminiWithRetry } from '@/lib/gemini'
import { buildAnalyzePrompt, parseAnalysisResult } from '@/agents/steps/step1_analyze'
import { Scene, Project } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { scene, project } = await req.json() as { scene: Scene; project: Project }

    if (!scene || !project) {
      return NextResponse.json({ error: '씬과 프로젝트 데이터가 필요합니다.' }, { status: 400 })
    }

    const prompt = buildAnalyzePrompt(scene, project)
    const raw = await callGeminiWithRetry(prompt)
    const analysis = parseAnalysisResult(raw)

    return NextResponse.json({ result: analysis })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
