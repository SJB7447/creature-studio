import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const UPSCALE_MODEL = 'imagen-3.0-capability-001'

export interface UpscaleImageRequest {
  /** Firebase Storage URL or any public image URL */
  imageUrl: string
  /** 업스케일 배율: "x2" (기본) 또는 "x4" */
  factor?: 'x2' | 'x4'
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }, { status: 500 })
  }

  let body: UpscaleImageRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const { imageUrl, factor = 'x2' } = body
  if (!imageUrl) {
    return NextResponse.json({ error: 'imageUrl이 필요합니다.' }, { status: 400 })
  }

  // 이미지 URL → base64
  let base64Data: string
  let mimeType: string
  try {
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) throw new Error(`이미지 fetch 실패: ${imgRes.status}`)
    const contentType = imgRes.headers.get('content-type') ?? 'image/png'
    mimeType = contentType.split(';')[0].trim()
    const buffer = await imgRes.arrayBuffer()
    base64Data = Buffer.from(buffer).toString('base64')
  } catch (e: any) {
    return NextResponse.json({ error: `이미지 로딩 실패: ${e.message}` }, { status: 400 })
  }

  // Imagen 업스케일 API 호출
  const url = `${GEMINI_API_BASE}/models/${UPSCALE_MODEL}:predict?key=${apiKey}`
  const requestBody = {
    instances: [{
      prompt: '',
      image: { bytesBase64Encoded: base64Data },
      mode: 'upscale',
    }],
    parameters: {
      sampleCount: 1,
      upscaleConfig: { upscaleFactor: factor },
    },
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    const rawText = await res.text()
    if (!res.ok) {
      let errMsg = res.statusText
      try { errMsg = JSON.parse(rawText)?.error?.message ?? errMsg } catch {}
      console.error(`[upscale-image] HTTP ${res.status}:`, rawText.slice(0, 500))
      return NextResponse.json({ error: `업스케일 실패: ${errMsg}` }, { status: res.status })
    }

    const data = JSON.parse(rawText)
    const prediction = data.predictions?.[0]
    if (!prediction?.bytesBase64Encoded) {
      console.error('[upscale-image] 응답에 이미지 없음:', rawText.slice(0, 300))
      return NextResponse.json({ error: '업스케일 응답에 이미지가 없습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      imageData: prediction.bytesBase64Encoded,
      mimeType: prediction.mimeType ?? 'image/png',
    })
  } catch (e: any) {
    console.error('[upscale-image] 오류:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
