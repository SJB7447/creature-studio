import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * POST /api/payments/confirm
 * TossPayments 결제 최종 승인 (success 페이지에서 호출)
 * body: { paymentKey, orderId, amount }
 */
export async function POST(req: NextRequest) {
  let body: { paymentKey: string; orderId: string; amount: number }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }

  const { paymentKey, orderId, amount } = body
  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json({ error: 'paymentKey, orderId, amount 필요' }, { status: 400 })
  }

  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey || secretKey === 'test_sk_placeholder') {
    return NextResponse.json({ error: 'TossPayments 시크릿 키가 설정되지 않았습니다.' }, { status: 500 })
  }

  const db = createServerSupabase()

  // 1. 주문 조회 및 금액 검증
  const { data: order, error: orderErr } = await db
    .from('payment_orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (orderErr || !order) {
    return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
  }
  if (order.status === 'completed') {
    return NextResponse.json({ ok: true, alreadyCompleted: true, credits: order.credits })
  }
  if (order.amount !== amount) {
    return NextResponse.json({ error: '결제 금액 불일치' }, { status: 400 })
  }

  // 2. TossPayments 결제 승인 API 호출
  const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`
  const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  })

  const tossData = await tossRes.json()

  if (!tossRes.ok) {
    // 결제 실패 → 주문 상태 업데이트
    await db.from('payment_orders').update({
      status:    'failed',
      error_code: tossData.code,
      error_msg:  tossData.message,
    }).eq('id', orderId)

    return NextResponse.json(
      { error: tossData.message || '결제 승인 실패', code: tossData.code },
      { status: 400 }
    )
  }

  // 3. 크레딧 충전 + 주문 완료 처리
  const { error: creditErr } = await db.rpc('add_credits', {
    p_user_id: order.user_id,
    p_amount:  order.credits,
    p_type:    'charge',
    p_feature: `package_${order.package_id}`,
  })

  if (creditErr) {
    console.error('[/api/payments/confirm] add_credits 실패:', creditErr.message)
    return NextResponse.json({ error: '크레딧 충전 실패' }, { status: 500 })
  }

  await db.from('payment_orders').update({
    status:      'completed',
    payment_key: paymentKey,
  }).eq('id', orderId)

  // 최신 잔액 조회
  const { data: user } = await db
    .from('users')
    .select('credits')
    .eq('id', order.user_id)
    .single()

  return NextResponse.json({
    ok:               true,
    creditsAdded:     order.credits,
    remainingCredits: user?.credits ?? null,
  })
}
