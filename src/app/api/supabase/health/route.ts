import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * GET /api/supabase/health
 * Supabase 연결 테스트 및 테이블 존재 확인
 */
export async function GET() {
  try {
    const db = createServerSupabase()

    // credit_packages 테이블 조회로 연결 + 스키마 검증
    const { data: packages, error } = await db
      .from('credit_packages')
      .select('id, name, credits, price_krw')
      .eq('is_active', true)

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, hint: 'sql/001_initial_schema.sql을 Supabase SQL Editor에서 실행했는지 확인하세요.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'Supabase 연결 성공',
      tables: ['users', 'credit_transactions', 'subscriptions', 'credit_packages'],
      packages,
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    )
  }
}
