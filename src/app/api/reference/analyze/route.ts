import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import mammoth from 'mammoth'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    temperature: 0.2,
    topP: 0.95,
    maxOutputTokens: 4096,
  },
})

type ContextType =
  | 'character'
  | 'background'
  | 'scene'
  | 'storyboard'
  | 'style'

const PROMPTS: Record<ContextType, string> = {
  character: `당신은 캐릭터 디자인 분석 전문가입니다.
업로드된 레퍼런스(이미지 또는 문서)를 분석하여 캐릭터 정보를 추출하세요.

다음 JSON 형식으로만 응답하세요:
{
  "name": "캐릭터 이름 (알 수 있다면)",
  "role": "역할/직업 (추론 가능하면)",
  "emotionalRole": "감정적 역할 (추론 가능하면)",
  "appearanceBase": "외형 상세 묘사 (체형, 얼굴, 의상, 액세서리, 머리카락 등 가능한 한 상세히)",
  "styleKeywords": "스타일 키워드 (쉼표 구분, 영어 - 예: round face, big eyes, clay texture)",
  "colorScheme": "색상 스킴 (주요 색상 조합 설명)",
  "fixedPromptKeywords": "이미지 생성용 고정 키워드 (쉼표 구분, 영어)",
  "emotionVariants": [
    { "emotion": "감정명", "appearanceChange": "외형 변화", "promptAddition": "영어 프롬프트 추가 키워드" }
  ],
  "confidence": "high | medium | low"
}

## 규칙
- 이미지인 경우: 보이는 시각적 요소를 최대한 상세히 묘사
- 문서인 경우: 캐릭터 관련 텍스트에서 정보 추출
- 추측이 아닌 관찰된 정보만 기재
- emotionVariants는 레퍼런스에서 다양한 감정 표현이 보이는 경우에만 채움
- 마크다운 코드 블록 없이 순수 JSON만 출력`,

  background: `당신은 애니메이션/영상 배경 디자인 분석 전문가입니다.
업로드된 레퍼런스를 분석하여 배경/환경 정보를 추출하세요.

다음 JSON 형식으로만 응답하세요:
{
  "location": "장소 설명 (구체적으로)",
  "backgroundDescription": "배경 상세 묘사 (공간 구조, 소품, 분위기, 색감 등 3~5문장)",
  "lighting": "조명 특성 (빛의 방향, 강도, 색온도, 분위기)",
  "colorGrade": "색감/그레이딩 특성 (톤, 대비, 채도 등)",
  "timeOfDay": "morning | afternoon | evening | night | interior",
  "weather": "날씨/대기 상태 (해당되면)",
  "moodKeywords": "분위기 키워드 (쉼표 구분)",
  "promptDescription": "이 배경을 이미지 생성 AI에 설명하는 영어 프롬프트 (150단어)",
  "confidence": "high | medium | low"
}

## 규칙
- 시각적 요소를 최대한 상세히 관찰하고 묘사
- 공간감, 깊이감, 원근법 등도 분석
- 마크다운 코드 블록 없이 순수 JSON만 출력`,

  scene: `당신은 영상 제작 씬 분석 전문가입니다.
업로드된 레퍼런스(스토리보드, 씬 이미지, 콘티 등)를 분석하여 씬 정보를 추출하세요.

다음 JSON 형식으로만 응답하세요:
{
  "title": "씬 제목 (추론 가능하면)",
  "location": "장소",
  "backgroundDescription": "배경 묘사 (2~3문장)",
  "actionDescription": "액션/동작 묘사 (2~3문장)",
  "cameraMovement": "static | pan | tilt | zoom_in | zoom_out | tracking | crane",
  "cameraAngle": "eye_level | high_angle | low_angle | birds_eye | dutch",
  "lighting": "조명 특성",
  "colorGrade": "색감 특성",
  "emotionKeywords": "감정 키워드 (쉼표 구분)",
  "soundDesign": "음향/BGM 제안 (추론 가능하면)",
  "directorNote": "연출 참고 사항",
  "confidence": "high | medium | low"
}

## 규칙
- 카메라 앵글, 구도, 인물 배치 등 연출적 요소를 분석
- 마크다운 코드 블록 없이 순수 JSON만 출력`,

  storyboard: `당신은 스토리보드/콘티 분석 전문가입니다.
업로드된 스토리보드 이미지 또는 문서를 분석하여 프레임 정보를 추출하세요.

다음 JSON 형식으로만 응답하세요:
{
  "frames": [
    {
      "frameNumber": 1,
      "description": "프레임 시각 묘사 (2~3문장)",
      "cameraNote": "카메라 위치/앵글/무빙",
      "action": "캐릭터 액션/동작",
      "dialogue": "대사 (있다면)",
      "emotion": "감정 키워드"
    }
  ],
  "overallMood": "전체 분위기 설명",
  "confidence": "high | medium | low"
}

## 규칙
- 각 프레임/컷을 순서대로 분석
- 마크다운 코드 블록 없이 순수 JSON만 출력`,

  style: `당신은 아트 스타일 분석 전문가입니다.
업로드된 레퍼런스의 아트 스타일을 분석하세요.

다음 JSON 형식으로만 응답하세요:
{
  "artStyle": "아트 스타일 상세 설명 (톤, 질감, 형태, 렌더링 방식 등)",
  "colorPalette": ["#HEX1", "#HEX2", "#HEX3", "#HEX4", "#HEX5", "#HEX6"],
  "moodKeywords": "분위기 키워드 (쉼표 구분)",
  "styleKeywords": "스타일 키워드 (쉼표 구분, 영어)",
  "referenceDescription": "이 스타일을 이미지 AI에 설명하는 영어 프롬프트 (100단어)",
  "confidence": "high | medium | low"
}

## 규칙
- 색상은 가능하면 실제 HEX 코드로 추출
- 마크다운 코드 블록 없이 순수 JSON만 출력`,
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const contextType = (formData.get('contextType') as ContextType) || 'scene'
    const additionalContext = formData.get('additionalContext') as string || ''

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
        { error: '지원하지 않는 파일 형식입니다. 이미지(PNG/JPG/WebP), PDF, DOCX, TXT 파일을 업로드하세요.' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      || file.type === 'application/msword'

    const basePrompt = PROMPTS[contextType] || PROMPTS.scene
    const prompt = additionalContext
      ? `${basePrompt}\n\n## 추가 컨텍스트\n${additionalContext}`
      : basePrompt

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
        return NextResponse.json({ error: '파일에서 텍스트를 추출할 수 없습니다.' }, { status: 400 })
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

    return NextResponse.json({ success: true, data: parsed, contextType })
  } catch (error: any) {
    console.error('Reference analyze error:', error)
    return NextResponse.json(
      { error: '레퍼런스 분석 중 오류가 발생했습니다: ' + error.message },
      { status: 500 }
    )
  }
}
