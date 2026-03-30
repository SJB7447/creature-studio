import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import mammoth from 'mammoth'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

export interface ContestFormField {
  id: string
  label: string
  description: string
  type: 'text' | 'textarea' | 'number' | 'date'
  required: boolean
  autoFilled: boolean
  value: string
}

export interface AnalyzeResponse {
  contestName: string
  fields: ContestFormField[]
}

// ─── Text extractors ─────────────────────────────────────

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

async function extractFromUrl(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  const html = await res.text()
  // HTML 태그 제거, 연속 공백/줄바꿈 정리
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000)
}

// ─── Main handler ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY 없음' }, { status: 500 })

  let formText = ''
  let mimeType = ''
  let base64Data = ''
  let isVision = false

  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const url = formData.get('url') as string | null
    const projectDataRaw = formData.get('projectData') as string | null
    const projectData = projectDataRaw ? JSON.parse(projectDataRaw) : {}

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const ft = file.type

      if (ft === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        formText = await extractDocxText(buffer)
      } else if (ft === 'application/pdf' || ft.startsWith('image/')) {
        // Gemini Vision
        base64Data = buffer.toString('base64')
        mimeType = ft === 'application/pdf' ? 'application/pdf' : ft
        isVision = true
      } else {
        formText = buffer.toString('utf-8')
      }
    } else if (url) {
      formText = await extractFromUrl(url)
    }

    const result = await callGemini(formText, base64Data, mimeType, isVision, projectData)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: '지원하지 않는 요청 형식입니다.' }, { status: 400 })
}

// ─── Gemini call ──────────────────────────────────────────

async function callGemini(
  formText: string,
  base64Data: string,
  mimeType: string,
  isVision: boolean,
  projectData: Record<string, any>
): Promise<AnalyzeResponse> {
  const projectSummary = `
작품명: ${projectData.title ?? ''}
영문명: ${projectData.titleEn ?? ''}
장르: ${Array.isArray(projectData.genre) ? projectData.genre.join(', ') : projectData.genre ?? ''}
타입: ${projectData.type ?? ''}
타겟 시청자: ${projectData.targetAudience ?? ''}
방송사/플랫폼: ${projectData.broadcaster ?? ''}
러닝타임: ${projectData.runtime ?? ''}
총 화수: ${projectData.totalEpisodes ?? ''}
아트 스타일: ${projectData.artStyle ?? ''}
무드 키워드: ${Array.isArray(projectData.moodKeywords) ? projectData.moodKeywords.join(', ') : ''}
레퍼런스 작품: ${Array.isArray(projectData.referenceWorks) ? projectData.referenceWorks.join(', ') : ''}
납품 마감일: ${projectData.submissionDeadline ?? ''}
시놉시스: ${projectData.synopsis ?? ''}
캐릭터: ${projectData.characters ?? ''}
에피소드 정보: ${projectData.episodes ?? ''}
`.trim()

  const systemPrompt = `당신은 공모전/방송사 제출 서류 전문 작성 도우미입니다.
제공된 신청서 양식을 분석하여 각 항목을 파악하고, 프로젝트 데이터로 내용을 자동 작성합니다.

## 프로젝트 데이터
${projectSummary}

## 지시사항
1. 양식의 모든 작성 항목을 빠짐없이 추출하세요 (제목, 테두리, 표 셀 포함).
2. 각 항목에 프로젝트 데이터를 기반으로 적절한 내용을 작성하세요.
3. 프로젝트 데이터에 없는 항목은 value를 ""(빈 문자열)로 두세요.
4. 항목 타입: 짧은 답변→"text", 긴 설명→"textarea", 숫자→"number", 날짜→"date"
5. 반드시 순수 JSON만 출력하세요. 마크다운 코드블록 없이.

## 출력 형식
{
  "contestName": "공모전/기관명",
  "fields": [
    {
      "id": "영문_스네이크케이스_id",
      "label": "항목명",
      "description": "항목에 대한 간단한 설명",
      "type": "text|textarea|number|date",
      "required": true|false,
      "autoFilled": true|false,
      "value": "작성된 내용"
    }
  ]
}`

  let response
  if (isVision && base64Data) {
    response = await model.generateContent([
      systemPrompt + '\n\n위 양식 문서/이미지를 분석하여 JSON을 출력하세요.',
      { inlineData: { mimeType, data: base64Data } },
    ])
  } else {
    response = await model.generateContent([
      systemPrompt,
      `\n\n## 신청서 양식 텍스트\n\n${formText.slice(0, 12000)}`,
    ])
  }

  const raw = response.response.text().trim()
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  try {
    return JSON.parse(jsonStr) as AnalyzeResponse
  } catch {
    throw new Error('AI 응답 파싱 실패: ' + jsonStr.slice(0, 200))
  }
}
