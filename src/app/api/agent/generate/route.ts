import { NextRequest, NextResponse } from 'next/server'
import { callGeminiWithRetry } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const { prompt, type } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: '프롬프트가 필요합니다.' }, { status: 400 })
    }

    const text = await callGeminiWithRetry(prompt)

    return NextResponse.json({ result: text, type })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
