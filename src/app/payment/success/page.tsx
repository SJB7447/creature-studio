'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import { useCreditStore } from '@/store/creditStore'

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { setCredits } = useCreditStore()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [creditsAdded, setCreditsAdded] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId    = searchParams.get('orderId')
    const amount     = searchParams.get('amount')

    if (!paymentKey || !orderId || !amount) {
      setErrorMsg('결제 정보가 올바르지 않습니다.')
      setStatus('error')
      return
    }

    fetch('/api/payments/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setCreditsAdded(data.creditsAdded)
          if (data.remainingCredits != null) setCredits(data.remainingCredits)
          setStatus('success')
          setTimeout(() => router.replace('/dashboard'), 3000)
        } else {
          setErrorMsg(data.error || '결제 처리 중 오류가 발생했습니다.')
          setStatus('error')
        }
      })
      .catch(() => {
        setErrorMsg('서버 오류가 발생했습니다.')
        setStatus('error')
      })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-surface-2)' }}>
      <div className="w-full max-w-sm rounded-2xl shadow-xl p-8 text-center border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: 'var(--color-primary-dark)' }} />
            <p className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>결제 처리 중...</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-sub)' }}>잠시만 기다려주세요.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#ECFDF5' }}>
              <CheckCircle className="w-9 h-9 text-emerald-500" />
            </div>
            <p className="font-bold text-xl" style={{ color: 'var(--color-text)' }}>결제 완료!</p>
            <p className="text-3xl font-bold mt-3" style={{ color: 'var(--color-primary-dark)' }}>
              +{creditsAdded.toLocaleString()} CR
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-sub)' }}>크레딧이 충전되었습니다.</p>
            <p className="text-xs mt-4" style={{ color: 'var(--color-text-sub)' }}>3초 후 대시보드로 이동합니다.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#FEF2F2' }}>
              <XCircle className="w-9 h-9 text-red-500" />
            </div>
            <p className="font-bold text-xl" style={{ color: 'var(--color-text)' }}>결제 실패</p>
            <p className="text-sm mt-2" style={{ color: '#EF4444' }}>{errorMsg}</p>
            <button
              onClick={() => router.replace('/dashboard')}
              className="mt-6 w-full py-2.5 rounded-xl text-white font-medium text-sm"
              style={{ background: 'var(--color-primary-dark)' }}
            >
              대시보드로 돌아가기
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <PaymentSuccessContent />
    </Suspense>
  )
}
