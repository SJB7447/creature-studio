'use client'

import { useCreditStore } from '@/store/creditStore'
import { Zap } from 'lucide-react'

interface CreditBadgeProps {
  onClick?: () => void
}

export function CreditBadge({ onClick }: CreditBadgeProps) {
  const { credits } = useCreditStore()
  if (credits === null) return null

  const isEmpty = credits === 0
  const isLow = credits > 0 && credits <= 40

  const color = isEmpty
    ? '#ef4444'
    : isLow
    ? '#f97316'
    : 'var(--color-text-sub)'

  const bg = isEmpty
    ? 'rgba(239,68,68,0.12)'
    : isLow
    ? 'rgba(249,115,22,0.12)'
    : 'var(--color-surface-2)'

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-80"
      style={{ background: bg, color }}
      title={isEmpty ? '크레딧이 없습니다. 충전하세요.' : isLow ? '크레딧이 부족합니다.' : '크레딧 충전하기'}
    >
      <Zap className="w-3.5 h-3.5" />
      <span>{credits.toLocaleString()} CR</span>
    </button>
  )
}
