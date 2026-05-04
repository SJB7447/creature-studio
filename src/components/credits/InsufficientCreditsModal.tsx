'use client'

import { useState } from 'react'
import { useCreditStore } from '@/store/creditStore'
import { useAuthStore } from '@/store/authStore'
import { X, Zap, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const PACKAGES = [
  { id: 1, credits: 100,   amount: 1_500,  label: '스타터' },
  { id: 2, credits: 500,   amount: 6_900,  label: '베이직', badge: '인기' },
  { id: 3, credits: 1_000, amount: 12_900, label: '스탠다드' },
  { id: 4, credits: 3_000, amount: 35_900, label: '프로' },
]

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? ''

export function InsufficientCreditsModal() {
  const { showChargeModal, requiredCredits, credits, setShowChargeModal } = useCreditStore()
  const { user } = useAuthStore()
  const [loadingPkgId, setLoadingPkgId] = useState<number | null>(null)

  if (!showChargeModal) return null

  const isTestMode = !TOSS_CLIENT_KEY || TOSS_CLIENT_KEY === 'test_ck_placeholder'

  async function handleCharge(pkg: typeof PACKAGES[0]) {
    if (!user?.uid) { toast.error('로그인이 필요합니다.'); return }
    if (isTestMode) {
      toast.info(`TossPayments 키를 .env.local에 설정하면 실결제가 가능합니다.\n(${pkg.credits} CR / ₩${pkg.amount.toLocaleString()})`)
      return
    }

    setLoadingPkgId(pkg.id)
    try {
      // 1. 주문 생성
      const prepRes = await fetch('/api/payments/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, packageId: pkg.id }),
      })
      const prepData = await prepRes.json()
      if (!prepRes.ok) throw new Error(prepData.error)

      // 2. TossPayments 위젯 실행
      const { loadTossPayments } = await import('@tosspayments/sdk')
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY) as any
      const payment = tossPayments.payment({ customerKey: user.uid })

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: prepData.amount },
        orderId: prepData.orderId,
        orderName: prepData.orderName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl:    `${window.location.origin}/payment/fail`,
        customerEmail: user.email ?? undefined,
        customerName:  user.displayName ?? undefined,
      })
      // requestPayment는 페이지를 이동시키므로 아래 코드는 실행되지 않음
    } catch (e: any) {
      if (e?.code !== 'USER_CANCEL') {
        toast.error(e?.message || '결제 오류가 발생했습니다.')
      }
      setLoadingPkgId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={() => setShowChargeModal(false)}
    >
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl p-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={() => setShowChargeModal(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors"
        >
          <X className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(249,115,22,0.15)' }}>
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
              {credits === 0 ? '크레딧이 없습니다' : '크레딧이 부족합니다'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-sub)' }}>
              현재 <span className="font-semibold text-orange-500">{credits ?? 0} CR</span> 보유
              {requiredCredits > 0 && (
                <> · <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{requiredCredits} CR</span> 필요</>
              )}
            </p>
          </div>
        </div>

        {/* Test mode notice */}
        {isTestMode && (
          <div className="mb-4 px-3 py-2 rounded-lg text-xs" style={{ background: '#FEF3C7', color: '#92400E' }}>
            테스트 모드 — .env.local에 <strong>NEXT_PUBLIC_TOSS_CLIENT_KEY</strong>를 설정하면 실결제가 가능합니다.
          </div>
        )}

        {/* Packages */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {PACKAGES.map(pkg => {
            const isLoading = loadingPkgId === pkg.id
            return (
              <button
                key={pkg.id}
                onClick={() => handleCharge(pkg)}
                disabled={loadingPkgId !== null}
                className="relative flex flex-col items-center justify-center gap-1 p-4 rounded-xl border transition-all hover:border-purple-500 hover:bg-purple-500/5 text-center disabled:opacity-60"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}
              >
                {pkg.badge && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {pkg.badge}
                  </span>
                )}
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-sub)' }}>{pkg.label}</span>
                <div className="flex items-center gap-1">
                  {isLoading
                    ? <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                    : <Zap className="w-3.5 h-3.5 text-yellow-500" />
                  }
                  <span className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                    {pkg.credits.toLocaleString()}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-sub)' }}>CR</span>
                </div>
                <span className="text-sm font-semibold text-purple-400">
                  ₩{pkg.amount.toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>

        <p className="text-center text-xs" style={{ color: 'var(--color-text-sub)' }}>
          TossPayments 안전 결제 · 카드/계좌이체 지원
        </p>
      </div>
    </div>
  )
}
