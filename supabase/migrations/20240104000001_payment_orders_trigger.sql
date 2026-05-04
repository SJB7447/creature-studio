-- updated_at 트리거 함수 (없을 경우 생성)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- payment_orders 테이블이 없으면 생성
create table if not exists public.payment_orders (
  id           text        primary key,
  user_id      text        not null references public.users(id) on delete cascade,
  package_id   integer     not null,
  credits      integer     not null,
  amount       integer     not null,
  status       text        not null default 'pending',
  payment_key  text,
  error_code   text,
  error_msg    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.payment_orders enable row level security;

-- RLS policy (중복 방지)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'payment_orders' and policyname = 'users can read own orders'
  ) then
    create policy "users can read own orders"
      on public.payment_orders for select using (true);
  end if;
end $$;

-- 트리거 (없으면 생성)
drop trigger if exists set_payment_orders_updated_at on public.payment_orders;
create trigger set_payment_orders_updated_at
  before update on public.payment_orders
  for each row execute function public.set_updated_at();

-- 인덱스
create index if not exists payment_orders_user_id_idx on public.payment_orders(user_id);
create index if not exists payment_orders_status_idx  on public.payment_orders(status);
