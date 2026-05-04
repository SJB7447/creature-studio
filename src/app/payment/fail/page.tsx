'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'

function PaymentFailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const errorCode = searchParams.get('code') || ''
  const errorMsg  = searchParams.get('message') || '결제가 취소되었습니다.'

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-surface-2)' }}>
      <div className="w-full max-w-sm rounded-2xl shadow-xl p-8 text-center border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#FEF2F2' }}>
          <XCircle className="w-9 h-9 text-red-500" />
        </div>
        <p className="font-bold text-xl" style={{ color: 'var(--color-text)' }}>결제 실패</p>
        <p className="text-sm mt-2" style={{ color: '#EF4444' }}>{errorMsg}</p>
        {errorCode && (
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-sub)' }}>코드: {errorCode}</p>
        )}
        <button
          onClick={() => router.replace('/dashboard')}
          className="mt-6 w-full py-2.5 rounded-xl text-white font-medium text-sm"
          style={{ background: 'var(--color-primary-dark)' }}
        >
          대시보드로 돌아가기
        </button>
      </div>
    </div>
  )
}

export default function PaymentFailPage() {
  return (
    <Suspense>
      <PaymentFailContent />
    </Suspense>
  )
}
