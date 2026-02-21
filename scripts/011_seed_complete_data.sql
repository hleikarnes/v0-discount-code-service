-- Seed data for prototype mode

-- Country settings
INSERT INTO country_settings (country_code, default_reveal_cart_limit, default_reveal_product_limit)
VALUES 
  ('NO', 5, 5),
  ('SE', 5, 5),
  ('DK', 5, 5),
  ('GB', 5, 5)
ON CONFLICT (country_code) DO UPDATE SET
  default_reveal_cart_limit = EXCLUDED.default_reveal_cart_limit,
  default_reveal_product_limit = EXCLUDED.default_reveal_product_limit;

-- Stores
INSERT INTO stores (country_code, slug, domain, name, logo_url, website_url, description, is_active, is_featured)
VALUES 
  ('NO', 'bilkomponenter', 'bilkomponenter.no', 'Bilkomponenter.no', '/placeholder.svg?height=80&width=80', 'https://bilkomponenter.no', 'Norges ledende leverandør av bildeler og tilbehør', true, true),
  ('NO', 'komplett', 'komplett.no', 'Komplett', '/placeholder.svg?height=80&width=80', 'https://komplett.no', 'Nordens største nettbutikk for elektronikk', true, true),
  ('NO', 'power', 'power.no', 'Power', '/placeholder.svg?height=80&width=80', 'https://power.no', 'Elektronikk og hvitevarer', true, true),
  ('NO', 'zalando', 'zalando.no', 'Zalando', '/placeholder.svg?height=80&width=80', 'https://zalando.no', 'Europas ledende moteplattform', true, true)
ON CONFLICT (country_code, domain) DO UPDATE SET
  name = EXCLUDED.name,
  is_featured = EXCLUDED.is_featured;

-- Candidate codes with auto-publish
INSERT INTO candidate_codes (
  store_domain, code, status, is_visible_to_users,
  benefit_type, scope, value_percent, value_amount, currency,
  min_purchase_amount, tested_products_count, terms
)
VALUES 
  -- Bilkomponenter (cart codes - auto-published)
  ('bilkomponenter.no', 'SPAR15', 'tested_success', true, 'percent_off', 'cart', 15, null, 'NOK', 500, 1, 'Gyldig til 31.12.2025'),
  ('bilkomponenter.no', 'RABATT200', 'tested_success', true, 'amount_off', 'cart', null, 200, 'NOK', 1000, 1, 'Kun for nye kunder'),
  ('bilkomponenter.no', 'FRIFRAKT', 'tested_success', true, 'free_shipping', 'cart', null, null, 'NOK', null, 1, 'Ingen minstekjøp'),
  
  -- Komplett (cart codes - auto-published)
  ('komplett.no', 'TECH20', 'tested_success', true, 'percent_off', 'cart', 20, null, 'NOK', 2000, 1, 'Gyldig på gaming-produkter'),
  ('komplett.no', 'WELCOME150', 'tested_success', true, 'amount_off', 'cart', null, 150, 'NOK', 1500, 1, 'Kun for nye medlemmer'),
  
  -- Power (cart codes - auto-published)
  ('power.no', 'POWERUP10', 'tested_success', true, 'percent_off', 'cart', 10, null, 'NOK', null, 1, 'Gjelder alle varer'),
  ('power.no', 'GRATISFRAKT', 'tested_success', true, 'free_shipping', 'cart', null, null, 'NOK', 500, 1, 'Ved kjøp over 500 kr')
ON CONFLICT (store_domain, code) DO UPDATE SET
  status = EXCLUDED.status,
  is_visible_to_users = EXCLUDED.is_visible_to_users;

-- Store codes (published from candidates)
INSERT INTO store_codes (
  store_domain, code, benefit_type, scope,
  value_percent, value_amount, currency, min_purchase_amount,
  tested_products_count, terms, last_tested_at
)
SELECT 
  store_domain, code, benefit_type, scope,
  value_percent, value_amount, currency, min_purchase_amount,
  tested_products_count, terms, now()
FROM candidate_codes
WHERE is_visible_to_users = true
ON CONFLICT (store_domain, code) DO UPDATE SET
  last_tested_at = EXCLUDED.last_tested_at;

-- Affiliate offers
INSERT INTO affiliate_offers (
  country_code, slug, store_name, store_domain, logo_url,
  offer_type, discount_type, discount_value, code, terms,
  affiliate_url, is_active, sort_order
)
VALUES 
  ('NO', 'bestseller-partner', 'Bestseller', 'bestseller.com', '/placeholder.svg?height=80&width=80', 'code', 'percent_off', '20%', 'PARTNER20', 'Gyldig på alt', 'https://bestseller.com?ref=partner', true, 1),
  ('NO', 'hm-affiliate', 'H&M', 'hm.com', '/placeholder.svg?height=80&width=80', 'link', 'percent_off', '15%', null, 'Aktiveres via lenke', 'https://hm.com?ref=affiliate', true, 2),
  ('NO', 'booking-partner', 'Booking.com', 'booking.com', '/placeholder.svg?height=80&width=80', 'link', 'percent_off', '10%', null, 'Genius medlemskap gratis', 'https://booking.com?ref=partner', true, 3)
ON CONFLICT (country_code, slug) DO UPDATE SET
  is_active = EXCLUDED.is_active;

-- SEO pages
INSERT INTO seo_pages (country_code, store_slug, seo_title, seo_description, seo_body)
VALUES 
  ('NO', 'bilkomponenter', 'Bilkomponenter.no rabattkoder - Testet i handlekurv', 'Få verifiserte rabattkoder til Bilkomponenter.no. Alle koder er testet i handlekurv før vi viser dem til deg.', 'Bilkomponenter.no er Norges ledende leverandør av bildeler. Vi tester alle rabattkoder før de publiseres.'),
  ('NO', 'komplett', 'Komplett rabattkoder - Spar på elektronikk', 'Verifiserte rabattkoder til Komplett. Spar penger på gaming, PC-er, og annen elektronikk.', 'Komplett er Nordens største nettbutikk for elektronikk. Vi sjekker alle rabattkoder i ekte handlekurv.'),
  ('NO', 'power', 'Power rabattkoder - Elektronikk og hvitevarer', 'Testede rabattkoder til Power. Spar på elektronikk, hvitevarer og mer.', 'Power tilbyr elektronikk og hvitevarer til gode priser. Våre rabattkoder er verifisert før publisering.')
ON CONFLICT (country_code, store_slug) DO UPDATE SET
  seo_title = EXCLUDED.seo_title;
