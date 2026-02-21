-- Add unique constraint for (country, store_domain) to support upserts
-- This ensures no duplicate stores per country

-- First, delete any duplicates (keep the most recent one)
DELETE FROM public.stores a
USING public.stores b
WHERE a.id < b.id
  AND a.country = b.country
  AND a.store_domain = b.store_domain;

-- Add unique constraint (ignore if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stores_country_store_domain_unique'
  ) THEN
    ALTER TABLE public.stores
    ADD CONSTRAINT stores_country_store_domain_unique UNIQUE (country, store_domain);
  END IF;
END $$;
