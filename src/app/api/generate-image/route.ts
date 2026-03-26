import { NextRequest, NextResponse } from 'next/server'
import { generateImage, fetchImageAsBase64, ImagenModelId } from '@/lib/imagen'

export interface GenerateImageRequest {
  prompt: string
  negativePrompt?: string
  aspectRatio?: string
  model?: ImagenModelId
  /** 확정 에셋 / 캐릭터 레퍼런스 이미지 URLs (캐릭터 일관성용) */
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

  const { prompt, negativePrompt, aspectRatio, model, referenceImageUrls } = body
  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'prompt가 필요합니다.' }, { status: 400 })
  }

  // 레퍼런스 이미지 최대 3장 로딩 (request 크기 관리)
  let referenceImages: { mimeType: string; data: string }[] | undefined
  if (referenceImageUrls && referenceImageUrls.length > 0) {
    const fetched = await Promise.all(
      referenceImageUrls.slice(0, 3).map(url => fetchImageAsBase64(url))
    )
    const valid = fetched.filter(Boolean) as { mimeType: string; data: string }[]
    if (valid.length > 0) referenceImages = valid
  }

  try {
    const result = await generateImage(apiKey, {
      prompt,
      negativePrompt,
      aspectRatio: aspectRatio as any,
      model,
      referenceImages,
    })

    return NextResponse.json({
      imageData: result.imageData,
      mimeType: result.mimeType,
      model: result.modelUsed,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
