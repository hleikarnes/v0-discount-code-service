-- Add is_featured column to partner_codes table
-- This column allows manual override for featured partner codes
ALTER TABLE public.partner_codes 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.partner_codes.is_featured IS 'When true, this partner code is featured and displayed first (before click-ranked codes)';
