import { NextRequest, NextResponse } from 'next/server'
import { callGeminiWithRetry } from '@/lib/gemini'
import { buildValidatePrompt, parseValidationResult } from '@/agents/steps/step7_validate'
import { Scene, Project, ImagePrompts, VideoPrompts, StoryboardFrame } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { result: agentResult, project, scene } = await req.json() as {
      result: {
        directorScript: string
        imagePrompts: ImagePrompts
        videoPrompts: VideoPrompts
        storyboardFrames: StoryboardFrame[]
      }
      project: Project
      scene: Scene
    }

    if (!agentResult || !project || !scene) {
      return NextResponse.json({ error: '결과물, 프로젝트, 씬 데이터가 필요합니다.' }, { status: 400 })
    }

    const prompt = buildValidatePrompt(agentResult, project, scene)
    const raw = await callGeminiWithRetry(prompt)
    const validation = parseValidationResult(raw)

    return NextResponse.json({ result: validation })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
