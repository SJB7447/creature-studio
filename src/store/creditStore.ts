import { create } from 'zustand'

interface CreditState {
  credits: number | null
  plan: string
  onboardingCompleted: boolean | null   // null = 아직 로딩 안됨
  showChargeModal: boolean
  requiredCredits: number
  setCredits: (credits: number, plan?: string) => void
  setOnboardingCompleted: (v: boolean) => void
  setShowChargeModal: (show: boolean, required?: number) => void
}

export const useCreditStore = create<CreditState>((set) => ({
  credits: null,
  plan: 'free',
  onboardingCompleted: null,
  showChargeModal: false,
  requiredCredits: 0,
  setCredits: (credits, plan) =>
    set(s => ({ credits, plan: plan ?? s.plan })),
  setOnboardingCompleted: (v) =>
    set({ onboardingCompleted: v }),
  setShowChargeModal: (show, required = 0) =>
    set({ showChargeModal: show, requiredCredits: required }),
}))
