-- Add slug column to stores for SEO-friendly URLs
-- Slug is a URL-safe identifier for the store (e.g., "bilkomponenter" not "bilkomponenter-no")

-- Add slug column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stores' 
    AND column_name = 'slug'
  ) THEN
    ALTER TABLE public.stores ADD COLUMN slug TEXT;
  END IF;
END $$;

-- Populate slug from store_domain: "bilkomponenter.no" -> "bilkomponenter"
UPDATE public.stores
SET slug = SPLIT_PART(store_domain, '.', 1)
WHERE slug IS NULL OR slug = '';

-- Add unique constraint on (country, slug) for lookup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stores_country_slug_unique'
  ) THEN
    ALTER TABLE public.stores
    ADD CONSTRAINT stores_country_slug_unique UNIQUE (country, slug);
  END IF;
END $$;

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);
