import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import mammoth from 'mammoth'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 })
    }

    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/png',
      'image/jpeg',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. PDF, TXT, DOCX, 이미지(PNG/JPG) 파일을 업로드하세요.' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      || file.type === 'application/msword'

    const prompt = `당신은 영상 제작 기획안 및 스토리보드 문서 분석 전문가입니다.

업로드된 문서를 분석하여 영상 프로젝트의 정보를 추출하세요.

반드시 아래 JSON 형식으로만 응답하세요. 문서에서 찾을 수 없는 정보는 빈 문자열("")로 남겨두세요.

{
  "title": "작품명 (한국어)",
  "titleEn": "작품명 (영문, 없으면 빈 문자열)",
  "type": "animation | film | short | documentary | other 중 하나",
  "genre": "장르 (쉼표 구분)",
  "targetAudience": "타겟 시청자",
  "artStyle": "아트 스타일 설명",
  "moodKeywords": "무드 키워드 (쉼표 구분)",
  "prohibitedElements": "금지/주의 요소 (쉼표 구분)",
  "referenceWorks": "레퍼런스 작품 (쉼표 구분)",
  "broadcaster": "방송사/플랫폼",
  "runtime": "러닝타임",
  "totalEpisodes": "총 화수 (숫자)",
  "synopsis": "전체 시놉시스 또는 줄거리 요약",
  "characters": [
    {
      "name": "캐릭터 이름",
      "role": "역할 설명",
      "appearance": "외형 묘사"
    }
  ],
  "episodes": [
    {
      "number": 1,
      "title": "에피소드 제목",
      "synopsis": "에피소드 줄거리"
    }
  ],
  "checklist": {
    "hasTitle": true,
    "hasGenre": true,
    "hasTargetAudience": true,
    "hasArtStyle": false,
    "hasMoodKeywords": false,
    "hasCharacters": true,
    "hasEpisodes": false,
    "hasSynopsis": true,
    "hasBroadcaster": false,
    "hasRuntime": false,
    "hasTotalEpisodes": false
  },
  "documentType": "기획안 | 스토리보드 | 시놉시스 | 대본 | 기타",
  "summary": "문서 전체 내용을 2~3줄로 요약"
}

반드시 유효한 JSON만 반환하세요. 마크다운 코드 블록 없이 순수 JSON만 출력하세요.`

    let result

    if (isImage || isPdf) {
      // 이미지/PDF: 멀티모달 (base64)
      const base64 = buffer.toString('base64')
      const mimeType = file.type as string
      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64,
            mimeType,
          },
        },
      ])
    } else if (isDocx) {
      // DOCX: mammoth로 텍스트 추출 후 전달
      const text = await extractDocxText(buffer)
      if (!text.trim()) {
        return NextResponse.json(
          { error: 'DOCX 파일에서 텍스트를 추출할 수 없습니다. 파일이 비어있거나 손상되었을 수 있습니다.' },
          { status: 400 }
        )
      }
      result = await model.generateContent(`${prompt}\n\n--- 문서 내용 ---\n${text}`)
    } else {
      // TXT 등 텍스트 파일
      const text = buffer.toString('utf-8')
      result = await model.generateContent(`${prompt}\n\n--- 문서 내용 ---\n${text}`)
    }

    const raw = result.response.text()
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    return NextResponse.json({ success: true, data: parsed })
  } catch (error: any) {
    console.error('Document parse error:', error)
    return NextResponse.json(
      { error: '문서 분석 중 오류가 발생했습니다: ' + error.message },
      { status: 500 }
    )
  }
}
