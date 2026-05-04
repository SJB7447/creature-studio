import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, getSupabaseUser } from '@/lib/supabase/server'

/**
 * GET /api/admin/transactions?uid=xxx&limit=20
 * 관리자 전용 — NEXT_PUBLIC_ADMIN_EMAIL과 일치하는 유저만 허용
 */
export async function GET(req: NextRequest) {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  const uid = req.nextUrl.searchParams.get('uid')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '30', 10)

  if (!uid) return NextResponse.json({ error: 'uid 필요' }, { status: 400 })

  // 관리자 검증
  try {
    const user = await getSupabaseUser(uid)
    if ((user as any).email !== adminEmail) {
      return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
  }

  const db = createServerSupabase()
  const { data, error } = await db
    .from('credit_transactions')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transactions: data })
}
