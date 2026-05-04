import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/supabase/server'

/**
 * GET /api/user/me?uid=xxx
 * 현재 유저의 Supabase 데이터 반환 (크레딧, 플랜 등)
 */
export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('uid')
  if (!uid) {
    return NextResponse.json({ error: 'uid가 필요합니다.' }, { status: 400 })
  }

  try {
    const user = await getSupabaseUser(uid)
    return NextResponse.json({ user })
  } catch (error: any) {
    // 유저가 아직 없으면 null 반환 (첫 로그인 sync 전)
    if (error.code === 'PGRST116') {
      return NextResponse.json({ user: null })
    }
    console.error('[/api/user/me]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
