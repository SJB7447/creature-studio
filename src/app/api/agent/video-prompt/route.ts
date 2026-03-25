import { NextRequest, NextResponse } from 'next/server'
import { callGeminiWithRetry } from '@/lib/gemini'
import { buildVideoPromptPrompt, parseVideoPrompts, buildVideoPromptCutsPrompt, parseVideoPromptCuts } from '@/agents/steps/step5_videoPrompt'
import { Scene, Project, StoryboardFrame } from '@/types'
import { calculateCutCount } from '@/agents/steps/helpers'

export async function POST(req: NextRequest) {
  try {
    const { scene, project, directorScript, storyboardFrames } = await req.json() as {
      scene: Scene
      project: Project
      directorScript: string
      storyboardFrames?: StoryboardFrame[]
    }

    if (!scene || !project || !directorScript) {
      return NextResponse.json({ error: '씬, 프로젝트, 연출 스크립트가 필요합니다.' }, { status: 400 })
    }

    const prompt = buildVideoPromptPrompt(scene, project, directorScript)
    const raw = await callGeminiWithRetry(prompt)
    const videoPrompts = parseVideoPrompts(raw)

    const frames = storyboardFrames || []
    const cutCount = calculateCutCount(scene)
    const cutsPrompt = buildVideoPromptCutsPrompt(scene, project, directorScript, frames, cutCount)
    const cutsRaw = await callGeminiWithRetry(cutsPrompt)
    const videoPromptCuts = parseVideoPromptCuts(cutsRaw)

    return NextResponse.json({ result: videoPrompts, videoPromptCuts })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
