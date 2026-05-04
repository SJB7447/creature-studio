-- ============================================================
-- Firebase UID는 UUID 형식이 아님 (28자 alphanumeric)
-- users.id 및 참조 컬럼 타입을 uuid → text 로 변경
-- ============================================================

-- 1. FK 제약 제거
ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_user_id_fkey;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

-- 2. 기본값 제거 (gen_random_uuid()는 uuid 전용)
ALTER TABLE public.users
  ALTER COLUMN id DROP DEFAULT;

-- 3. 컬럼 타입 변경 (uuid → text)
ALTER TABLE public.users
  ALTER COLUMN id TYPE text USING id::text;

ALTER TABLE public.credit_transactions
  ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE public.subscriptions
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- 4. FK 재연결
ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================================================
-- deduct_credits 함수: p_user_id uuid → text
-- ============================================================
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id   text,
  p_amount    integer,
  p_feature   text    DEFAULT NULL,
  p_model     text    DEFAULT NULL,
  p_cost_krw  integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credits integer;
BEGIN
  SELECT credits INTO v_credits
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_credits IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  IF v_credits < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits: have %, need %', v_credits, p_amount;
  END IF;

  UPDATE public.users
  SET credits    = credits - p_amount,
      updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.credit_transactions
    (user_id, amount, type, feature, model_used, cost_krw)
  VALUES
    (p_user_id, -p_amount, 'use', p_feature, p_model, p_cost_krw);

  RETURN v_credits - p_amount;
END;
$$;

-- ============================================================
-- add_credits 함수: p_user_id uuid → text
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id  text,
  p_amount   integer,
  p_type     text DEFAULT 'charge',
  p_feature  text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credits integer;
BEGIN
  UPDATE public.users
  SET credits    = credits + p_amount,
      updated_at = now()
  WHERE id = p_user_id
  RETURNING credits INTO v_credits;

  IF v_credits IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  INSERT INTO public.credit_transactions
    (user_id, amount, type, feature)
  VALUES
    (p_user_id, p_amount, p_type, p_feature);

  RETURN v_credits;
END;
$$;
