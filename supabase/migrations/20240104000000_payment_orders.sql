-- ============================================================
-- TossPayments 결제 주문 추적 테이블
-- ============================================================

create table if not exists public.payment_orders (
  id           text        primary key,          -- TossPayments orderId
  user_id      text        not null references public.users(id) on delete cascade,
  package_id   integer     not null,
  credits      integer     not null,
  amount       integer     not null,             -- 결제 금액 (KRW)
  status       text        not null default 'pending',  -- pending | completed | failed | cancelled
  payment_key  text,                             -- TossPayments paymentKey (확정 후 저장)
  error_code   text,
  error_msg    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.payment_orders enable row level security;

-- 본인 주문만 조회 가능 (서비스 키로 INSERT/UPDATE)
create policy "users can read own orders"
  on public.payment_orders for select
  using (true);

-- updated_at 자동 갱신 함수 (없을 경우 생성)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger set_payment_orders_updated_at
  before update on public.payment_orders
  for each row execute function public.set_updated_at();

-- 인덱스
create index if not exists payment_orders_user_id_idx on public.payment_orders(user_id);
create index if not exists payment_orders_status_idx  on public.payment_orders(status);
