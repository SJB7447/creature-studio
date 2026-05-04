import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, getSupabaseUser } from '@/lib/supabase/server'

export interface ModelStat {
  model: string
  generations: number   // 생성 횟수 (4장 단위)
  totalCr: number       // 소비 크레딧 합계
  latestAt: string | null
}

export interface DailyUsage {
  date: string          // YYYY-MM-DD
  cr: number
  generations: number
}

export interface UsageStats {
  byModel: ModelStat[]
  daily: DailyUsage[]   // 최근 14일
  totalCr: number
  totalGenerations: number
  firstUsedAt: string | null
  lastUsedAt: string | null
}

export async function GET(req: NextRequest) {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  const uid = req.nextUrl.searchParams.get('uid')

  if (!uid) return NextResponse.json({ error: 'uid 필요' }, { status: 400 })

  // 관리자 검증
  try {
    const user = await getSupabaseUser(uid)
    if ((user as any).email !== adminEmail) {
      return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
  }

  const db = createServerSupabase()

  // 전체 사용 트랜잭션 가져오기 (type='use')
  const { data: rows, error } = await db
    .from('credit_transactions')
    .select('amount, model_used, feature, created_at')
    .eq('user_id', uid)
    .eq('type', 'use')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows || rows.length === 0) {
    return NextResponse.json<UsageStats>({
      byModel: [], daily: [],
      totalCr: 0, totalGenerations: 0,
      firstUsedAt: null, lastUsedAt: null,
    })
  }

  // ── 모델별 집계 ──────────────────────────────────
  const modelMap: Record<string, { cr: number; count: number; latest: string }> = {}
  for (const row of rows) {
    const model = row.model_used ?? 'unknown'
    const cr = Math.abs(row.amount)
    if (!modelMap[model]) modelMap[model] = { cr: 0, count: 0, latest: row.created_at }
    modelMap[model].cr += cr
    modelMap[model].count += 1
    modelMap[model].latest = row.created_at
  }

  const byModel: ModelStat[] = Object.entries(modelMap).map(([model, v]) => ({
    model,
    generations: v.count,
    totalCr: v.cr,
    latestAt: v.latest,
  })).sort((a, b) => b.totalCr - a.totalCr)

  // ── 최근 14일 일별 집계 ──────────────────────────
  const today = new Date()
  const dailyMap: Record<string, { cr: number; count: number }> = {}

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dailyMap[key] = { cr: 0, count: 0 }
  }

  for (const row of rows) {
    const key = row.created_at.slice(0, 10)
    if (dailyMap[key]) {
      dailyMap[key].cr += Math.abs(row.amount)
      dailyMap[key].count += 1
    }
  }

  const daily: DailyUsage[] = Object.entries(dailyMap).map(([date, v]) => ({
    date,
    cr: v.cr,
    generations: v.count,
  }))

  const totalCr = rows.reduce((s, r) => s + Math.abs(r.amount), 0)

  return NextResponse.json<UsageStats>({
    byModel,
    daily,
    totalCr,
    totalGenerations: rows.length,
    firstUsedAt: rows[0].created_at,
    lastUsedAt: rows[rows.length - 1].created_at,
  })
}
