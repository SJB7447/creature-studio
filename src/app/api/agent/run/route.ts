import { NextRequest, NextResponse } from 'next/server'
import { SceneDirectorAgent } from '@/agents/SceneDirectorAgent'
import { Scene, Project, Character, AgentProgress } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { scene, project, characters } = await req.json() as {
      scene: Scene
      project: Project
      characters: Character[]
    }

    if (!scene || !project) {
      return NextResponse.json({ error: '씬과 프로젝트 데이터가 필요합니다.' }, { status: 400 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const agent = new SceneDirectorAgent((progress: AgentProgress) => {
          const data = JSON.stringify({ type: 'progress', progress })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        })

        try {
          const result = await agent.run(scene, project, characters || [])
          const data = JSON.stringify({ type: 'result', result })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch (error: any) {
          const data = JSON.stringify({ type: 'error', message: error.message })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
