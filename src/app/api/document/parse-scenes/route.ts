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

/**
 * DOCX → HTML 변환 후 테이블 구조를 보존한 텍스트로 변환
 * mammoth.extractRawText()는 표(table) 구조를 평탄화해서 씬 경계를 잃음
 * HTML 변환 후 행/셀 구분자를 삽입해 AI가 구조를 파악할 수 있게 함
 */
async function extractDocxStructured(buffer: Buffer): Promise<string> {
  const htmlResult = await mammoth.convertToHtml({ buffer })
  const html = htmlResult.value

  const structured = html
    // 테이블 행: [행] 마커 삽입
    .replace(/<tr[^>]*>/gi, '\n[행]')
    .replace(/<\/tr>/gi, '')
    // 테이블 셀: 파이프(|) 구분
    .replace(/<td[^>]*>/gi, ' | ')
    .replace(/<\/td>/gi, '')
    .replace(/<th[^>]*>/gi, ' | ')
    .replace(/<\/th>/gi, '')
    // 단락 구분
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // 나머지 HTML 태그 제거
    .replace(/<[^>]+>/g, '')
    // HTML 엔티티 복원
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // 연속 공백/빈줄 정리
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return structured
}

function buildPrompt(episodeContext: string): string {
  return `당신은 영상 제작 기획안/스토리보드/대본에서 씬(scene) 목록을 추출하는 전문가입니다.

## 에피소드 컨텍스트
${episodeContext}

## 씬 구분 패턴 (모두 인식할 것)
아래 형식 중 하나가 씬의 시작을 나타냅니다:
- "Scene 1.", "Scene 2." (영문 Scene + 번호 + 점)
- "씬1", "씬 1", "씬1.", "씬 1."
- "장면1", "장면 1"
- "S1", "S1.", "S01"
- "## 씬", "### Scene"

## 한국어 스토리보드 필드 매핑 규칙

| 문서 필드명 | 매핑 대상 | 설명 |
|------------|----------|------|
| 러닝타임, 런닝타임, 시간 | timeStart / timeEnd | "0:25~0:50" 또는 "0:25 ~ 0:50" → timeStart:"0:25", timeEnd:"0:50" |
| 화면, 화면묘사, 비주얼 | backgroundDescription | 배경/공간/시각적 묘사 전체 |
| 대사, 대화, 스크립트 | actionDescription의 일부 + characters | 대사에서 등장인물 이름 추출, 내용은 actionDescription에 포함 |
| 의도, 연출 의도, 씬 의도 | directorNote | 씬의 연출 목적/의도 |
| 장소, location | location | 공간명 |
| 등장인물, 캐릭터 | characters | 캐릭터 이름 배열 |

## 추출 세부 규칙

1. **씬 번호**: 문서에 명시된 번호를 그대로 사용. "Scene 1." → number: 1
2. **씬 제목**: 씬 구분자 옆에 있는 제목 그대로 사용. 예: "Scene 1. 오프닝 - 도담 동물병원의 아침" → title: "오프닝 - 도담 동물병원의 아침"
3. **장소(location)**: '화면' 묘사 첫 줄이나 제목에서 추출. 예: "도담 동물병원 전경" → location: "도담 동물병원"
4. **시간대(timeOfDay)**: 아침/오전→morning, 낮/오후→afternoon, 저녁→evening, 밤/야간→night, 실내/내부→interior. 명시 없으면 interior.
5. **등장인물(characters)**: '대사' 필드에서 "이름:" 또는 "이름(나레이션):" 패턴으로 등장하는 캐릭터 이름을 추출. 중복 제거.
6. **actionDescription**: '화면' 내용(행동/사건 부분) + '대사' 내용을 결합해서 씬에서 일어나는 일을 2~4문장으로 서술.
7. **backgroundDescription**: '화면' 필드의 배경/공간/환경 묘사 부분.
8. **감정 키워드(emotionKeywords)**: '의도' 또는 씬 전체 내용에서 감정 톤 키워드 2~4개 추출.
9. **시작/종료 시간**: '러닝타임' 필드에서 추출. "0:00~0:25" → timeStart:"0:00", timeEnd:"0:25". 분:초 또는 시:분:초 형식 모두 인식.
10. **directorNote**: '의도' 필드 내용 그대로.

## 출력 형식 (순수 JSON만 출력, 마크다운 코드블록 절대 사용 금지)

{
  "scenes": [
    {
      "number": 1,
      "title": "씬 제목",
      "location": "장소",
      "timeOfDay": "morning | afternoon | evening | night | interior",
      "characters": ["캐릭터1", "캐릭터2"],
      "actionDescription": "씬에서 일어나는 행동/사건 + 주요 대사 요약",
      "backgroundDescription": "화면/배경/공간 묘사",
      "emotionKeywords": ["감정1", "감정2"],
      "soundDesign": "사운드/음악 정보 (없으면 빈 문자열)",
      "directorNote": "의도/연출 노트",
      "timeStart": "0:00",
      "timeEnd": "0:25"
    }
  ],
  "totalScenes": 10,
  "confidence": "high | medium | low"
}

## 최종 주의사항
- 문서에 [행] | 구분자가 있으면 테이블에서 추출된 것이므로 행/열 구조를 파악해 씬을 분리하세요.
- 에피소드 컨텍스트에 맞는 씬만 추출하세요.
- 씬이 하나도 없으면 빈 배열 []을 반환하지 말고, 문서 전체를 다시 읽어 씬 경계를 다시 찾아보세요.
- 반드시 유효한 JSON만 반환하세요.`
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
      // 이미지/PDF: Gemini Vision으로 직접 읽음 (표 구조 그대로 인식 가능)
      const base64 = buffer.toString('base64')
      result = await model.generateContent([
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
      result = await model.generateContent(`${prompt}\n\n--- 문서 내용 (표 구조 보존됨: [행]은 테이블 행 구분, |는 셀 구분) ---\n${structured}`)
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
