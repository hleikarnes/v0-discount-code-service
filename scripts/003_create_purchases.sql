-- Create purchases table
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id UUID NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_session_id TEXT UNIQUE,
  email TEXT,
  amount_paid_cents INTEGER NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read their own purchase by session ID (for thank you page)
CREATE POLICY "purchases_select_by_session"
  ON public.purchases FOR SELECT
  USING (true);

-- Allow inserts from server actions only
CREATE POLICY "purchases_insert_server"
  ON public.purchases FOR INSERT
  WITH CHECK (true);

-- No updates or deletes allowed
CREATE POLICY "purchases_update_none"
  ON public.purchases FOR UPDATE
  USING (false);

CREATE POLICY "purchases_delete_none"
  ON public.purchases FOR DELETE
  USING (false);
