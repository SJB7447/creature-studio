import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import mammoth from 'mammoth'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Vision(PDF/이미지)용: 토큰을 충분히 확보
const visionModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    temperature: 0.1,
    topP: 0.95,
    maxOutputTokens: 16384,
  },
})

// 텍스트(DOCX/TXT)용
const textModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    temperature: 0.1,
    topP: 0.95,
    maxOutputTokens: 16384,
  },
})

/**
 * DOCX → HTML 변환 후 테이블 구조를 보존한 텍스트로 변환
 */
async function extractDocxStructured(buffer: Buffer): Promise<string> {
  const htmlResult = await mammoth.convertToHtml({ buffer })
  const html = htmlResult.value

  return html
    .replace(/<tr[^>]*>/gi, '\n[행]')
    .replace(/<\/tr>/gi, '')
    .replace(/<td[^>]*>/gi, ' | ')
    .replace(/<\/td>/gi, '')
    .replace(/<th[^>]*>/gi, ' | ')
    .replace(/<\/th>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** PDF/이미지용 프롬프트: 간결하고 Vision에 최적화 */
function buildVisionPrompt(episodeContext: string): string {
  return `당신은 영상 기획안/스토리보드 PDF에서 씬 목록을 추출하는 전문가입니다.
문서의 모든 페이지를 빠짐없이 읽고 씬을 추출하세요.

## 에피소드 컨텍스트
${episodeContext}

## 씬 인식 패턴
- "Scene 1.", "Scene 2." … (영문 Scene + 번호 + 점)
- "씬1", "씬 1", "장면1", "S1", "S01"
- 제목이 없어도 이전 씬의 표가 다음 페이지에서 계속되면 같은 씬으로 처리

## 각 씬의 표 필드 매핑
| 표 필드명 | 추출 대상 | 처리 방법 |
|----------|----------|---------|
| 러닝타임 | timeStart / timeEnd | "0:00 ~ 0:25" → timeStart:"0:00", timeEnd:"0:25" |
| 화면 | backgroundDescription | 시각적 배경/공간 묘사 전체 |
| 대사 | actionDescription | 주요 대사 포함해서 씬에서 일어나는 일 서술 + characters 추출 |
| 의도 | directorNote | 연출 의도 전문 |

## 출력 형식 (순수 JSON, 마크다운 코드블록 금지)
{
  "scenes": [
    {
      "number": 1,
      "title": "씬 제목 (Scene X. 옆 텍스트 그대로)",
      "location": "장소 (화면 또는 제목에서 추출)",
      "timeOfDay": "morning | afternoon | evening | night | interior",
      "characters": ["대사 필드에서 추출한 등장인물 이름들"],
      "actionDescription": "화면+대사 내용을 합쳐 씬에서 일어나는 일 서술",
      "backgroundDescription": "화면 필드 내용",
      "emotionKeywords": ["씬 감정 키워드 2~4개"],
      "soundDesign": "",
      "directorNote": "의도 필드 내용",
      "timeStart": "0:00",
      "timeEnd": "0:25"
    }
  ],
  "totalScenes": 10,
  "confidence": "high | medium | low"
}

중요: 문서의 모든 씬을 빠짐없이 추출하세요. 페이지가 넘어가도 Scene 번호가 연속되면 모두 포함합니다.`
}

/** DOCX/TXT용 프롬프트: 테이블 구조 마커 활용 */
function buildTextPrompt(episodeContext: string): string {
  return `당신은 영상 기획안/스토리보드에서 씬 목록을 추출하는 전문가입니다.

## 에피소드 컨텍스트
${episodeContext}

## 씬 구분 패턴
"Scene 1.", "Scene 2.", "씬1", "씬 1", "장면1", "S1" 등

## 테이블 필드 매핑
문서에 [행] 마커와 | 구분자가 있으면 테이블입니다.
- 러닝타임 → timeStart/timeEnd ("0:00 ~ 0:25" 파싱)
- 화면 → backgroundDescription
- 대사 → actionDescription (등장인물 이름 → characters 배열)
- 의도 → directorNote

## 출력 형식 (순수 JSON, 마크다운 코드블록 금지)
{
  "scenes": [
    {
      "number": 1,
      "title": "씬 제목",
      "location": "장소",
      "timeOfDay": "morning | afternoon | evening | night | interior",
      "characters": ["캐릭터1"],
      "actionDescription": "행동/사건 서술",
      "backgroundDescription": "화면 묘사",
      "emotionKeywords": ["감정1", "감정2"],
      "soundDesign": "",
      "directorNote": "의도",
      "timeStart": "0:00",
      "timeEnd": "0:25"
    }
  ],
  "totalScenes": 10,
  "confidence": "high | medium | low"
}`
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const episodeTitle = formData.get('episodeTitle') as string || ''
    const episodeNumber = formData.get('episodeNumber') as string || ''
    const episodeSynopsis = formData.get('episodeSynopsis') as string || ''

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

    const episodeContext = [
      episodeNumber ? `에피소드 번호: ${episodeNumber}화` : '',
      episodeTitle ? `에피소드 제목: ${episodeTitle}` : '',
      episodeSynopsis ? `에피소드 시놉시스: ${episodeSynopsis}` : '',
    ].filter(Boolean).join('\n') || '에피소드 컨텍스트 없음'

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      || file.type === 'application/msword'

    let result

    if (isImage || isPdf) {
      // Vision 모드: PDF/이미지를 Gemini가 직접 시각적으로 읽음
      const base64 = buffer.toString('base64')
      const prompt = buildVisionPrompt(episodeContext)
      result = await visionModel.generateContent([
        prompt,
        { inlineData: { data: base64, mimeType: file.type } },
      ])
    } else if (isDocx) {
      // DOCX: HTML 변환으로 테이블 구조 보존
      const structured = await extractDocxStructured(buffer)
      if (!structured.trim()) {
        return NextResponse.json(
          { error: 'DOCX 파일에서 텍스트를 추출할 수 없습니다.' },
          { status: 400 }
        )
      }
      const prompt = buildTextPrompt(episodeContext)
      result = await textModel.generateContent(
        `${prompt}\n\n--- 문서 내용 ([행] = 테이블 행 구분, | = 셀 구분) ---\n${structured}`
      )
    } else {
      const text = buffer.toString('utf-8')
      const prompt = buildTextPrompt(episodeContext)
      result = await textModel.generateContent(`${prompt}\n\n--- 문서 내용 ---\n${text}`)
    }

    const raw = result.response.text()
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // JSON이 잘린 경우 복구 시도
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch {
          // 불완전한 JSON 마지막 씬 잘림 처리: scenes 배열까지만 추출
          const scenesMatch = cleaned.match(/"scenes"\s*:\s*\[[\s\S]*/)
          if (scenesMatch) {
            throw new Error(`AI 응답이 너무 길어 잘렸습니다. 씬 수가 많은 경우 문서를 화수별로 분리해서 업로드해 주세요.`)
          }
          throw new Error('AI 응답을 JSON으로 파싱할 수 없습니다.')
        }
      } else {
        throw new Error('AI 응답을 JSON으로 파싱할 수 없습니다.')
      }
    }

    if (!Array.isArray(parsed.scenes)) parsed.scenes = []

    const validTimeOfDay = ['morning', 'afternoon', 'evening', 'night', 'interior']
    parsed.scenes = parsed.scenes.map((s: any, i: number) => ({
      number: typeof s.number === 'number' ? s.number : i + 1,
      title: s.title ?? `씬 ${i + 1}`,
      location: s.location ?? '',
      timeOfDay: validTimeOfDay.includes(s.timeOfDay) ? s.timeOfDay : 'interior',
      characters: Array.isArray(s.characters) ? s.characters : [],
      actionDescription: s.actionDescription ?? '',
      backgroundDescription: s.backgroundDescription ?? '',
      emotionKeywords: Array.isArray(s.emotionKeywords) ? s.emotionKeywords : [],
      soundDesign: s.soundDesign ?? '',
      directorNote: s.directorNote ?? '',
      timeStart: s.timeStart ?? '',
      timeEnd: s.timeEnd ?? '',
    }))

    return NextResponse.json({ success: true, data: parsed })
  } catch (error: any) {
    console.error('Scene parse error:', error)
    return NextResponse.json(
      { error: '씬 분석 중 오류가 발생했습니다: ' + error.message },
      { status: 500 }
    )
  }
}
