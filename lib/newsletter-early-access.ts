import { createServerClient } from "@supabase/ssr";

// Early-access list for the company-newsletter concept.
// Kept separate from accounts: these tables are not linked to auth.users or profiles.
// Service-role client (server only), same pattern as lib/ai-usage-log.ts. The tables
// have RLS on with no policies, so the publishable key can't read or write them.
export function earlyAccessClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Names only, never values.
    throw new Error(
      `Missing env: ${[
        !process.env.NEXT_PUBLIC_SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
        !process.env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
      ]
        .filter(Boolean)
        .join(", ")}`
    );
  }
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

// Server-log description of a failure: Supabase error code/message or a thrown Error's
// message. Never includes request data or keys.
export function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string; hint?: string };
    return `code=${e.code ?? "?"} message=${e.message ?? "?"}${e.hint ? ` hint=${e.hint}` : ""}`;
  }
  return String(error);
}
