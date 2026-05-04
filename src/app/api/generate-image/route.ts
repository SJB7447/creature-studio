import { NextRequest, NextResponse } from 'next/server'
import { generateImages, fetchImageAsBase64, ImagenModelId } from '@/lib/imagen'
import { createServerSupabase } from '@/lib/supabase/server'

const CREDIT_COST: Record<string, number> = {
  'gemini-pro':   18,
  'imagen3':      18,
  'gemini-flash': 8,
}

export interface GenerateImageRequest {
  prompt: string
  negativePrompt?: string
  aspectRatio?: string
  model?: ImagenModelId
  count?: number
  referenceImageUrls?: string[]
  uid?: string        // Firebase UID (크레딧 차감용)
  feature?: string    // 'image_generate' | 'character_image'
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

  const { prompt, negativePrompt, aspectRatio, model = 'gemini-flash', count = 4, referenceImageUrls, uid, feature = 'image_generate' } = body
  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'prompt가 필요합니다.' }, { status: 400 })
  }

  // 크레딧 차감 (uid 제공 시)
  if (uid) {
    const creditCost = CREDIT_COST[model] ?? 8
    const db = createServerSupabase()
    const { data, error } = await (db as any).rpc('deduct_credits', {
      p_user_id:  uid,
      p_amount:   creditCost,
      p_feature:  feature,
      p_model:    model,
      p_cost_krw: null,
    })

    if (error) {
      const msg = error.message ?? ''
      if (msg.includes('Insufficient credits')) {
        return NextResponse.json(
          { error: '크레딧이 부족합니다.', code: 'insufficient_credits' },
          { status: 402 }
        )
      }
      if (msg.includes('User not found')) {
        return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
      }
      console.error('[/api/generate-image] credit deduct error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // data = remaining credits after deduction
    console.log(`[/api/generate-image] deducted ${CREDIT_COST[model] ?? 8} CR, remaining: ${data}`)
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
      images: result.images,
      model: result.modelUsed,
    })
  } catch (error: any) {
    console.error('[/api/generate-image] 오류:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
