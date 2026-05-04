import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

const PACKAGES: Record<number, { credits: number; amount: number; name: string }> = {
  1: { credits: 100,  amount: 1_500,  name: '스타터 100 CR' },
  2: { credits: 500,  amount: 6_900,  name: '베이직 500 CR' },
  3: { credits: 1_000, amount: 12_900, name: '스탠다드 1,000 CR' },
  4: { credits: 3_000, amount: 35_900, name: '프로 3,000 CR' },
}

/**
 * POST /api/payments/prepare
 * TossPayments 결제 전 주문 생성
 * body: { uid, packageId }
 * returns: { orderId, orderName, amount, credits }
 */
export async function POST(req: NextRequest) {
  let body: { uid: string; packageId: number }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }

  const { uid, packageId } = body
  if (!uid || !packageId) {
    return NextResponse.json({ error: 'uid, packageId 필요' }, { status: 400 })
  }

  const pkg = PACKAGES[packageId]
  if (!pkg) {
    return NextResponse.json({ error: '유효하지 않은 패키지' }, { status: 400 })
  }

  const orderId = `cs_${uid.slice(0, 8)}_${Date.now()}`

  const db = createServerSupabase()
  const { error } = await db.from('payment_orders').insert({
    id:         orderId,
    user_id:    uid,
    package_id: packageId,
    credits:    pkg.credits,
    amount:     pkg.amount,
    status:     'pending',
  })

  if (error) {
    console.error('[/api/payments/prepare]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    orderId,
    orderName: pkg.name,
    amount:    pkg.amount,
    credits:   pkg.credits,
  })
}
