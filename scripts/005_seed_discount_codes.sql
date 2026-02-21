-- Seed some example discount codes for the stores
-- Updated to use domain instead of slug for lookups

INSERT INTO public.discount_codes (store_id, code, description, discount_percentage, terms, expiry_date, price_cents, is_active)
SELECT 
  s.id,
  'NIKE20',
  'Get 20% off on all products',
  20,
  'Valid on orders over $50. Cannot be combined with other offers.',
  NOW() + INTERVAL '30 days',
  500,
  true
FROM public.stores s WHERE s.domain = 'nike.com';

INSERT INTO public.discount_codes (store_id, code, description, discount_percentage, terms, expiry_date, price_cents, is_active)
SELECT 
  s.id,
  'ADIDAS15',
  '15% off sneakers',
  15,
  'Valid on sneakers only. Excludes sale items.',
  NOW() + INTERVAL '45 days',
  500,
  true
FROM public.stores s WHERE s.domain = 'adidas.no';

INSERT INTO public.discount_codes (store_id, code, description, discount_percentage, terms, expiry_date, price_cents, is_active)
SELECT 
  s.id,
  'HM30',
  '30% off summer collection',
  30,
  'Valid on summer collection only.',
  NOW() + INTERVAL '15 days',
  500,
  true
FROM public.stores s WHERE s.domain = 'hm.com';

INSERT INTO public.discount_codes (store_id, code, description, discount_percentage, terms, expiry_date, price_cents, is_active)
SELECT 
  s.id,
  'ZARA25',
  '25% off new arrivals',
  25,
  'Valid on new arrivals. Minimum purchase $75.',
  NOW() + INTERVAL '20 days',
  500,
  true
FROM public.stores s WHERE s.domain = 'zara.com';

INSERT INTO public.discount_codes (store_id, code, description, discount_percentage, terms, expiry_date, price_cents, is_active)
SELECT 
  s.id,
  'ASOS10',
  '10% off first order',
  10,
  'For new customers only.',
  NOW() + INTERVAL '60 days',
  500,
  true
FROM public.stores s WHERE s.domain = 'asos.com';

INSERT INTO public.discount_codes (store_id, code, description, discount_amount_cents, terms, expiry_date, price_cents, is_active)
SELECT 
  s.id,
  'BOOKING50',
  'Get $50 off your booking',
  5000,
  'Valid on bookings over $200.',
  NOW() + INTERVAL '40 days',
  500,
  true
FROM public.stores s WHERE s.domain = 'booking.com';

-- Added discount code for bilkomponenter.no
INSERT INTO public.discount_codes (store_id, code, description, discount_percentage, terms, expiry_date, price_cents, is_active)
SELECT 
  s.id,
  'BILKOMP15',
  '15% rabatt på alle bildeler',
  15,
  'Gjelder hele sortimentet. Minimum kjøp 500 kr.',
  NOW() + INTERVAL '30 days',
  500,
  true
FROM public.stores s WHERE s.domain = 'bilkomponenter.no';
