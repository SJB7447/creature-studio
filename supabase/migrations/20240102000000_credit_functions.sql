-- ============================================================
-- 원자적 크레딧 차감 함수 (race condition 방지)
-- FOR UPDATE 락으로 동시 차감 문제 해결
-- ============================================================

create or replace function public.deduct_credits(
  p_user_id   uuid,
  p_amount    integer,
  p_feature   text default null,
  p_model     text default null,
  p_cost_krw  integer default null
)
returns integer   -- 차감 후 잔여 크레딧 반환
language plpgsql
security definer  -- service role 권한으로 실행 (RLS 우회)
as $$
declare
  v_credits integer;
begin
  -- 행 락 획득 후 현재 크레딧 조회
  select credits into v_credits
  from public.users
  where id = p_user_id
  for update;

  if v_credits is null then
    raise exception 'User not found: %', p_user_id;
  end if;

  if v_credits < p_amount then
    raise exception 'Insufficient credits: have %, need %', v_credits, p_amount;
  end if;

  -- 크레딧 차감
  update public.users
  set credits    = credits - p_amount,
      updated_at = now()
  where id = p_user_id;

  -- 트랜잭션 기록
  insert into public.credit_transactions
    (user_id, amount, type, feature, model_used, cost_krw)
  values
    (p_user_id, -p_amount, 'use', p_feature, p_model, p_cost_krw);

  return v_credits - p_amount;
end;
$$;

-- ============================================================
-- 크레딧 충전 함수 (결제 완료 후 서버에서 호출)
-- ============================================================

create or replace function public.add_credits(
  p_user_id  uuid,
  p_amount   integer,
  p_type     text default 'charge',  -- charge | bonus | refund
  p_feature  text default null
)
returns integer
language plpgsql
security definer
as $$
declare
  v_credits integer;
begin
  update public.users
  set credits    = credits + p_amount,
      updated_at = now()
  where id = p_user_id
  returning credits into v_credits;

  if v_credits is null then
    raise exception 'User not found: %', p_user_id;
  end if;

  insert into public.credit_transactions
    (user_id, amount, type, feature)
  values
    (p_user_id, p_amount, p_type, p_feature);

  return v_credits;
end;
$$;
