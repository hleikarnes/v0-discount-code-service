# Rabattkoder.no - Discount Code Marketplace

A full-stack Next.js application for verified discount codes with dual-mode operation (prototype and live).

## Features

- **Dual-Mode Architecture**: Switch between prototype (manual/ChatGPT pipeline) and live (worker pipeline) modes via environment variables
- **Demo Payment Toggle**: Test payment flows without real Stripe transactions
- **Guest Identity System**: Cookie-based tracking for all visitors
- **Verified Discount Codes**: Show teasers before payment, reveal actual codes after purchase
- **Admin Dashboard**: Different interfaces for prototype (manual publishing) and live (job queue) modes
- **HMAC Token Security**: Short-lived tokens for revealing purchased codes
- **Supabase Database**: PostgreSQL with RLS policies for data security
- **Stripe Integration**: Embedded checkout with NOK currency support
- **Analytics Events**: Track searches, purchases, and code revelations

## Architecture

### App Modes

**APP_MODE=prototype** (default)
- Manual code entry via admin UI
- ChatGPT prompt generator for testing codes
- JSON paste interface for publishing results
- No worker dependencies

**APP_MODE=live**
- Automated worker pipeline
- Job queue with webhook triggers
- Real-time status polling
- Production-ready scaling

### Payment Modes

**DEMO_MODE=1** (default)
- Instant payment completion
- No Stripe API calls
- Perfect for development and testing

**DEMO_MODE=0**
- Real Stripe checkout
- Webhook verification
- Production payments

## Setup

### 1. Environment Variables

Create a `.env.local` file with the following variables:

```bash
# App Configuration
APP_MODE=prototype              # prototype | live
DEMO_MODE=1                     # 1 (demo) | 0 (real payments)
APP_ORIGIN=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Security
REVEAL_TOKEN_SECRET=your-random-secret-string-change-in-production

# Pricing (in minor units, e.g., 3000 = 30.00 NOK)
PRICE_SINGLE_DEFAULT=3000

# Live Mode Only (optional)
WORKER_WEBHOOK_URL=https://your-worker-endpoint.com/webhook
```

### 2. Database Setup

Run the SQL migration scripts in order:

```bash
# From the Supabase SQL editor or your preferred SQL client
# Run scripts in order:
scripts/008_refactor_for_dual_mode.sql
scripts/009_seed_dual_mode_data.sql
```

Or use the built-in script runner in v0.

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Usage

### Prototype Mode Workflow

1. **Start**: Visit `/admin` and enter a store domain (e.g., `bilkomponenter.no`)
2. **Job**: System creates a job record for tracking
3. **Test**: Copy the generated ChatGPT prompt
4. **Paste**: ChatGPT tests codes and returns JSON
5. **Publish**: Paste JSON into admin UI and click "Publish Codes"
6. **Live**: Codes are now available on the store page

### Live Mode Workflow

1. **Trigger**: Admin or automated system creates job via `/api/jobs/start`
2. **Webhook**: System POSTs to `WORKER_WEBHOOK_URL` with job details
3. **Worker**: External worker processes job and updates `store_codes` table
4. **Complete**: Job status updated to "done"
5. **Available**: Codes immediately available for purchase

## API Endpoints

### Public Endpoints

- `POST /api/stores/summary` - Search stores and get code teasers
- `POST /api/payments/checkout` - Start payment flow (demo or Stripe)
- `POST /api/purchases/token` - Get reveal token after payment
- `POST /api/stores/reveal` - Reveal codes with valid token

### Admin Endpoints

- `POST /api/jobs/start` - Create new job (manual or worker)
- `GET /api/jobs/[id]` - Get job status
- `POST /api/admin/manual/publish` - Publish codes (prototype only)
- `POST /api/admin/demo/seed` - Seed demo data

### Webhooks

- `POST /api/webhooks/stripe` - Stripe payment webhooks

## Database Schema

### Core Tables

- **stores** - Store directory with domain as primary key
- **store_codes** - Verified discount codes (source of truth)
- **candidate_codes** - Discovered codes awaiting verification
- **jobs** - Job queue for testing/updating codes
- **purchases** - Payment records per store
- **events** - Analytics tracking

### Key Relationships

- Purchases link to stores via `store_domain`
- Store codes reference stores via `store_domain`
- Jobs track updates per `store_domain`
- Events track all user interactions

## Security

- **RLS Policies**: Row-level security on all tables
- **Guest IDs**: HttpOnly cookies with 1-year expiry
- **HMAC Tokens**: Short-lived (1 hour) reveal tokens
- **Service Role**: Backend operations use service role key
- **Public Read**: Only active stores visible publicly
- **No Direct Access**: Codes never exposed without payment

## Development Tips

### Testing Locally

1. Use `DEMO_MODE=1` to skip Stripe
2. Use prototype mode for manual testing
3. Check `/admin` for system status
4. Monitor console logs with `[v0]` prefix

### Going Live

1. Set `APP_MODE=live`
2. Set `DEMO_MODE=0`
3. Configure `WORKER_WEBHOOK_URL`
4. Update Stripe keys to production
5. Deploy worker infrastructure
6. Test with small amounts first

### Adding Stores

Prototype mode:
```sql
INSERT INTO stores (store_domain, display_name, category, is_featured)
VALUES ('example.com', 'Example Store', 'Electronics', true);
```

Then use admin UI to add codes.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe Embedded Checkout
- **Auth**: Cookie-based guest sessions
- **Styling**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript
- **Deployment**: Vercel (recommended)

## Project Structure

```
app/
├── admin/              # Admin dashboard
├── api/                # API routes
├── store/[domain]/     # Store detail pages
├── search/             # Search results
├── thank-you/          # Post-payment page
└── page.tsx            # Homepage

components/
├── admin/              # Admin-specific components
├── ui/                 # shadcn/ui components
└── *.tsx               # Feature components

lib/
├── config.ts           # Environment configuration
├── guest.ts            # Guest ID utilities
├── token.ts            # HMAC token system
├── types.ts            # TypeScript types
└── supabase/           # Supabase clients

scripts/
└── *.sql               # Database migrations

proxy.ts                # Middleware for guest IDs
```

## Troubleshooting

### "No guest_id cookie"
- Ensure `proxy.ts` is in project root
- Check middleware config matches all paths

### "Multiple GoTrueClient instances"
- Use the singleton pattern in `lib/supabase/client.ts`
- Don't call `createBrowserClient()` directly

### "Store not found"
- Check `store_domain` matches exactly (case-sensitive)
- Verify store is `is_active=true`

### "Invalid or expired token"
- Tokens expire after 1 hour
- Check `REVEAL_TOKEN_SECRET` is consistent
- Ensure purchase status is "succeeded"

## Contributing

This is a v0 prototype. For production use:
1. Add proper authentication
2. Implement rate limiting
3. Add error monitoring (Sentry)
4. Set up CI/CD pipelines
5. Add comprehensive tests

## License

MIT License - See LICENSE file for details
