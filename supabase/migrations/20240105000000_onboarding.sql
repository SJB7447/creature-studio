-- users 테이블에 온보딩 완료 필드 추가
alter table public.users
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists production_type      text,       -- 제작 유형 (step 2)
  add column if not exists welcome_bonus_given  boolean not null default false;
