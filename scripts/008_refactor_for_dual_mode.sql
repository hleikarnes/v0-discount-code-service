-- Drop old tables and recreate with new schema for dual-mode support

DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS discount_codes CASCADE;
DROP TABLE IF EXISTS stores CASCADE;

-- stores table with country/language support
CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL DEFAULT 'NO',
  language_code text NOT NULL DEFAULT 'no',
  slug text NOT NULL,
  store_domain text NOT NULL UNIQUE,
  display_name text NOT NULL,
  category text,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_stores_domain ON stores(store_domain);
CREATE INDEX idx_stores_featured ON stores(is_featured) WHERE is_featured = true;

-- store_codes: verified discount codes (source of truth)
CREATE TABLE store_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_domain text NOT NULL REFERENCES stores(store_domain) ON DELETE CASCADE,
  code text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('percent', 'fixed', 'free_shipping')),
  value_num numeric,
  last_discount_percent numeric,
  last_tested_at timestamptz,
  currency text DEFAULT 'NOK',
  tested_products_count int DEFAULT 1,
  flags jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_domain, code)
);

CREATE INDEX idx_store_codes_domain ON store_codes(store_domain);
CREATE INDEX idx_store_codes_tested ON store_codes(last_tested_at DESC);

-- candidate_codes: discovered codes awaiting verification
CREATE TABLE candidate_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_domain text NOT NULL,
  code text NOT NULL,
  source_url text,
  discovered_at timestamptz DEFAULT now(),
  meta jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX idx_candidate_codes_domain ON candidate_codes(store_domain);

-- jobs: queue for testing/updating codes
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

-- purchases: payment records per store
CREATE TABLE purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_domain text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  stripe_session_id text UNIQUE,
  amount int,
  currency text DEFAULT 'NOK',
  guest_id text,
  succeeded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_purchases_session ON purchases(stripe_session_id);
CREATE INDEX idx_purchases_guest ON purchases(guest_id);
CREATE INDEX idx_purchases_domain ON purchases(store_domain);

-- events: analytics tracking
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  guest_id text,
  store_domain text,
  purchase_id uuid REFERENCES purchases(id),
  country_code text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_events_type ON events(event_type, created_at DESC);
CREATE INDEX idx_events_guest ON events(guest_id);
CREATE INDEX idx_events_domain ON events(store_domain);

-- RLS Policies

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Public read for stores (for directory)
CREATE POLICY "Public can read active stores"
  ON stores FOR SELECT
  USING (is_active = true);

-- Service role can do everything
CREATE POLICY "Service role full access stores"
  ON stores FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access store_codes"
  ON store_codes FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access candidate_codes"
  ON candidate_codes FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access jobs"
  ON jobs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access purchases"
  ON purchases FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access events"
  ON events FOR ALL
  USING (auth.role() = 'service_role');
