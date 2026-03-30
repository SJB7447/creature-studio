import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import mammoth from 'mammoth'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    temperature: 0.1,
    topP: 0.95,
    maxOutputTokens: 8192,
  },
})

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

function buildPrompt(episodeContext: string): string {
  return `당신은 영상 제작 기획안, 대본, 시놉시스에서 씬(scene) 목록을 추출하는 전문가입니다.

## 에피소드 컨텍스트
${episodeContext}

## 추출 규칙

1. **씬 단위 분리**: "씬/장면/S번호" 구분자, 또는 새로운 장소/시간 전환을 기준으로 씬을 분리하세요.
2. **씬 번호**: 문서에 S1, 씬1, 장면1 등으로 명시된 번호를 사용. 없으면 순서대로 1부터 부여.
3. **씬 제목**: "장소 — 행동/상황" 형태로 간결하게 작성. 문서에 명시된 제목이 있으면 그대로 사용.
4. **장소(location)**: 구체적인 공간명 (예: 동물병원 대기실, 숲속 오솔길)
5. **시간대(timeOfDay)**: 아침→morning, 낮→afternoon, 저녁→evening, 밤→night, 실내→interior. 명시 없으면 interior.
6. **등장인물(characters)**: 해당 씬에 등장하는 캐릭터 이름 배열.
7. **액션(actionDescription)**: 씬에서 일어나는 주요 행동/사건을 2~4문장으로 서술.
8. **배경 묘사(backgroundDescription)**: 배경/공간의 시각적 묘사.
9. **감정 키워드(emotionKeywords)**: 씬의 감정 톤을 나타내는 키워드 배열 (2~4개).
10. **사운드(soundDesign)**: 음악/효과음 관련 내용이 있으면 추출. 없으면 빈 문자열.
11. **연출 노트(directorNote)**: 연출 의도나 특별 지시사항. 없으면 빈 문자열.
12. **시작/종료 시간(timeStart/timeEnd)**: 타임코드(00:00 형식)가 명시된 경우만 추출. 없으면 빈 문자열.

## 출력 형식 (순수 JSON만 출력, 마크다운 없음)

{
  "scenes": [
    {
      "number": 1,
      "title": "씬 제목 (장소 — 상황)",
      "location": "장소",
      "timeOfDay": "morning | afternoon | evening | night | interior",
      "characters": ["캐릭터1", "캐릭터2"],
      "actionDescription": "씬에서 일어나는 행동/사건 서술",
      "backgroundDescription": "배경/공간 묘사",
      "emotionKeywords": ["감정1", "감정2"],
      "soundDesign": "사운드/음악 정보 (없으면 빈 문자열)",
      "directorNote": "연출 노트 (없으면 빈 문자열)",
      "timeStart": "00:00 (없으면 빈 문자열)",
      "timeEnd": "00:30 (없으면 빈 문자열)"
    }
  ],
  "totalScenes": 10,
  "confidence": "high | medium | low"
}

## 주의사항
- 씬이 명확히 구분되지 않으면 장소/시간 전환을 기준으로 나누세요.
- 에피소드 컨텍스트를 참고해 해당 화의 씬만 추출하세요.
- 반드시 유효한 JSON만 반환. 마크다운 코드 블록(\`\`\`)을 절대 사용하지 마세요.`
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

    const prompt = buildPrompt(episodeContext)
    let result

    if (isImage || isPdf) {
      const base64 = buffer.toString('base64')
      result = await model.generateContent([
        prompt,
        { inlineData: { data: base64, mimeType: file.type } },
      ])
    } else if (isDocx) {
      const text = await extractDocxText(buffer)
      if (!text.trim()) {
        return NextResponse.json(
          { error: 'DOCX 파일에서 텍스트를 추출할 수 없습니다.' },
          { status: 400 }
        )
      }
      result = await model.generateContent(`${prompt}\n\n--- 문서 내용 ---\n${text}`)
    } else {
      const text = buffer.toString('utf-8')
      result = await model.generateContent(`${prompt}\n\n--- 문서 내용 ---\n${text}`)
    }

    const raw = result.response.text()
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('AI 응답을 JSON으로 파싱할 수 없습니다.')
      }
    }

    if (!Array.isArray(parsed.scenes)) parsed.scenes = []

    // timeOfDay 값 보정
    const validTimeOfDay = ['morning', 'afternoon', 'evening', 'night', 'interior']
    parsed.scenes = parsed.scenes.map((s: any, i: number) => ({
      number: s.number ?? i + 1,
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
