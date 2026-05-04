'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Zap, CheckCircle, Clock, BarChart2, Calculator,
  ArrowLeft, TrendingUp, DollarSign, RefreshCw,
  Activity, Image, AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import type { UsageStats, ModelStat } from '@/app/api/admin/usage-stats/route'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''
const CREDIT_PRICE_KRW = 13.8   // ₩13.8/CR (500CR 패키지 기준)
const USD_TO_KRW      = 1_380   // 환율

// ─── 정적 모델 메타데이터 ─────────────────────────────────────

type ModelStatus = 'active' | 'planned'

interface AiModelMeta {
  id: string
  name: string
  provider: string
  providerColor: string
  credits: number           // CR per generation (4장)
  status: ModelStatus
  useCase: string
  actualCostUsdPer4: number // 예상 API 원가 (USD, 4장)
  features: string[]
  modelId?: string
}

const AI_MODELS: AiModelMeta[] = [
  {
    id: 'gemini-flash',
    name: 'Gemini Flash',
    provider: 'Google',
    providerColor: '#4285F4',
    credits: 8,
    status: 'active',
    useCase: '캐릭터 레퍼런스 지원 · 컷별 빠른 생성',
    actualCostUsdPer4: 0.04,
    features: ['레퍼런스 이미지 지원', '빠른 생성 (~10s)', '2K 해상도'],
    modelId: 'gemini-3.1-flash-image-preview',
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    providerColor: '#4285F4',
    credits: 18,
    status: 'active',
    useCase: '대표 이미지 · 최고 품질 납품용',
    actualCostUsdPer4: 0.12,
    features: ['레퍼런스 이미지 지원', '최고 품질', '2K 해상도'],
    modelId: 'gemini-3-pro-image-preview',
  },
  {
    id: 'imagen3',
    name: 'Imagen 3',
    provider: 'Google',
    providerColor: '#4285F4',
    credits: 18,
    status: 'active',
    useCase: '배경 · 독립 오브젝트 · 레퍼런스 없는 씬',
    actualCostUsdPer4: 0.08,
    features: ['네이티브 배치 생성', '최고 사진화질', 'PNG lossless'],
    modelId: 'imagen-4.0-generate-001',
  },
  {
    id: 'flux-dev',
    name: 'Flux Dev',
    provider: 'fal.ai',
    providerColor: '#FF6B6B',
    credits: 8,
    status: 'planned',
    useCase: '고품질 스타일 일관성 · 세밀한 디테일',
    actualCostUsdPer4: 0.10,
    features: ['LoRA 스타일 적용', '높은 사실성'],
  },
  {
    id: 'gpt-image-1',
    name: 'GPT-Image-1',
    provider: 'OpenAI',
    providerColor: '#10A37F',
    credits: 12,
    status: 'planned',
    useCase: '텍스트 포함 씬 · 다양한 스타일',
    actualCostUsdPer4: 0.20,
    features: ['텍스트 렌더링 강점', 'GPT-4 Vision 연계'],
  },
  {
    id: 'seedream',
    name: 'Seedream 3.5',
    provider: 'Zhipu AI / fal.ai',
    providerColor: '#9333EA',
    credits: 6,
    status: 'planned',
    useCase: '아시아풍 캐릭터 · 만화/애니 스타일',
    actualCostUsdPer4: 0.04,
    features: ['한국/일본 스타일 특화', '저비용'],
  },
  {
    id: 'grok-aurora',
    name: 'Grok Aurora',
    provider: 'xAI',
    providerColor: '#1DA1F2',
    credits: 15,
    status: 'planned',
    useCase: '사실적 인물 렌더링 · 영화 스틸',
    actualCostUsdPer4: 0.12,
    features: ['고품질 인물 생성', 'xAI Grok 연계'],
  },
]

const MODEL_META: Record<string, AiModelMeta> = Object.fromEntries(AI_MODELS.map(m => [m.id, m]))

// ─── 유틸 ─────────────────────────────────────────────────────

function crToKrw(cr: number) { return Math.round(cr * CREDIT_PRICE_KRW) }
function usdToKrw(usd: number) { return Math.round(usd * USD_TO_KRW) }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko', { month: 'short', day: 'numeric' })
}

function fmtDateShort(yyyymmdd: string) {
  const d = new Date(yyyymmdd)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ─── 일별 미니 바 차트 ────────────────────────────────────────

function MiniBarChart({ daily }: { daily: UsageStats['daily'] }) {
  const max = Math.max(...daily.map(d => d.cr), 1)
  const recent = daily.slice(-14)

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-20">
        {recent.map(d => {
          const pct = (d.cr / max) * 100
          const isToday = d.date === new Date().toISOString().slice(0, 10)
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div
                className="w-full rounded-sm transition-all"
                style={{
                  height: `${Math.max(pct, 2)}%`,
                  background: d.cr > 0
                    ? (isToday ? '#7C3AED' : 'rgba(124,58,237,0.45)')
                    : 'var(--color-border)',
                  minHeight: 2,
                }}
              />
              {/* tooltip */}
              {d.cr > 0 && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold text-white pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10"
                  style={{ background: '#1F2937' }}>
                  {d.cr}CR · {d.generations}회
                </div>
              )}
            </div>
          )
        })}
      </div>
      {/* x-axis labels: first / mid / last */}
      <div className="flex justify-between">
        {[0, 6, 13].map(i => (
          <span key={i} className="text-[9px]" style={{ color: 'var(--color-text-sub)' }}>
            {fmtDateShort(recent[i]?.date ?? '')}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── 모델별 실사용 카드 ───────────────────────────────────────

function ModelUsageCard({
  meta, stat,
}: {
  meta: AiModelMeta
  stat: ModelStat | null
}) {
  const isActive = meta.status === 'active'
  const usedCr   = stat?.totalCr ?? 0
  const gens     = stat?.generations ?? 0
  const userKrw  = crToKrw(usedCr)
  const apiKrwEstimate = usdToKrw(meta.actualCostUsdPer4 / 4 * gens * 4)
  const margin   = userKrw - apiKrwEstimate

  return (
    <div className="p-5 rounded-2xl border relative"
      style={{
        background: 'var(--color-surface)',
        borderColor: isActive
          ? (gens > 0 ? '#7C3AED' : 'rgba(124,58,237,0.2)')
          : 'var(--color-border)',
        opacity: isActive ? 1 : 0.6,
      }}>

      {/* 상단 뱃지 */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
        {isActive ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: '#D1FAE5', color: '#065F46' }}>
            <CheckCircle className="w-3 h-3" /> 활성
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: '#F3F4F6', color: '#6B7280' }}>
            <Clock className="w-3 h-3" /> 준비 중
          </span>
        )}
        {gens > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: '#EDE9FE', color: '#7C3AED' }}>
            <Activity className="w-3 h-3" /> 사용됨
          </span>
        )}
      </div>

      {/* 제공자 + 이름 */}
      <div className="flex items-center gap-2 mb-2 pr-20">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.providerColor }} />
        <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-sub)' }}>{meta.provider}</span>
      </div>
      <h3 className="text-base font-extrabold mb-0.5" style={{ color: 'var(--color-text)' }}>{meta.name}</h3>
      <p className="text-[11px] mb-4" style={{ color: 'var(--color-text-sub)' }}>{meta.useCase}</p>

      {/* 요금 기준 */}
      <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl"
        style={{ background: 'var(--color-surface-2)' }}>
        <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: '#F59E0B' }} />
        <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
          {meta.credits} CR / 생성 (4장)
        </span>
        <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-sub)' }}>
          ≈ ₩{crToKrw(meta.credits).toLocaleString()} 과금
        </span>
      </div>

      {/* 실사용 통계 */}
      {gens > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '총 생성', value: `${gens}회`, sub: `이미지 ${(gens * 4).toLocaleString()}장`, color: '#7C3AED' },
            { label: '소비 크레딧', value: `${usedCr.toLocaleString()} CR`, sub: `₩${userKrw.toLocaleString()} 과금`, color: '#7C3AED' },
            { label: '예상 API 원가', value: `₩${apiKrwEstimate.toLocaleString()}`, sub: `$${(meta.actualCostUsdPer4 / 4 * gens * 4).toFixed(2)}`, color: '#EF4444' },
            { label: '예상 마진', value: `₩${margin.toLocaleString()}`, sub: margin > 0 ? '흑자' : '적자', color: margin >= 0 ? '#10B981' : '#EF4444' },
          ].map(s => (
            <div key={s.label} className="p-2.5 rounded-xl"
              style={{ background: s.color + '0D', border: `1px solid ${s.color}20` }}>
              <p className="text-[9px] font-semibold" style={{ color: s.color }}>{s.label}</p>
              <p className="text-sm font-extrabold" style={{ color: 'var(--color-text)' }}>{s.value}</p>
              <p className="text-[9px]" style={{ color: 'var(--color-text-sub)' }}>{s.sub}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 py-3 rounded-xl text-center justify-center"
          style={{ background: 'var(--color-surface-2)' }}>
          <Image className="w-4 h-4 opacity-30" style={{ color: 'var(--color-text-sub)' }} />
          <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>
            {isActive ? '아직 사용 기록 없음' : '미출시 — 데이터 없음'}
          </p>
        </div>
      )}

      {stat?.latestAt && (
        <p className="mt-2 text-[9px]" style={{ color: 'var(--color-text-sub)' }}>
          마지막 사용: {fmtDate(stat.latestAt)}
        </p>
      )}
    </div>
  )
}

// ─── 작품 비용 계산기 ─────────────────────────────────────────

const PRESETS = [
  { label: '단편 (5씬)', scenes: 5,  cuts: 3, repeats: 2 },
  { label: '에피소드 (15씬)', scenes: 15, cuts: 4, repeats: 3 },
  { label: '시리즈 (30씬)', scenes: 30, cuts: 5, repeats: 4 },
]

function CostCalculator({ avgCrPerGen }: { avgCrPerGen: number }) {
  const [scenes,  setScenes]  = useState(10)
  const [cuts,    setCuts]    = useState(4)
  const [repeats, setRepeats] = useState(2)
  const [flashPct, setFlashPct] = useState(70)

  const total   = scenes * cuts * repeats
  const flash   = Math.round(total * flashPct / 100)
  const pro     = total - flash
  const totalCr = flash * 8 + pro * 18
  const totalKrw = crToKrw(totalCr)

  // 실사용 평균 CR 기반 추정도 표시
  const realEstCr  = avgCrPerGen > 0 ? Math.round(total * avgCrPerGen) : null
  const realEstKrw = realEstCr ? crToKrw(realEstCr) : null

  return (
    <div className="p-5 rounded-2xl border space-y-4"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4" style={{ color: '#7C3AED' }} />
        <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>작품 비용 계산기</h2>
        {avgCrPerGen > 0 && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: '#EDE9FE', color: '#7C3AED' }}>
            실사용 평균 {avgCrPerGen.toFixed(1)} CR/생성 반영
          </span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {PRESETS.map(p => (
          <button key={p.label}
            onClick={() => { setScenes(p.scenes); setCuts(p.cuts); setRepeats(p.repeats) }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:opacity-80"
            style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: '씬 수',          value: scenes,  set: setScenes,  min: 1, max: 200 },
          { label: '씬당 컷 수',      value: cuts,    set: setCuts,    min: 1, max: 10 },
          { label: '컷당 재생성 횟수', value: repeats, set: setRepeats, min: 1, max: 10 },
        ].map(({ label, value, set, min, max }) => (
          <div key={label}>
            <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--color-text-sub)' }}>{label}</p>
            <input type="number" value={value} min={min} max={max}
              onChange={e => set(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
              className="w-full px-3 py-2 rounded-xl border text-sm font-bold"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>
        ))}
        <div>
          <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--color-text-sub)' }}>
            Flash {flashPct}% / Pro {100 - flashPct}%
          </p>
          <input type="range" value={flashPct} min={0} max={100} step={10}
            onChange={e => setFlashPct(parseInt(e.target.value))}
            className="w-full mt-2" />
        </div>
      </div>

      {/* 결과 */}
      <div className="space-y-2">
        {/* 이론 계산 */}
        <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--color-text-sub)' }}>
            이론값 (Flash {flashPct}% · Pro {100 - flashPct}%)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '생성 횟수', value: `${total}회`,               color: '#6B7280' },
              { label: '필요 크레딧', value: `${totalCr.toLocaleString()} CR`, color: '#7C3AED' },
              { label: '예상 비용',   value: `₩${totalKrw.toLocaleString()}`,  color: '#EF4444' },
            ].map(r => (
              <div key={r.label} className="text-center p-2 rounded-lg"
                style={{ background: r.color + '0D' }}>
                <p className="text-[9px] font-semibold mb-0.5" style={{ color: r.color }}>{r.label}</p>
                <p className="text-sm font-extrabold" style={{ color: 'var(--color-text)' }}>{r.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 실사용 기반 추정 */}
        {realEstCr !== null && (
          <div className="p-3 rounded-xl border" style={{ background: '#EDE9FE', borderColor: 'rgba(124,58,237,0.3)' }}>
            <p className="text-[10px] font-semibold mb-2" style={{ color: '#7C3AED' }}>
              실사용 패턴 기반 추정 (평균 {avgCrPerGen.toFixed(1)} CR/생성)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '생성 횟수',  value: `${total}회`,                    color: '#6B7280' },
                { label: '예상 크레딧', value: `${realEstCr.toLocaleString()} CR`, color: '#7C3AED' },
                { label: '예상 비용',   value: `₩${realEstKrw!.toLocaleString()}`, color: '#EF4444' },
              ].map(r => (
                <div key={r.label} className="text-center p-2 rounded-lg bg-white/60">
                  <p className="text-[9px] font-semibold mb-0.5" style={{ color: r.color }}>{r.label}</p>
                  <p className="text-sm font-extrabold" style={{ color: 'var(--color-text)' }}>{r.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px]" style={{ color: 'var(--color-text-sub)' }}>
        * 크레딧 단가 ₩{CREDIT_PRICE_KRW}/CR (500CR 패키지 기준)
      </p>
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────────

export default function ApiCostsPage() {
  const { user } = useAuthStore()
  const router   = useRouter()
  const isAdmin  = !!user && user.email === ADMIN_EMAIL

  useEffect(() => {
    if (user && !isAdmin) router.replace('/dashboard')
  }, [user, isAdmin, router])

  const { data: stats, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin-usage-stats', user?.uid],
    queryFn: async (): Promise<UsageStats> => {
      const res = await fetch(`/api/admin/usage-stats?uid=${user!.uid}`)
      if (!res.ok) throw new Error('통계 조회 실패')
      return res.json()
    },
    enabled: isAdmin && !!user?.uid,
    staleTime: 30_000,
  })

  if (!isAdmin) return null

  const activeModels  = AI_MODELS.filter(m => m.status === 'active')
  const plannedModels = AI_MODELS.filter(m => m.status === 'planned')

  // 실사용 map: model id → ModelStat
  const statMap: Record<string, ModelStat> = {}
  stats?.byModel.forEach(s => { statMap[s.model] = s })

  // 전체 요약
  const totalCr        = stats?.totalCr ?? 0
  const totalGens      = stats?.totalGenerations ?? 0
  const totalUserKrw   = crToKrw(totalCr)
  const avgCrPerGen    = totalGens > 0 ? totalCr / totalGens : 0

  // 예상 전체 API 원가 (모델별 단가 × 생성 수)
  let totalApiKrw = 0
  stats?.byModel.forEach(s => {
    const meta = MODEL_META[s.model]
    if (meta) totalApiKrw += usdToKrw(meta.actualCostUsdPer4 / 4 * s.generations * 4)
  })
  const totalMargin = totalUserKrw - totalApiKrw

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link href="/admin"
          className="w-8 h-8 rounded-lg flex items-center justify-center border hover:opacity-70"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <ArrowLeft className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
        </Link>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}>
          <BarChart2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>API 비용 분석</h1>
          <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>
            실사용 데이터 기반 · 모델별 크레딧 원가
          </p>
        </div>
        <button onClick={() => refetch()}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs hover:opacity-70"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* 오류 처리 */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl border"
          style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
          <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#EF4444' }} />
          <p className="text-sm" style={{ color: '#EF4444' }}>통계를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
        </div>
      )}

      {/* 전체 요약 카드 */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--color-text-sub)' }} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: '총 생성 횟수', value: `${totalGens}회`, sub: `이미지 ${(totalGens * 4).toLocaleString()}장`, color: '#7C3AED', icon: Image },
              { label: '소비 크레딧', value: `${totalCr.toLocaleString()} CR`, sub: `평균 ${avgCrPerGen.toFixed(1)} CR/생성`, color: '#F59E0B', icon: Zap },
              { label: '유저 과금액 추정', value: `₩${totalUserKrw.toLocaleString()}`, sub: `₩${CREDIT_PRICE_KRW}/CR 기준`, color: '#10B981', icon: DollarSign },
              { label: '예상 마진', value: `₩${totalMargin.toLocaleString()}`, sub: totalGens > 0 ? `원가 ₩${totalApiKrw.toLocaleString()}` : '데이터 없음', color: totalMargin >= 0 ? '#10B981' : '#EF4444', icon: TrendingUp },
            ].map(s => {
              const Icon = s.icon
              return (
                <div key={s.label} className="p-4 rounded-2xl border flex items-start gap-3"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: s.color + '15' }}>
                    <Icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px]" style={{ color: 'var(--color-text-sub)' }}>{s.label}</p>
                    <p className="text-base font-extrabold truncate" style={{ color: 'var(--color-text)' }}>{s.value}</p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-sub)' }}>{s.sub}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 일별 사용량 차트 */}
          {stats && stats.daily.some(d => d.cr > 0) && (
            <div className="p-5 rounded-2xl border"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" style={{ color: '#7C3AED' }} />
                  <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>일별 크레딧 사용량 (최근 14일)</h2>
                </div>
                {dataUpdatedAt > 0 && (
                  <p className="text-[10px]" style={{ color: 'var(--color-text-sub)' }}>
                    업데이트: {new Date(dataUpdatedAt).toLocaleTimeString('ko', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <MiniBarChart daily={stats.daily} />
              <div className="mt-3 flex gap-4 text-[10px]" style={{ color: 'var(--color-text-sub)' }}>
                <span>합계 <strong style={{ color: 'var(--color-text)' }}>{totalCr} CR</strong></span>
                <span>최초: {stats.firstUsedAt ? fmtDate(stats.firstUsedAt) : '—'}</span>
                <span>최근: {stats.lastUsedAt ? fmtDate(stats.lastUsedAt) : '—'}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* 활성 모델별 상세 */}
      <div>
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
          활성 모델 — 실사용 현황
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {activeModels.map(m => (
            <ModelUsageCard key={m.id} meta={m} stat={statMap[m.id] ?? null} />
          ))}
        </div>
      </div>

      {/* 준비 중 모델 */}
      <div>
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Clock className="w-4 h-4" style={{ color: '#6B7280' }} />
          준비 중 모델 — 예정 단가
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plannedModels.map(m => (
            <ModelUsageCard key={m.id} meta={m} stat={null} />
          ))}
        </div>
      </div>

      {/* 작품 비용 계산기 */}
      <CostCalculator avgCrPerGen={avgCrPerGen} />

      {/* 주의사항 */}
      <div className="p-4 rounded-2xl border" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: '#92400E' }}>비용 산정 기준</p>
        <ul className="space-y-1 text-[11px]" style={{ color: '#78350F' }}>
          <li>• 유저 과금: 500CR 패키지 기준 ₩13.8/CR — 실제 구매 패키지에 따라 ₩12.9~₩15.0/CR 범위</li>
          <li>• API 원가: USD/KRW = 1,380 적용 (변동 환율 반영 필요)</li>
          <li>• Gemini Flash 원가 ≈ $0.01/이미지 · Gemini Pro ≈ $0.03 · Imagen 3 ≈ $0.02 (추정치)</li>
          <li>• 마진은 API 원가만 고려한 수치 — 서버·스토리지·인건비 등 미포함</li>
        </ul>
      </div>
    </div>
  )
}
