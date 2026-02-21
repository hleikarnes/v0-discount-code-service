-- Create discount codes table
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  discount_percentage INTEGER,
  discount_amount_cents INTEGER,
  terms TEXT,
  expiry_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  price_cents INTEGER NOT NULL DEFAULT 500,
  times_sold INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active codes (public marketplace)
CREATE POLICY "discount_codes_select_active"
  ON public.discount_codes FOR SELECT
  USING (is_active = true);

-- Only allow insert/update/delete via service role for now (admin only)
CREATE POLICY "discount_codes_insert_admin"
  ON public.discount_codes FOR INSERT
  WITH CHECK (false);

CREATE POLICY "discount_codes_update_admin"
  ON public.discount_codes FOR UPDATE
  USING (false);

CREATE POLICY "discount_codes_delete_admin"
  ON public.discount_codes FOR DELETE
  USING (false);
