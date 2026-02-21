import { z } from "zod"

// Config schema for validation - make Supabase optional
const ConfigSchema = z.object({
  // App mode
  appMode: z.enum(["prototype", "live"]).default("prototype"),
  demoMode: z
    .union([z.boolean(), z.string()])
    .transform((val) => {
      if (typeof val === "boolean") return val
      if (typeof val === "string") return val === "1" || val === "true" || val === "yes"
      return true
    })
    .default(true),
  appOrigin: z.string().url().default("http://localhost:3000"),
  dbSetupMode: z.enum(["manual", "auto"]).default("manual"),

  // Supabase - optional
  supabaseUrl: z.string().url().optional(),
  supabaseAnonKey: z.string().optional(),
  supabaseServiceRoleKey: z.string().optional(),

  // Stripe
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),

  // Secrets
  revealTokenSecret: z.string().default("dev-secret-change-in-production"),
  adminSecret: z.string().optional(),
  prototypeSecret: z.string().optional(),

  // Live worker
  workerWebhookUrl: z.string().url().optional(),

  // Pricing (in minor units, e.g. 1900 = 19.00 NOK)
  priceSingleDefault: z.coerce.number().default(1900),
})

type Config = z.infer<typeof ConfigSchema>

// Parse and validate config
function getConfig(): Config {
  try {
    return ConfigSchema.parse({
      appMode: process.env.APP_MODE || "prototype",
      demoMode: process.env.DEMO_MODE || "1",
      dbSetupMode: process.env.DB_SETUP_MODE || "manual",
      appOrigin: process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",

      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

      stripeSecretKey: process.env.STRIPE_SECRET_KEY,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

      revealTokenSecret: process.env.REVEAL_TOKEN_SECRET || "dev-secret-change-in-production",
      adminSecret: process.env.ADMIN_SECRET,
      prototypeSecret: process.env.PROTOTYPE_SECRET,

      workerWebhookUrl: process.env.WORKER_WEBHOOK_URL,

      priceSingleDefault: process.env.PRICE_SINGLE_DEFAULT || "1900",
    })
  } catch (error) {
    console.error("❌ Invalid configuration:", error)
    // In manual mode, we can continue without full validation
    return {
      appMode: (process.env.APP_MODE || "prototype") as "prototype" | "live",
      demoMode: (process.env.DEMO_MODE || "1") === "1",
      dbSetupMode: (process.env.DB_SETUP_MODE || "manual") as "manual" | "auto",
      appOrigin: process.env.APP_ORIGIN || "http://localhost:3000",
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      stripeSecretKey: process.env.STRIPE_SECRET_KEY,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      revealTokenSecret: process.env.REVEAL_TOKEN_SECRET || "dev-secret-change-in-production",
      adminSecret: process.env.ADMIN_SECRET,
      prototypeSecret: process.env.PROTOTYPE_SECRET,
      workerWebhookUrl: process.env.WORKER_WEBHOOK_URL,
      priceSingleDefault: Number.parseInt(process.env.PRICE_SINGLE_DEFAULT || "1900"),
    }
  }
}

// Singleton config instance
let config: Config | null = null

export function getAppConfig(): Config {
  if (!config) {
    config = getConfig()
  }
  return config
}

// Helper functions
export function isPrototypeMode(): boolean {
  return getAppConfig().appMode === "prototype"
}

export function isLiveMode(): boolean {
  return getAppConfig().appMode === "live"
}

export function isDemoMode(): boolean {
  return getAppConfig().demoMode
}

export function isDbAvailable(): boolean {
  const cfg = getAppConfig()
  return !!(cfg.supabaseUrl && cfg.supabaseAnonKey && cfg.supabaseServiceRoleKey)
}

export function isManualMode(): boolean {
  return getAppConfig().dbSetupMode === "manual"
}
