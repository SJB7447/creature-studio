import { createClient } from '@supabase/supabase-js'
import type { Database } from './generated-types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!

/**
 * 서버 전용 Supabase 클라이언트 (service role key — RLS 우회)
 * API Route / Server Action 전용. 브라우저에서 절대 사용 금지.
 */
export function createServerSupabase() {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// ─── User CRUD ────────────────────────────────────────────

export async function upsertSupabaseUser(user: {
  id: string
  email: string
  displayName?: string | null
}) {
  const db = createServerSupabase()
  const { error } = await db.from('users').upsert(
    {
      id: user.id,
      email: user.email,
      display_name: user.displayName ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id', ignoreDuplicates: false }
  )
  if (error) throw error
}

export async function getSupabaseUser(userId: string) {
  const db = createServerSupabase()
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateUserCredits(userId: string, delta: number) {
  const db = createServerSupabase()
  // 현재 크레딧 조회 후 원자적 업데이트
  const { data: user, error: readError } = await db
    .from('users')
    .select('credits')
    .eq('id', userId)
    .single()
  if (readError) throw readError

  const newCredits = (user.credits ?? 0) + delta
  if (newCredits < 0) throw new Error('크레딧이 부족합니다.')

  const { error: updateError } = await db
    .from('users')
    .update({ credits: newCredits, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (updateError) throw updateError
  return newCredits
}

export async function recordCreditTransaction(tx: {
  userId: string
  amount: number
  type: 'charge' | 'use' | 'bonus' | 'refund'
  feature?: string
  modelUsed?: string
  costKrw?: number
}) {
  const db = createServerSupabase()
  const { error } = await db.from('credit_transactions').insert({
    user_id: tx.userId,
    amount: tx.amount,
    type: tx.type,
    feature: tx.feature ?? null,
    model_used: tx.modelUsed ?? null,
    cost_krw: tx.costKrw ?? null,
  })
  if (error) throw error
}

export async function getCreditPackages() {
  const db = createServerSupabase()
  const { data, error } = await db
    .from('credit_packages')
    .select('*')
    .eq('is_active', true)
    .order('price_krw', { ascending: true })
  if (error) throw error
  return data
}
