import { createServerClient } from "@supabase/ssr";

// Early-access list for the company-newsletter concept.
// Kept separate from accounts: these tables are not linked to auth.users or profiles.
// Service-role client (server only), same pattern as lib/ai-usage-log.ts. The tables
// have RLS on with no policies, so the publishable key can't read or write them.
export function earlyAccessClient() {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

// Vercel sets VERCEL_ENV to "production" only on production deployments.
// Everything else (preview deployments, local dev) is stored as "preview".
export function earlyAccessEnvironment(): "preview" | "production" {
  return process.env.VERCEL_ENV === "production" ? "production" : "preview";
}

// Test signups are marked so they can be filtered out: any address whose local
// part starts with "test+" (e.g. test+preview-1@myaccent.io).
export function isTestEmail(email: string): boolean {
  return email.startsWith("test+");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normaliseEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export const MAX_ANSWER_LENGTH = 2000;
