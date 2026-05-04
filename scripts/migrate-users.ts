/**
 * Firebase Firestore users → Supabase users 일괄 마이그레이션 스크립트
 *
 * 실행 전 .env.local에 다음 환경변수 필요:
 *   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
 *   NEXT_PUBLIC_SUPABASE_URL=https://...
 *   SUPABASE_SECRET_KEY=sb_secret_...
 *
 * 실행 방법:
 *   npx tsx scripts/migrate-users.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.local 로드
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import * as admin from 'firebase-admin'
import { createClient } from '@supabase/supabase-js'

const INITIAL_CREDITS = 200

async function migrate() {
  console.log('=== CreatureStudio 사용자 마이그레이션 시작 ===\n')

  // ── Firebase Admin 초기화 ──────────────────────────────────
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) {
    console.error(
      '❌ FIREBASE_SERVICE_ACCOUNT_JSON 환경변수가 없습니다.\n' +
      '   Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성\n' +
      '   JSON 내용을 한 줄로 압축하여 .env.local에 추가하세요.'
    )
    process.exit(1)
  }

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
    })
  }
  const firestore = admin.firestore()

  // ── Supabase Admin 클라이언트 ──────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경변수가 없습니다.')
    process.exit(1)
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Firestore users 컬렉션 읽기 ───────────────────────────
  console.log('📖 Firestore users 컬렉션 읽는 중...')
  const usersSnap = await firestore.collection('users').get()
  const firestoreUsers = usersSnap.docs.map(doc => ({
    uid: doc.id,
    ...(doc.data() as { email: string; displayName?: string; photoURL?: string }),
  }))
  console.log(`   총 ${firestoreUsers.length}명 발견\n`)

  // ── Supabase 기존 users 확인 ───────────────────────────────
  const { data: existingUsers } = await supabase.from('users').select('id')
  const existingIds = new Set((existingUsers ?? []).map((u: any) => u.id))
  console.log(`   Supabase에 이미 존재: ${existingIds.size}명`)

  const toMigrate = firestoreUsers.filter(u => !existingIds.has(u.uid))
  console.log(`   신규 마이그레이션 대상: ${toMigrate.length}명\n`)

  if (toMigrate.length === 0) {
    console.log('✅ 모든 사용자가 이미 Supabase에 존재합니다.')
    process.exit(0)
  }

  // ── Supabase upsert ────────────────────────────────────────
  let successCount = 0
  let errorCount = 0

  for (const user of toMigrate) {
    const { error } = await supabase.from('users').upsert({
      id: user.uid,
      email: user.email || '',
      display_name: user.displayName ?? null,
      plan: 'free',
      credits: INITIAL_CREDITS,
      onboarding_completed: false,
    }, { onConflict: 'id', ignoreDuplicates: false })

    if (error) {
      console.error(`   ❌ ${user.email} (${user.uid}): ${error.message}`)
      errorCount++
    } else {
      console.log(`   ✅ ${user.email} → ${INITIAL_CREDITS}CR 지급`)
      successCount++
    }
  }

  console.log(`\n=== 마이그레이션 완료 ===`)
  console.log(`   성공: ${successCount}명`)
  console.log(`   실패: ${errorCount}명`)
  console.log(`   기존: ${existingIds.size}명 (건너뜀)`)
}

migrate().catch(err => {
  console.error('마이그레이션 오류:', err)
  process.exit(1)
})
