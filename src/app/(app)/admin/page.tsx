'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Shield, Zap, RefreshCw, History, ArrowRight, TrendingUp,
  CheckCircle, XCircle, AlertCircle, DollarSign, BarChart2,
} from 'lucide-react'
import Link from 'next/link'
import { useCreditStore } from '@/store/creditStore'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''

const QUICK_AMOUNTS = [1000, 3000, 5000, 10000]

type Tx = {
  id: string
  amount: number
  type: string
  feature: string | null
  model_used: string | null
  cost_krw: number | null
  created_at: string
}

function typeLabel(type: string) {
  return { charge: '충전', use: '사용', bonus: '보너스', refund: '환불', admin_set: '관리자 설정' }[type] ?? type
}

function typeColor(type: string) {
  if (type === 'use') return '#EF4444'
  if (type === 'charge' || type === 'bonus') return '#10B981'
  return '#6B7280'
}

export default function AdminPage() {
  const { user } = useAuthStore()
  const { credits } = useCreditStore()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [customAmount, setCustomAmount] = useState('5000')
  const [setting, setSetting] = useState(false)

  const isAdmin = !!user && user.email === ADMIN_EMAIL

  useEffect(() => {
    if (user && !isAdmin) router.replace('/dashboard')
  }, [user, isAdmin, router])

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['admin-transactions', user?.uid],
    queryFn: async () => {
      const res = await fetch(`/api/admin/transactions?uid=${user!.uid}&limit=30`)
      if (!res.ok) throw new Error('내역 조회 실패')
      return res.json() as Promise<{ transactions: Tx[] }>
    },
    enabled: isAdmin && !!user?.uid,
    refetchInterval: 15_000,
  })

  const transactions = txData?.transactions ?? []

  const usedCredits = transactions
    .filter(t => t.type === 'use')
    .reduce((s, t) => s + Math.abs(t.amount), 0)

  const handleSetCredits = useCallback(async (amount: number) => {
    if (!user?.uid) return
    setSetting(true)
    try {
      const res = await fetch('/api/admin/set-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, amount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`크레딧을 ${amount.toLocaleString()} CR로 설정했습니다.`)
      queryClient.invalidateQueries({ queryKey: ['credits', user.uid] })
      queryClient.invalidateQueries({ queryKey: ['admin-transactions', user.uid] })
    } catch (e: any) {
      toast.error('설정 실패: ' + e.message)
    } finally {
      setSetting(false)
    }
  }, [user?.uid, queryClient])

  if (!isAdmin) return null

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}>
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>관리자 패널</h1>
          <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>{user?.email}</p>
        </div>
        <span className="ml-auto px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
          style={{ background: '#7C3AED' }}>ADMIN</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '현재 잔액', value: `${(credits ?? 0).toLocaleString()} CR`, icon: Zap, color: '#7C3AED' },
          { label: '총 사용량 (이 세션)', value: `${usedCredits.toLocaleString()} CR`, icon: TrendingUp, color: '#EF4444' },
          { label: '플랜', value: 'Admin', icon: Shield, color: '#10B981' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="p-4 rounded-2xl border flex items-center gap-3"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: s.color + '15' }}>
                <Icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-[10px]" style={{ color: 'var(--color-text-sub)' }}>{s.label}</p>
                <p className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{s.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Credit setter */}
      <div className="p-5 rounded-2xl border space-y-4"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: '#F59E0B' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>크레딧 직접 설정</h2>
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2 flex-wrap">
          {QUICK_AMOUNTS.map(n => (
            <button
              key={n}
              onClick={() => handleSetCredits(n)}
              disabled={setting}
              className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 disabled:opacity-50"
              style={{
                background: n === 5000 ? '#7C3AED' : 'var(--color-surface-2)',
                color: n === 5000 ? 'white' : 'var(--color-text)',
                borderColor: n === 5000 ? '#7C3AED' : 'var(--color-border)',
              }}
            >
              {n.toLocaleString()} CR
              {n === 5000 && <span className="ml-1.5 text-[10px] opacity-80">권장</span>}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#F59E0B' }} />
            <input
              type="number"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              min={0}
              step={100}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm"
              style={{
                background: 'var(--color-surface-2)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
              placeholder="직접 입력 (CR)"
            />
          </div>
          <button
            onClick={() => handleSetCredits(parseInt(customAmount, 10))}
            disabled={setting || !customAmount || parseInt(customAmount) < 0}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}
          >
            {setting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            설정
          </button>
        </div>

        <p className="text-[10px]" style={{ color: 'var(--color-text-sub)' }}>
          설정 즉시 Supabase에 반영됩니다. 트랜잭션 내역에도 기록됩니다.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/admin/api-costs"
          className="p-4 rounded-2xl border flex items-center justify-between group hover:border-purple-300 transition-colors"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: '#EDE9FE' }}>
              <BarChart2 className="w-4 h-4" style={{ color: '#7C3AED' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>API 비용 분석</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-sub)' }}>모델별 크레딧 & 원가 정리</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color: 'var(--color-text-sub)' }} />
        </Link>

        <div className="p-4 rounded-2xl border flex items-center justify-between opacity-50 cursor-not-allowed"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: '#F0FDF4' }}>
              <DollarSign className="w-4 h-4" style={{ color: '#10B981' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>결제 관리</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-sub)' }}>TossPayments 실결제 (준비 중)</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
        </div>
      </div>

      {/* Transaction history */}
      <div className="p-5 rounded-2xl border"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" style={{ color: '#7C3AED' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>크레딧 사용 내역</h2>
          </div>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-transactions', user?.uid] })}
            className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border hover:opacity-70 transition-opacity"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}
          >
            <RefreshCw className="w-3 h-3" /> 새로고침
          </button>
        </div>

        {txLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--color-text-sub)' }} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: 'var(--color-text-sub)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>내역이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {transactions.map(tx => (
              <div key={tx.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--color-surface-2)' }}>
                <div className="flex items-center gap-2.5">
                  {tx.type === 'use'
                    ? <XCircle className="w-4 h-4 shrink-0" style={{ color: '#EF4444' }} />
                    : <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#10B981' }} />
                  }
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                      {typeLabel(tx.type)}
                      {tx.feature && ` · ${tx.feature}`}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-sub)' }}>
                      {tx.model_used && `${tx.model_used} · `}
                      {new Date(tx.created_at).toLocaleString('ko')}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold shrink-0"
                  style={{ color: typeColor(tx.type) }}>
                  {tx.type === 'use' ? '−' : '+'}{Math.abs(tx.amount).toLocaleString()} CR
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
