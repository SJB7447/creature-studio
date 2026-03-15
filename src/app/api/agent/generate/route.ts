import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

export async function POST(req: NextRequest) {
  try {
    const { prompt, type } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: '프롬프트가 필요합니다.' }, { status: 400 })
    }

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    return NextResponse.json({ result: text, type })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
