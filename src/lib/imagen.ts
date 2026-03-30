/**
 * Google Image Generation — Imagen 3, Gemini Flash, Gemini Pro
 *
 * Model 선택 기준:
 *  - imagen3       : 최고화질, 레퍼런스 이미지 미지원 → 배경/오브젝트 독립 컷
 *  - gemini-flash  : 빠름, 레퍼런스 이미지 지원 → 컷별 캐릭터 일관성
 *  - gemini-pro    : 최고품질 + 레퍼런스 지원 → 대표 이미지 / 최종 납품
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

export type ImagenModelId = 'imagen3' | 'gemini-flash' | 'gemini-pro'

export interface ImagenModelConfig {
  id: ImagenModelId
  label: string
  modelName: string
  desc: string
  supportsReference: boolean
  recommended: 'cuts' | 'hero' | 'background'
}

export const IMAGEN_MODELS: Record<ImagenModelId, ImagenModelConfig> = {
  'imagen3': {
    id: 'imagen3',
    label: 'Imagen 3',
    modelName: 'imagen-4.0-generate-001',
    desc: '최고화질 · 레퍼런스 없음 · 배경/독립 오브젝트',
    supportsReference: false,
    recommended: 'background',
  },
  'gemini-flash': {
    id: 'gemini-flash',
    label: 'Gemini Flash',
    modelName: 'gemini-3.1-flash-image-preview',
    desc: '빠름 · 캐릭터 일관성 · 컷별 생성',
    supportsReference: true,
    recommended: 'cuts',
  },
  'gemini-pro': {
    id: 'gemini-pro',
    label: 'Gemini Pro',
    modelName: 'gemini-3-pro-image-preview',
    desc: '최고품질 · 레퍼런스 지원 · 대표 이미지',
    supportsReference: true,
    recommended: 'hero',
  },
}

// 실제 모델 ID 교체가 필요한 경우 이 상수만 수정하면 됩니다
// (예: 'gemini-3-pro-image-preview' 등 확정 모델명으로)

export interface GenerateImageOptions {
  prompt: string
  negativePrompt?: string
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '2.39:1'
  /** base64 reference images — Gemini Flash/Pro only (캐릭터 일관성) */
  referenceImages?: { mimeType: string; data: string }[]
  model?: ImagenModelId
  /** 생성할 이미지 수 (기본 4) */
  count?: number
}

export interface GenerateImageResult {
  imageData: string  // base64 (단일 이미지)
  mimeType: string
  modelUsed: ImagenModelId
}

export interface GenerateImagesResult {
  images: Array<{ imageData: string; mimeType: string }>
  modelUsed: ImagenModelId
}

// Imagen 3 API의 aspect ratio 형식으로 변환
function toImagenAspectRatio(ar?: string): string {
  const map: Record<string, string> = {
    '16:9': '16:9',
    '9:16': '9:16',
    '1:1': '1:1',
    '4:3': '4:3',
    '3:4': '3:4',
    '2.39:1': '16:9',
  }
  return map[ar ?? ''] ?? '16:9'
}

async function generateWithImagen3(
  apiKey: string,
  opts: GenerateImageOptions
): Promise<GenerateImagesResult> {
  const count = Math.min(opts.count ?? 4, 4)
  const modelName = IMAGEN_MODELS.imagen3.modelName
  const url = `${GEMINI_API_BASE}/models/${modelName}:predict?key=${apiKey}`

  const body = {
    instances: [{ prompt: opts.prompt }],
    parameters: {
      sampleCount: count,  // Imagen 3는 네이티브 배치 지원
      aspectRatio: toImagenAspectRatio(opts.aspectRatio),
      ...(opts.negativePrompt ? { negativePrompt: opts.negativePrompt } : {}),
      safetySetting: 'block_only_high',
      personGeneration: 'allow_adult',
      outputOptions: {
        mimeType: 'image/png',  // lossless PNG 출력
      },
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const rawText = await res.text()
  if (!res.ok) {
    let errMsg = res.statusText
    try { errMsg = JSON.parse(rawText)?.error?.message ?? errMsg } catch {}
    console.error(`[Imagen 3] HTTP ${res.status} — model: ${modelName}\n${rawText}`)
    throw new Error(`Imagen 3 오류 (HTTP ${res.status}): ${errMsg}`)
  }

  const data = JSON.parse(rawText)
  const predictions = data.predictions ?? []
  if (predictions.length === 0 || !predictions[0]?.bytesBase64Encoded) {
    console.error('[Imagen 3] 응답에 이미지 데이터 없음:', rawText.slice(0, 500))
    throw new Error('Imagen 3 응답에 이미지 데이터가 없습니다. 안전 필터 또는 모델 접근 권한을 확인하세요.')
  }
  return {
    images: predictions
      .filter((p: any) => p.bytesBase64Encoded)
      .map((p: any) => ({ imageData: p.bytesBase64Encoded, mimeType: p.mimeType ?? 'image/png' })),
    modelUsed: 'imagen3',
  }
}

async function generateWithGemini(
  apiKey: string,
  opts: GenerateImageOptions,
  modelId: 'gemini-flash' | 'gemini-pro'
): Promise<GenerateImagesResult> {
  const count = Math.min(opts.count ?? 4, 4)
  const modelName = IMAGEN_MODELS[modelId].modelName

  // Gemini는 배치 미지원 → 병렬 호출
  const singleCall = async (): Promise<{ imageData: string; mimeType: string }> => {
    const url = `${GEMINI_API_BASE}/models/${modelName}:generateContent?key=${apiKey}`
    const hasRef = (opts.referenceImages?.length ?? 0) > 0
    const parts: any[] = []

    // 비율 지시 (Gemini는 generationConfig.aspectRatio 미지원 → 프롬프트에 명시)
    const ar = toImagenAspectRatio(opts.aspectRatio)
    const arInstruction = `Generate this image in ${ar} (widescreen landscape) aspect ratio.\n\n`

    // 레퍼런스 이미지가 있으면 이미지를 먼저 첨부하고 캐릭터 일관성 지시를 명시
    if (hasRef) {
      for (const ref of opts.referenceImages!) {
        parts.push({ inline_data: { mime_type: ref.mimeType, data: ref.data } })
      }
      parts.push({
        text: `${arInstruction}The image(s) above are character reference sheets. Maintain the exact appearance, design, and style of these characters in the generated image.\n\n${opts.prompt}`,
      })
    } else {
      parts.push({ text: arInstruction + opts.prompt })
    }

    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const rawText = await res.text()
    if (!res.ok) {
      let errMsg = res.statusText
      try { errMsg = JSON.parse(rawText)?.error?.message ?? errMsg } catch {}
      console.error(`[${IMAGEN_MODELS[modelId].label}] HTTP ${res.status} — model: ${modelName}\n${rawText}`)
      throw new Error(`${IMAGEN_MODELS[modelId].label} 오류 (HTTP ${res.status}): ${errMsg}`)
    }
    const data = JSON.parse(rawText)
    const candidate = data.candidates?.[0]
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      console.error(`[${IMAGEN_MODELS[modelId].label}] 생성 블록됨: ${candidate.finishReason}`)
      throw new Error(`${IMAGEN_MODELS[modelId].label}: 이미지 생성이 차단되었습니다 (${candidate.finishReason}). 프롬프트를 수정해 보세요.`)
    }
    const imagePart = candidate?.content?.parts?.find((p: any) => p.inline_data ?? p.inlineData)
    const inlineData = imagePart?.inline_data ?? imagePart?.inlineData
    if (!inlineData?.data) {
      console.error(`[${IMAGEN_MODELS[modelId].label}] 응답에 이미지 없음 — model: ${modelName}\n`, rawText.slice(0, 300))
      throw new Error(`${IMAGEN_MODELS[modelId].label}: 응답에 이미지 데이터가 없습니다. 모델명(${modelName})이 올바른지 확인하세요.`)
    }
    return { imageData: inlineData.data, mimeType: inlineData.mime_type ?? inlineData.mimeType ?? 'image/png' }
  }

  // count 수만큼 병렬 호출
  const results = await Promise.all(Array.from({ length: count }, () => singleCall()))
  return { images: results, modelUsed: modelId }
}

/**
 * 다중 이미지 생성 메인 함수 (4장 후보 생성)
 * - 레퍼런스 이미지가 있고 imagen3 선택 시 gemini-flash로 자동 fallback
 */
export async function generateImages(
  apiKey: string,
  opts: GenerateImageOptions
): Promise<GenerateImagesResult> {
  const hasRef = (opts.referenceImages?.length ?? 0) > 0
  let modelId = opts.model ?? 'gemini-flash'

  if (hasRef && modelId === 'imagen3') modelId = 'gemini-flash'

  switch (modelId) {
    case 'imagen3':
      return generateWithImagen3(apiKey, opts)
    case 'gemini-flash':
    case 'gemini-pro':
      return generateWithGemini(apiKey, opts, modelId)
  }
}

/**
 * URL → base64 변환 (확정 에셋 레퍼런스 이미지 로딩용)
 */
export async function fetchImageAsBase64(
  url: string
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const mimeType = contentType.split(';')[0].trim()
    const buffer = await res.arrayBuffer()
    const data = Buffer.from(buffer).toString('base64')
    return { data, mimeType }
  } catch {
    return null
  }
}
