-- Complete schema refactor for prototype + live support
-- Includes affiliate, country settings, SEO pages, and reveal limits

DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS reveal_tokens CASCADE;
DROP TABLE IF EXISTS store_codes CASCADE;
DROP TABLE IF EXISTS candidate_codes CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS affiliate_offers CASCADE;
DROP TABLE IF EXISTS seo_pages CASCADE;
DROP TABLE IF EXISTS country_settings CASCADE;
DROP TABLE IF EXISTS stores CASCADE;

-- country_settings: defaults per country
CREATE TABLE country_settings (
  country_code text PRIMARY KEY,
  default_reveal_cart_limit int NOT NULL DEFAULT 5,
  default_reveal_product_limit int NOT NULL DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- stores: main store directory
CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL DEFAULT 'NO',
  slug text NOT NULL,
  domain text NOT NULL,
  name text NOT NULL,
  logo_url text,
  website_url text,
  description text,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  reveal_cart_limit_override int,
  reveal_product_limit_override int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(country_code, slug),
  UNIQUE(country_code, domain)
);

CREATE INDEX idx_stores_country ON stores(country_code);
CREATE INDEX idx_stores_domain ON stores(domain);
CREATE INDEX idx_stores_featured ON stores(is_featured) WHERE is_featured = true;

-- candidate_codes: all discovered codes (never deleted)
CREATE TABLE candidate_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_domain text NOT NULL,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'found' CHECK (status IN ('found', 'tested_success', 'tested_failed')),
  is_visible_to_users boolean DEFAULT false,
  
  -- benefit details
  benefit_type text CHECK (benefit_type IN ('free_shipping', 'percent_off', 'amount_off')),
  scope text CHECK (scope IN ('cart', 'product')),
  value_percent numeric,
  value_amount numeric,
  currency text DEFAULT 'NOK',
  min_purchase_amount numeric,
  applies_to_product text,
  tested_products_count int DEFAULT 1,
  
  -- metadata
  source_url text,
  terms text,
  expires_at timestamptz,
  discovered_at timestamptz DEFAULT now(),
  tested_at timestamptz,
  meta jsonb DEFAULT '{}'::jsonb,
  
  UNIQUE(store_domain, code)
);

CREATE INDEX idx_candidate_status ON candidate_codes(status);
CREATE INDEX idx_candidate_visible ON candidate_codes(is_visible_to_users) WHERE is_visible_to_users = true;
CREATE INDEX idx_candidate_domain ON candidate_codes(store_domain);

-- store_codes: source of truth for what users see
CREATE TABLE store_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_domain text NOT NULL,
  code text NOT NULL,
  
  -- benefit details (same as candidate_codes)
  benefit_type text NOT NULL CHECK (benefit_type IN ('free_shipping', 'percent_off', 'amount_off')),
  scope text NOT NULL CHECK (scope IN ('cart', 'product')),
  value_percent numeric,
  value_amount numeric,
  currency text DEFAULT 'NOK',
  min_purchase_amount numeric,
  applies_to_product text,
  tested_products_count int DEFAULT 1,
  
  -- metadata
  terms text,
  expires_at timestamptz,
  last_tested_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(store_domain, code)
);

CREATE INDEX idx_store_codes_domain ON store_codes(store_domain);
CREATE INDEX idx_store_codes_benefit ON store_codes(benefit_type, scope);

-- affiliate_offers: free partner codes
CREATE TABLE affiliate_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  slug text NOT NULL,
  store_name text NOT NULL,
  store_domain text NOT NULL,
  logo_url text,
  
  -- offer details
  offer_type text NOT NULL CHECK (offer_type IN ('code', 'link')),
  discount_type text CHECK (discount_type IN ('percent_off', 'amount_off', 'free_shipping')),
  discount_value text,
  code text,
  terms text,
  affiliate_url text NOT NULL,
  
  -- visibility
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(country_code, slug)
);

CREATE INDEX idx_affiliate_country ON affiliate_offers(country_code, is_active) WHERE is_active = true;
CREATE INDEX idx_affiliate_sort ON affiliate_offers(sort_order);

-- seo_pages: SEO content per store per country
CREATE TABLE seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  store_slug text NOT NULL,
  seo_title text NOT NULL,
  seo_description text NOT NULL,
  seo_body text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(country_code, store_slug)
);

CREATE INDEX idx_seo_pages_lookup ON seo_pages(country_code, store_slug);

-- jobs: testing queue
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_domain text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed')),
  mode text NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual', 'worker')),
  priority int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  result_json jsonb,
  error text
);

CREATE INDEX idx_jobs_status ON jobs(status, created_at DESC);
CREATE INDEX idx_jobs_domain ON jobs(store_domain);

-- purchases: payment records
CREATE TABLE purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id text NOT NULL,
  store_domain text NOT NULL,
  country_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  stripe_session_id text UNIQUE,
  amount int NOT NULL,
  currency text DEFAULT 'NOK',
  succeeded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_purchases_session ON purchases(stripe_session_id);
CREATE INDEX idx_purchases_guest ON purchases(guest_id);
CREATE INDEX idx_purchases_domain ON purchases(store_domain);

-- reveal_tokens: short-lived tokens for code reveal
CREATE TABLE reveal_tokens (
  token text PRIMARY KEY,
  guest_id text NOT NULL,
  store_domain text NOT NULL,
  purchase_id uuid NOT NULL REFERENCES purchases(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reveal_tokens_expiry ON reveal_tokens(expires_at);
CREATE INDEX idx_reveal_tokens_purchase ON reveal_tokens(purchase_id);

-- events: server-side analytics
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  guest_id text,
  store_domain text,
  country_code text,
  purchase_id uuid REFERENCES purchases(id),
  suspicious boolean DEFAULT false,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_events_type ON events(event_type, created_at DESC);
CREATE INDEX idx_events_guest ON events(guest_id, created_at DESC);
CREATE INDEX idx_events_suspicious ON events(suspicious) WHERE suspicious = true;

-- RLS Policies
ALTER TABLE country_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE reveal_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read country_settings"
  ON country_settings FOR SELECT
  USING (true);

CREATE POLICY "Public read active stores"
  ON stores FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public read active affiliate"
  ON affiliate_offers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public read seo_pages"
  ON seo_pages FOR SELECT
  USING (true);

-- Service role full access
CREATE POLICY "Service role full access country_settings"
  ON country_settings FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access stores"
  ON stores FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access candidate_codes"
  ON candidate_codes FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access store_codes"
  ON store_codes FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access affiliate_offers"
  ON affiliate_offers FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access seo_pages"
  ON seo_pages FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access jobs"
  ON jobs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access purchases"
  ON purchases FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access reveal_tokens"
  ON reveal_tokens FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access events"
  ON events FOR ALL
  USING (auth.role() = 'service_role');
