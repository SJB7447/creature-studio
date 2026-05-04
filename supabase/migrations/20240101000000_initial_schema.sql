-- ============================================================
-- CreatureStudio — Supabase 초기 스키마
-- Supabase 대시보드 → SQL Editor에서 실행
-- ============================================================

-- 1. Users 테이블
create table if not exists public.users (
  id              uuid primary key,          -- Firebase Auth UID를 그대로 사용
  email           text not null,
  display_name    text,
  plan            text not null default 'free' check (plan in ('free', 'creator', 'studio')),
  credits         integer not null default 200,
  onboarding_completed boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 2. 크레딧 트랜잭션 테이블
create table if not exists public.credit_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  amount      integer not null,              -- 양수: 충전 / 음수: 사용
  type        text not null check (type in ('charge', 'use', 'bonus', 'refund')),
  feature     text,                          -- 'image_generate', 'story_generate' 등
  model_used  text,                          -- 'gemini-pro', 'gemini-flash' 등
  cost_krw    integer,                       -- 원화 환산 비용
  created_at  timestamptz not null default now()
);

-- 3. 구독 테이블
create table if not exists public.subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  plan              text not null check (plan in ('free', 'creator', 'studio')),
  status            text not null check (status in ('active', 'cancelled', 'expired')),
  started_at        timestamptz not null,
  expires_at        timestamptz,
  toss_payment_key  text,
  created_at        timestamptz not null default now()
);

-- 4. 크레딧 패키지 테이블
create table if not exists public.credit_packages (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  credits        integer not null,
  price_krw      integer not null,
  bonus_credits  integer not null default 0,
  is_active      boolean not null default true
);

-- 5. 기본 크레딧 패키지 데이터
insert into public.credit_packages (name, credits, price_krw) values
  ('100 크레딧',   100,   1500),
  ('500 크레딧',   500,   6900),
  ('1000 크레딧',  1000,  12900),
  ('3000 크레딧',  3000,  35900)
on conflict do nothing;

-- ============================================================
-- RLS (Row Level Security) 설정
-- ============================================================

alter table public.users enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_packages enable row level security;

-- users: anon key 읽기 차단 (서비스 롤만 접근)
-- 참고: Firebase Auth를 사용하므로 auth.uid() 기반 RLS 불가
-- 모든 클라이언트 작업은 Next.js API Route(service role)를 통해 처리

-- credit_packages: 전체 읽기 허용 (공개 가격 정보)
create policy "credit_packages_public_read"
  on public.credit_packages for select
  using (true);

-- ============================================================
-- updated_at 자동 업데이트 트리거
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 인덱스
-- ============================================================

create index if not exists idx_credit_transactions_user_id
  on public.credit_transactions(user_id);

create index if not exists idx_credit_transactions_created_at
  on public.credit_transactions(created_at desc);

create index if not exists idx_subscriptions_user_id
  on public.subscriptions(user_id);
