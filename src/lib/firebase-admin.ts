import * as admin from 'firebase-admin'

let app: admin.app.App | null = null

/**
 * Firebase Admin SDK 싱글톤 초기화
 * FIREBASE_SERVICE_ACCOUNT_JSON 환경변수에 서비스 계정 JSON 문자열이 필요
 * Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성
 */
export function getFirebaseAdmin(): admin.app.App {
  if (app) return app

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON 환경변수가 설정되지 않았습니다.\n' +
      'Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성\n' +
      '생성된 JSON 파일 내용을 한 줄로 압축하여 .env.local에 추가하세요.'
    )
  }

  if (admin.apps.length > 0) {
    app = admin.apps[0]!
    return app
  }

  const serviceAccount = JSON.parse(serviceAccountJson)
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  })

  return app
}

export function getAdminFirestore() {
  return getFirebaseAdmin().firestore()
}
