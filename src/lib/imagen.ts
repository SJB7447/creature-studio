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
    // 환경변수 IMAGEN3_MODEL_NAME이 있으면 우선 사용, 없으면 기본값
    modelName: process.env.IMAGEN3_MODEL_NAME ?? 'imagen-3.0-generate-002',
    desc: '최고화질 · 레퍼런스 없음 · 배경/독립 오브젝트',
    supportsReference: false,
    recommended: 'background',
  },
  'gemini-flash': {
    id: 'gemini-flash',
    label: 'Gemini Flash',
    // 환경변수 GEMINI_FLASH_MODEL_NAME이 있으면 우선 사용
    modelName: process.env.GEMINI_FLASH_MODEL_NAME ?? 'gemini-2.0-flash-preview-image-generation',
    desc: '빠름 · 캐릭터 일관성 · 컷별 생성',
    supportsReference: true,
    recommended: 'cuts',
  },
  'gemini-pro': {
    id: 'gemini-pro',
    label: 'Gemini Pro',
    // 환경변수 GEMINI_PRO_MODEL_NAME이 있으면 우선 사용
    modelName: process.env.GEMINI_PRO_MODEL_NAME ?? 'gemini-2.0-flash-preview-image-generation',
    desc: '최고품질 · 레퍼런스 지원 · 대표 이미지',
    supportsReference: true,
    recommended: 'hero',
  },
}

// 실제 모델 ID 교체가 필요한 경우 이 상수만 수정하면 됩니다
// (예: 'gemini-3-pro-image-preview' 등 확정 모델명으로)
export function setGeminiProModelName(modelName: string) {
  IMAGEN_MODELS['gemini-pro'].modelName = modelName
}

export interface GenerateImageOptions {
  prompt: string
  negativePrompt?: string
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '2.39:1'
  /** base64 reference images — Gemini Flash/Pro only (캐릭터 일관성) */
  referenceImages?: { mimeType: string; data: string }[]
  model?: ImagenModelId
}

export interface GenerateImageResult {
  imageData: string  // base64
  mimeType: string
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
): Promise<GenerateImageResult> {
  const modelName = IMAGEN_MODELS.imagen3.modelName
  const url = `${GEMINI_API_BASE}/models/${modelName}:predict?key=${apiKey}`

  const body = {
    instances: [{ prompt: opts.prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: toImagenAspectRatio(opts.aspectRatio),
      ...(opts.negativePrompt ? { negativePrompt: opts.negativePrompt } : {}),
      safetySetting: 'block_only_high',
      personGeneration: 'allow_adult',
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
  const prediction = data.predictions?.[0]
  if (!prediction?.bytesBase64Encoded) {
    console.error('[Imagen 3] 응답에 이미지 데이터 없음:', rawText.slice(0, 500))
    throw new Error('Imagen 3 응답에 이미지 데이터가 없습니다. 안전 필터 또는 모델 접근 권한을 확인하세요.')
  }
  return { imageData: prediction.bytesBase64Encoded, mimeType: prediction.mimeType ?? 'image/png', modelUsed: 'imagen3' }
}

async function generateWithGemini(
  apiKey: string,
  opts: GenerateImageOptions,
  modelId: 'gemini-flash' | 'gemini-pro'
): Promise<GenerateImageResult> {
  const modelName = IMAGEN_MODELS[modelId].modelName
  const url = `${GEMINI_API_BASE}/models/${modelName}:generateContent?key=${apiKey}`

  const parts: any[] = [{ text: opts.prompt }]
  if (opts.referenceImages && opts.referenceImages.length > 0) {
    for (const ref of opts.referenceImages) {
      parts.push({ inline_data: { mime_type: ref.mimeType, data: ref.data } })
    }
  }

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { responseModalities: ['IMAGE'] },
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

  // 안전 필터로 블록된 경우 확인
  const candidate = data.candidates?.[0]
  if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
    console.error(`[${IMAGEN_MODELS[modelId].label}] 생성 블록됨: ${candidate.finishReason}`, rawText.slice(0, 500))
    throw new Error(`${IMAGEN_MODELS[modelId].label}: 이미지 생성이 차단되었습니다 (${candidate.finishReason}). 프롬프트를 수정해 보세요.`)
  }

  const imagePart = candidate?.content?.parts?.find((p: any) => p.inline_data)
  if (!imagePart?.inline_data?.data) {
    console.error(`[${IMAGEN_MODELS[modelId].label}] 응답에 이미지 없음 — model: ${modelName}\n`, rawText.slice(0, 500))
    throw new Error(`${IMAGEN_MODELS[modelId].label}: 응답에 이미지 데이터가 없습니다. 모델명(${modelName})이 올바른지 확인하세요.`)
  }
  return {
    imageData: imagePart.inline_data.data,
    mimeType: imagePart.inline_data.mime_type ?? 'image/png',
    modelUsed: modelId,
  }
}

/**
 * 이미지 생성 메인 함수
 * - 레퍼런스 이미지가 있고 imagen3를 선택하면 자동으로 gemini-flash로 fallback
 */
export async function generateImage(
  apiKey: string,
  opts: GenerateImageOptions
): Promise<GenerateImageResult> {
  const hasRef = (opts.referenceImages?.length ?? 0) > 0
  let modelId = opts.model ?? 'imagen3'

  // imagen3는 레퍼런스 이미지를 지원하지 않으므로 fallback
  if (hasRef && modelId === 'imagen3') {
    modelId = 'gemini-flash'
  }

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
