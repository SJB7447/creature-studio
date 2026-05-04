import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * POST /api/supabase/migrate-users
 * Firebase Firestore users → Supabase 일괄 마이그레이션 (로컬 개발 전용)
 *
 * FIREBASE_SERVICE_ACCOUNT_JSON 환경변수가 없으면 상태 보고만 반환.
 * 실제 배포 후에는 scripts/migrate-users.ts 스크립트로 로컬에서 실행 권장.
 */
export async function POST(req: NextRequest) {
  // 로컬 개발 환경에서만 허용
  const host = req.headers.get('host') ?? ''
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1')
  if (!isLocal && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: '마이그레이션은 로컬에서만 실행 가능합니다.' }, { status: 403 })
  }

  const supabase = createServerSupabase()
  const hasAdminSdk = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON

  if (!hasAdminSdk) {
    // Admin SDK 없으면 현재 Supabase 상태만 보고
    const { data: users, error } = await supabase.from('users').select('id, email, plan, credits, created_at')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      ok: false,
      message: 'FIREBASE_SERVICE_ACCOUNT_JSON 환경변수가 필요합니다. scripts/migrate-users.ts 스크립트로 실행하세요.',
      supabase_user_count: users?.length ?? 0,
      setup_guide: 'Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성',
    })
  }

  try {
    // firebase-admin 동적 임포트 (서버 전용)
    const admin = await import('firebase-admin')
    const { getAdminFirestore } = await import('@/lib/firebase-admin')
    const firestore = getAdminFirestore()

    // Firestore users 읽기
    const usersSnap = await firestore.collection('users').get()
    const firestoreUsers = usersSnap.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as { email: string; displayName?: string }),
    }))

    // Supabase 기존 users 조회
    const { data: existingUsers } = await supabase.from('users').select('id')
    const existingIds = new Set((existingUsers ?? []).map((u: any) => u.id))
    const toMigrate = firestoreUsers.filter(u => !existingIds.has(u.id))

    let successCount = 0
    const errors: string[] = []

    for (const user of toMigrate) {
      const { error } = await supabase.from('users').upsert({
        id: user.id,
        email: user.email || '',
        display_name: user.displayName ?? null,
        plan: 'free',
        credits: 200,
        onboarding_completed: false,
      }, { onConflict: 'id', ignoreDuplicates: false })

      if (error) {
        errors.push(`${user.email}: ${error.message}`)
      } else {
        successCount++
      }
    }

    return NextResponse.json({
      ok: true,
      total_firestore: firestoreUsers.length,
      already_in_supabase: existingIds.size,
      migrated: successCount,
      errors,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
