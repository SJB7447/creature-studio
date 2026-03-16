import { NextRequest, NextResponse } from 'next/server'
import { callGeminiWithRetry } from '@/lib/gemini'
import { buildVideoPromptPrompt, parseVideoPrompts } from '@/agents/steps/step5_videoPrompt'
import { Scene, Project } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { scene, project, directorScript } = await req.json() as {
      scene: Scene
      project: Project
      directorScript: string
    }

    if (!scene || !project || !directorScript) {
      return NextResponse.json({ error: '씬, 프로젝트, 연출 스크립트가 필요합니다.' }, { status: 400 })
    }

    const prompt = buildVideoPromptPrompt(scene, project, directorScript)
    const raw = await callGeminiWithRetry(prompt)
    const videoPrompts = parseVideoPrompts(raw)

    return NextResponse.json({ result: videoPrompts })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
