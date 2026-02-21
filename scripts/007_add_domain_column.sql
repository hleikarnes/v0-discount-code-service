-- Add domain column as canonical identifier for stores
ALTER TABLE public.stores 
ADD COLUMN domain TEXT;

-- Populate domain from existing slug data for backward compatibility
UPDATE public.stores
SET domain = CASE slug
  WHEN 'nike' THEN 'nike.com'
  WHEN 'adidas' THEN 'adidas.no'
  WHEN 'hm' THEN 'hm.com'
  WHEN 'zara' THEN 'zara.com'
  WHEN 'asos' THEN 'asos.com'
  WHEN 'booking' THEN 'booking.com'
  ELSE slug || '.com'
END;

-- Make domain NOT NULL and UNIQUE after populating data
ALTER TABLE public.stores 
ALTER COLUMN domain SET NOT NULL;

ALTER TABLE public.stores 
ADD CONSTRAINT stores_domain_unique UNIQUE (domain);

-- Create index for fast domain lookups
CREATE INDEX idx_stores_domain ON public.stores(domain);
