import { NextRequest, NextResponse } from 'next/server'
import { upsertSupabaseUser } from '@/lib/supabase/server'

/**
 * POST /api/user/sync
 * Firebase Auth 로그인 후 Supabase users 테이블에 upsert
 * Body: { uid, email, displayName }
 */
export async function POST(req: NextRequest) {
  let body: { uid?: string; email?: string; displayName?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 })
  }

  const { uid, email, displayName } = body
  if (!uid || !email) {
    return NextResponse.json({ error: 'uid와 email이 필요합니다.' }, { status: 400 })
  }

  try {
    await upsertSupabaseUser({ id: uid, email, displayName })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[/api/user/sync]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
