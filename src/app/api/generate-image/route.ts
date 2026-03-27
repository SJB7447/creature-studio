import { NextRequest, NextResponse } from 'next/server'
import { generateImages, fetchImageAsBase64, ImagenModelId } from '@/lib/imagen'

export interface GenerateImageRequest {
  prompt: string
  negativePrompt?: string
  aspectRatio?: string
  model?: ImagenModelId
  count?: number  // 생성할 이미지 수 (기본 4)
  referenceImageUrls?: string[]
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }, { status: 500 })
  }

  let body: GenerateImageRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const { prompt, negativePrompt, aspectRatio, model, count = 4, referenceImageUrls } = body
  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'prompt가 필요합니다.' }, { status: 400 })
  }

  // 레퍼런스 이미지 로딩 (최대 3장)
  let referenceImages: { mimeType: string; data: string }[] | undefined
  if (referenceImageUrls && referenceImageUrls.length > 0) {
    const fetched = await Promise.all(
      referenceImageUrls.slice(0, 3).map(url => fetchImageAsBase64(url))
    )
    const valid = fetched.filter(Boolean) as { mimeType: string; data: string }[]
    if (valid.length > 0) referenceImages = valid
  }

  try {
    const result = await generateImages(apiKey, {
      prompt,
      negativePrompt,
      aspectRatio: aspectRatio as any,
      model,
      count: Math.min(count, 4),
      referenceImages,
    })

    return NextResponse.json({
      images: result.images,   // Array<{ imageData: string, mimeType: string }>
      model: result.modelUsed,
    })
  } catch (error: any) {
    console.error('[/api/generate-image] 오류:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
