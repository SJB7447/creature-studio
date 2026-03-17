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

function buildPrompt(documentText?: string): string {
  return `당신은 영상 제작 기획안, 스토리보드, 시놉시스, 대본 문서를 분석하는 최고 수준의 전문가입니다.

## 분석 규칙 (반드시 준수)

1. **정확성 우선**: 문서에 명시적으로 적힌 내용만 추출하세요. 추측하지 마세요.
2. **문맥 파악**: 표, 목록, 소제목, 괄호 안 내용까지 꼼꼼히 읽으세요.
3. **동의어/유사어 인식**: "시청 대상", "타겟층", "대상 연령" 등은 모두 targetAudience입니다.
4. **복합 정보 분리**: "EBS에서 방영하는 5분짜리 26부작"에서 broadcaster="EBS", runtime="5분", totalEpisodes=26으로 분리하세요.
5. **캐릭터 정보 추출**: 이름, 역할/직업, 외형/성격/특징, 감정적 역할을 모두 포함하세요.
6. **에피소드 추출**: 회차 번호, 제목, 줄거리를 각각 분리하세요.
7. **아트/비주얼 정보**: 색감, 질감, 톤, 스타일 관련 단어를 artStyle로 종합하세요.
8. **색상 팔레트**: 문서에 HEX 코드(#FFFFFF 형태)나 구체적 색상명이 있으면 colorPalette 배열에 넣으세요.
9. **금지 요소**: "주의사항", "제한", "금지", "피해야 할" 등의 맥락에서 추출하세요.
10. **숫자 정확도**: 총 화수, 러닝타임 등 숫자는 정확히 추출하세요. "26부작"→26, "총 13화"→13

## 필드별 추출 가이드

| 필드 | 찾을 키워드/패턴 |
|------|----------------|
| title | 작품명, 제목, 프로젝트명, 타이틀 |
| titleEn | 영문명, English Title, 영어 제목 |
| type | 애니메이션→animation, 영화/극영화→film, 단편/숏폼→short, 다큐→documentary |
| genre | 장르, 카테고리, 분류 |
| targetAudience | 타겟, 시청 대상, 대상 연령, 시청자층, 타겟층 |
| artStyle | 아트 스타일, 비주얼 스타일, 작화, 톤앤매너, 렌더링 방식, 질감, 톤 |
| colorPalette | HEX 코드, 주요 색상, 컬러 팔레트, 색감 |
| moodKeywords | 무드, 분위기, 톤, 감성 키워드 |
| prohibitedElements | 금지, 주의, 제한, 피해야 할 요소, 사용 불가 |
| referenceWorks | 레퍼런스, 참고 작품, 벤치마크, 유사 작품 |
| broadcaster | 방송사, 플랫폼, 송출, 채널, OTT |
| runtime | 러닝타임, 방영 시간, 분량, 상영 시간 |
| totalEpisodes | 총 화수, 전체 편수, 부작, 시즌 구성 |
| aspectRatio | 화면비, 종횡비, aspect ratio (16:9, 9:16, 1:1, 2.39:1) |
| frameRate | 프레임레이트, fps, 초당 프레임 (24fps, 30fps, 60fps) |
| submissionDeadline | 납품일, 마감일, 데드라인, 완성 목표일 |
| synopsis | 시놉시스, 줄거리, 스토리 개요, 기획 의도 (전체 작품의 핵심 이야기를 3~5문장으로 요약) |

## 출력 형식 (순수 JSON만 출력, 마크다운 없음)

{
  "title": "작품명 (한국어)",
  "titleEn": "영문명 (없으면 빈 문자열)",
  "type": "animation | film | short | documentary | other",
  "genre": "장르1, 장르2, 장르3",
  "targetAudience": "타겟 시청자 상세 설명",
  "artStyle": "아트 스타일을 구체적으로 서술 (톤, 질감, 형태, 색감 등)",
  "colorPalette": ["#HEX1", "#HEX2"],
  "moodKeywords": "키워드1, 키워드2, 키워드3",
  "prohibitedElements": "금지요소1, 금지요소2",
  "referenceWorks": "작품1, 작품2, 작품3",
  "broadcaster": "방송사/플랫폼명",
  "runtime": "러닝타임 (예: 5분, 22분)",
  "totalEpisodes": "숫자만 (예: 26)",
  "aspectRatio": "16:9 | 9:16 | 1:1 | 2.39:1 | 빈 문자열",
  "frameRate": "24fps | 30fps | 60fps | 빈 문자열",
  "submissionDeadline": "YYYY-MM-DD 형식 또는 빈 문자열",
  "synopsis": "전체 줄거리 요약 (3~5문장)",
  "characters": [
    {
      "name": "캐릭터 이름",
      "role": "역할/직업 설명",
      "appearance": "외형, 성격, 특징을 상세히 서술",
      "emotionalRole": "감정적 역할 (있으면)"
    }
  ],
  "episodes": [
    {
      "number": 1,
      "title": "에피소드 제목",
      "synopsis": "에피소드 줄거리 요약",
      "targetEmotion": "해당 화의 감정 주제 (있으면)"
    }
  ],
  "checklist": {
    "hasTitle": true,
    "hasTitleEn": false,
    "hasGenre": true,
    "hasTargetAudience": true,
    "hasArtStyle": false,
    "hasColorPalette": false,
    "hasMoodKeywords": false,
    "hasProhibitedElements": false,
    "hasReferenceWorks": false,
    "hasCharacters": true,
    "hasEpisodes": false,
    "hasSynopsis": true,
    "hasBroadcaster": false,
    "hasRuntime": false,
    "hasTotalEpisodes": false,
    "hasAspectRatio": false,
    "hasFrameRate": false,
    "hasSubmissionDeadline": false
  },
  "documentType": "기획안 | 스토리보드 | 시놉시스 | 대본 | 캐릭터시트 | 기타",
  "summary": "문서 전체 내용을 2~3줄로 구체적으로 요약",
  "confidence": "high | medium | low (추출 정확도에 대한 자체 평가)"
}

## 주의사항
- checklist의 boolean은 해당 필드에 실제로 유의미한 값이 있을 때만 true로 설정
- colorPalette는 문서에 HEX 코드가 없으면 빈 배열 []
- characters 배열은 문서에 캐릭터 정보가 있을 때만 채우고, 없으면 빈 배열 []
- episodes 배열도 마찬가지로 문서에 에피소드 정보가 있을 때만 채움
- totalEpisodes는 반드시 숫자형 문자열로 반환 (예: "26", "13")
- 빈 문자열("")과 빈 배열([])을 적절히 구분해서 사용
- 반드시 유효한 JSON만 반환. 마크다운 코드 블록(${"`"}${"`"}${"`"})을 절대 사용하지 마세요.`
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

    const prompt = buildPrompt()
    let result

    if (isImage || isPdf) {
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
      const text = await extractDocxText(buffer)
      if (!text.trim()) {
        return NextResponse.json(
          { error: 'DOCX 파일에서 텍스트를 추출할 수 없습니다. 파일이 비어있거나 손상되었을 수 있습니다.' },
          { status: 400 }
        )
      }
      result = await model.generateContent(`${prompt}\n\n--- 문서 내용 (전문) ---\n${text}`)
    } else {
      const text = buffer.toString('utf-8')
      result = await model.generateContent(`${prompt}\n\n--- 문서 내용 (전문) ---\n${text}`)
    }

    const raw = result.response.text()
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // JSON 파싱 실패 시 중괄호 범위 추출 재시도
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('AI 응답을 JSON으로 파싱할 수 없습니다.')
      }
    }

    // colorPalette가 문자열로 올 경우 배열로 변환
    if (parsed.colorPalette && typeof parsed.colorPalette === 'string') {
      parsed.colorPalette = parsed.colorPalette.split(',').map((s: string) => s.trim()).filter(Boolean)
    }
    if (!Array.isArray(parsed.colorPalette)) {
      parsed.colorPalette = []
    }

    // characters, episodes 배열 보장
    if (!Array.isArray(parsed.characters)) parsed.characters = []
    if (!Array.isArray(parsed.episodes)) parsed.episodes = []

    // checklist 기본값 보장
    if (!parsed.checklist || typeof parsed.checklist !== 'object') {
      parsed.checklist = {}
    }
    const checklistKeys = [
      'hasTitle', 'hasTitleEn', 'hasGenre', 'hasTargetAudience',
      'hasArtStyle', 'hasColorPalette', 'hasMoodKeywords', 'hasProhibitedElements',
      'hasReferenceWorks', 'hasCharacters', 'hasEpisodes', 'hasSynopsis',
      'hasBroadcaster', 'hasRuntime', 'hasTotalEpisodes',
      'hasAspectRatio', 'hasFrameRate', 'hasSubmissionDeadline',
    ]
    for (const key of checklistKeys) {
      if (typeof parsed.checklist[key] !== 'boolean') {
        parsed.checklist[key] = false
      }
    }

    return NextResponse.json({ success: true, data: parsed })
  } catch (error: any) {
    console.error('Document parse error:', error)
    return NextResponse.json(
      { error: '문서 분석 중 오류가 발생했습니다: ' + error.message },
      { status: 500 }
    )
  }
}
