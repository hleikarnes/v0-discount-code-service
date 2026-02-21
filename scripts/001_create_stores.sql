-- Create stores table
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read stores (public marketplace)
CREATE POLICY "stores_select_all"
  ON public.stores FOR SELECT
  USING (true);

-- Only allow insert/update/delete via service role for now (admin only)
CREATE POLICY "stores_insert_admin"
  ON public.stores FOR INSERT
  WITH CHECK (false);

CREATE POLICY "stores_update_admin"
  ON public.stores FOR UPDATE
  USING (false);

CREATE POLICY "stores_delete_admin"
  ON public.stores FOR DELETE
  USING (false);
