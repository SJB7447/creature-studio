'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCreditStore } from '@/store/creditStore'
import { toast } from 'sonner'

export function useCredits() {
  const { user } = useAuthStore()
  const { setCredits, setShowChargeModal, setOnboardingCompleted } = useCreditStore()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['credits', user?.uid],
    queryFn: async () => {
      const res = await fetch(`/api/credits/balance?uid=${user!.uid}`)
      if (!res.ok) throw new Error('크레딧 조회 실패')
      return res.json() as Promise<{ credits: number; plan: string; onboardingCompleted: boolean }>
    },
    enabled: !!user?.uid,
    refetchInterval: 30_000,
    staleTime: 10_000,
  })

  useEffect(() => {
    if (data) {
      setCredits(data.credits, data.plan)
      setOnboardingCompleted(data.onboardingCompleted)
    }
  }, [data, setCredits, setOnboardingCompleted])

  const deduct = useCallback(async (
    amount: number,
    feature: string,
    model?: string,
    costKrw?: number,
  ): Promise<boolean> => {
    if (!user?.uid) return false

    try {
      const res = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, amount, feature, model, costKrw }),
      })

      if (res.status === 402) {
        setShowChargeModal(true, amount)
        return false
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || '크레딧 차감 실패')
        return false
      }

      const { remainingCredits } = await res.json()
      setCredits(remainingCredits)
      queryClient.invalidateQueries({ queryKey: ['credits', user.uid] })
      return true
    } catch {
      toast.error('크레딧 처리 중 오류가 발생했습니다.')
      return false
    }
  }, [user?.uid, setCredits, setShowChargeModal, queryClient])

  return {
    credits: data?.credits ?? null,
    plan: data?.plan ?? 'free',
    isLoading,
    deduct,
  }
}
