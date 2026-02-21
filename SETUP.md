# Rabattkoder.no - Setup Guide

## Environment Variables

Required environment variables for the application:

```bash
# App Configuration
APP_MODE=prototype  # or "live"
DEMO_MODE=1         # 1 = demo payments enabled, 0 = real Stripe payments

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (only needed if DEMO_MODE=0)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Security
ADMIN_SECRET=your-secure-admin-secret
PROTOTYPE_SECRET=your-prototype-testing-secret
REVEAL_SECRET=your-reveal-token-secret

# Application
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## Database Setup

The application expects these tables in Supabase:

1. **country_settings** - Default reveal limits per country
2. **stores** - Store directory with domain as canonical identifier
3. **store_codes** - Published verified discount codes
4. **candidate_codes** - All found codes (testing queue)
5. **affiliate_offers** - Free partner codes
6. **seo_pages** - SEO metadata per store
7. **purchases** - Payment records
8. **reveal_tokens** - Short-lived code access tokens
9. **events** - Analytics events
10. **jobs** - Testing queue (prototype mode)

Run the migration scripts in order:

```bash
# Run in Supabase SQL Editor
scripts/010_complete_refactor.sql
scripts/011_seed_complete_data.sql
```

## API Routes

### Public Routes

- **GET `/api/stores/summary?query=X&country=NO`** - Search stores with teasers
- **POST `/api/payments/checkout`** - Create payment session
- **GET `/api/stores/reveal?store_domain=X`** (requires Bearer token) - Reveal codes after payment
- **GET `/api/affiliate/offers?country=NO`** - Get free partner codes

### Admin Routes (require `x-admin-secret` header)

- **POST `/api/admin/manual/publish`** - Publish codes (prototype)
- **POST `/api/admin/stores/upsert`** - Create/update stores
- **POST `/api/admin/affiliate/upsert`** - Create/update partner offers
- **POST `/api/admin/seo/upsert`** - Create/update SEO pages
- **GET `/api/admin/candidates/list`** - List candidate codes
- **GET `/api/admin/events/list`** - Analytics data

## Admin Access

1. Go to `/admin`
2. Use the "Codes" tab for prototype mode testing
3. Paste ChatGPT responses with tested codes
4. Publish to make them visible to users

## Security Notes

- Guest ID is set via middleware in `proxy.ts` as httpOnly cookie
- Reveal tokens expire after 15 minutes
- Rate limiting: 5 reveals per minute per guest
- All admin routes require `x-admin-secret` header
- Stripe webhooks verify payment state
- Never put reveal tokens in URLs
