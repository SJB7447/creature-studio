import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, getSupabaseUser } from '@/lib/supabase/server'

/**
 * POST /api/admin/set-credits
 * Body: { uid: string; amount: number }
 *
 * 관리자 전용 — NEXT_PUBLIC_ADMIN_EMAIL(=ADMIN_EMAIL)과 일치하는 유저만 허용
 * uid로 Supabase에서 email을 조회하여 검증
 */
export async function POST(req: NextRequest) {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (!adminEmail) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_ADMIN_EMAIL 환경변수가 설정되지 않았습니다.' }, { status: 500 })
  }

  let body: { uid: string; amount: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 })
  }

  const { uid, amount } = body
  if (!uid || typeof amount !== 'number' || amount < 0) {
    return NextResponse.json({ error: 'uid와 amount(>=0)가 필요합니다.' }, { status: 400 })
  }

  // uid → Supabase email 조회 후 관리자 검증
  let userEmail: string | null = null
  try {
    const user = await getSupabaseUser(uid)
    userEmail = (user as any).email ?? null
  } catch {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (userEmail !== adminEmail) {
    return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 })
  }

  const db = createServerSupabase()

  // 크레딧만 업데이트 (plan 등 다른 필드는 유지)
  const { error } = await db.from('users')
    .update({
      credits: amount,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', uid)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 트랜잭션 기록 (실패해도 무시)
  await db.from('credit_transactions').insert({
    user_id: uid,
    amount,
    type: 'charge',
    feature: 'admin_set',
    model_used: null,
    cost_krw: 0,
  }).then(() => {})

  return NextResponse.json({ ok: true, credits: amount })
}
