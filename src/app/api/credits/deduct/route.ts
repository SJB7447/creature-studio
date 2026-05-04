import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export interface DeductCreditsRequest {
  uid: string
  amount: number
  feature: string       // 'image_generate' | 'story_generate' | 'scene_split' | 'character_image'
  model?: string        // 'gemini-pro' | 'gemini-flash' | 'imagen3'
  costKrw?: number
}

/**
 * POST /api/credits/deduct
 * 원자적 크레딧 차감 — Postgres 함수(deduct_credits) 사용으로 race condition 방지
 * 잔액 부족 시 402 반환
 */
export async function POST(req: NextRequest) {
  let body: DeductCreditsRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 })
  }

  const { uid, amount, feature, model, costKrw } = body
  if (!uid || !amount || !feature) {
    return NextResponse.json({ error: 'uid, amount, feature 필요' }, { status: 400 })
  }
  if (amount <= 0) {
    return NextResponse.json({ error: 'amount는 양수여야 합니다.' }, { status: 400 })
  }

  const db = createServerSupabase()

  try {
    const { data, error } = await (db as any).rpc('deduct_credits', {
      p_user_id:  uid,
      p_amount:   amount,
      p_feature:  feature,
      p_model:    model ?? null,
      p_cost_krw: costKrw ?? null,
    })

    if (error) {
      // Postgres 함수에서 발생한 예외 처리
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
      throw error
    }

    return NextResponse.json({ ok: true, remainingCredits: data })
  } catch (error: any) {
    console.error('[/api/credits/deduct]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
