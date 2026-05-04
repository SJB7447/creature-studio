import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

const WELCOME_BONUS = 50

/**
 * POST /api/onboarding/complete
 * body: { uid, productionType }
 * - onboarding_completed = true
 * - 웰컴 보너스 50CR (최초 1회)
 */
export async function POST(req: NextRequest) {
  let body: { uid: string; productionType?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }

  const { uid, productionType } = body
  if (!uid) return NextResponse.json({ error: 'uid 필요' }, { status: 400 })

  const db = createServerSupabase()

  // 현재 상태 확인
  const { data: user, error: fetchErr } = await db
    .from('users')
    .select('welcome_bonus_given, credits')
    .eq('id', uid)
    .single()

  if (fetchErr || !user) {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
  }

  // onboarding_completed + production_type 업데이트
  await db.from('users').update({
    onboarding_completed: true,
    production_type:      productionType ?? null,
  }).eq('id', uid)

  // 웰컴 보너스 (최초 1회만)
  let bonusGiven = false
  if (!user.welcome_bonus_given) {
    const { error: bonusErr } = await db.rpc('add_credits', {
      p_user_id: uid,
      p_amount:  WELCOME_BONUS,
      p_type:    'bonus',
      p_feature: 'welcome_bonus',
    })
    if (!bonusErr) {
      await db.from('users').update({ welcome_bonus_given: true }).eq('id', uid)
      bonusGiven = true
    }
  }

  const { data: updated } = await db
    .from('users')
    .select('credits')
    .eq('id', uid)
    .single()

  return NextResponse.json({
    ok:               true,
    bonusGiven,
    bonusAmount:      bonusGiven ? WELCOME_BONUS : 0,
    remainingCredits: updated?.credits ?? null,
  })
}
