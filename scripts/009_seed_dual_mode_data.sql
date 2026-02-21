-- Seed data for dual-mode system

INSERT INTO stores (country_code, language_code, slug, store_domain, display_name, category, is_active, is_featured) VALUES
('NO', 'no', 'bilkomponenter', 'bilkomponenter.no', 'Bilkomponenter.no', 'Bil & Motor', true, true),
('NO', 'no', 'powerbutikken', 'powerbutikken.no', 'Power', 'Elektronikk', true, true),
('NO', 'no', 'komplett', 'komplett.no', 'Komplett', 'Data & Elektronikk', true, true),
('NO', 'no', 'elgiganten', 'elgiganten.no', 'Elgiganten', 'Elektronikk', true, true),
('NO', 'no', 'xxl', 'xxl.no', 'XXL', 'Sport & Fritid', true, true)
ON CONFLICT (store_domain) DO NOTHING;

-- Seed verified codes for bilkomponenter.no
INSERT INTO store_codes (store_domain, code, kind, value_num, last_discount_percent, last_tested_at, currency, tested_products_count, flags) VALUES
('bilkomponenter.no', 'SPAR15', 'percent', 15, 15, now() - interval '2 hours', 'NOK', 1, '{"category_limited": false, "min_purchase": null}'::jsonb),
('bilkomponenter.no', 'SPAR10', 'percent', 10, 10, now() - interval '2 hours', 'NOK', 1, '{"category_limited": false, "min_purchase": null}'::jsonb),
('bilkomponenter.no', 'FRIFRAKT', 'free_shipping', 0, 0, now() - interval '2 hours', 'NOK', 1, '{"notes": "Free shipping on all orders"}'::jsonb)
ON CONFLICT (store_domain, code) DO NOTHING;

-- Seed verified codes for powerbutikken.no
INSERT INTO store_codes (store_domain, code, kind, value_num, last_discount_percent, last_tested_at, currency, tested_products_count, flags) VALUES
('powerbutikken.no', 'POWER20', 'percent', 20, 20, now() - interval '1 day', 'NOK', 1, '{}'::jsonb),
('powerbutikken.no', 'SPAR100', 'fixed', 100, null, now() - interval '1 day', 'NOK', 1, '{"min_purchase": 500}'::jsonb)
ON CONFLICT (store_domain, code) DO NOTHING;

-- Seed verified codes for komplett.no
INSERT INTO store_codes (store_domain, code, kind, value_num, last_discount_percent, last_tested_at, currency, tested_products_count, flags) VALUES
('komplett.no', 'TECH15', 'percent', 15, 15, now() - interval '3 days', 'NOK', 1, '{}'::jsonb),
('komplett.no', 'GRATISFRAKT', 'free_shipping', 0, 0, now() - interval '3 days', 'NOK', 1, '{}'::jsonb)
ON CONFLICT (store_domain, code) DO NOTHING;
