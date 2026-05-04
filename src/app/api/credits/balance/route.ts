import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase/server'

/**
 * GET /api/credits/balance?uid=xxx
 * 현재 유저의 크레딧 잔액 + 플랜 반환
 */
export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('uid')
  if (!uid) return NextResponse.json({ error: 'uid 필요' }, { status: 400 })

  try {
    const user = await getSupabaseUser(uid)
    return NextResponse.json({
      credits:              user.credits,
      plan:                 user.plan,
      onboardingCompleted: (user as any).onboarding_completed ?? false,
    })
  } catch (error: any) {
    // 아직 Supabase에 없는 신규 유저는 기본값 반환
    if (error.code === 'PGRST116') {
      return NextResponse.json({ credits: 200, plan: 'free', onboardingCompleted: false })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
