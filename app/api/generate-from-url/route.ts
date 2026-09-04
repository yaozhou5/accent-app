import { NextRequest } from "next/server";
import Anthropic, { APIConnectionTimeoutError, RateLimitError, APIError } from "@anthropic-ai/sdk";
import { logAiUsage, logAiGenerationFailure } from "@/lib/ai-usage-log";

const anthropic = new Anthropic({ maxRetries: 2, timeout: 30_000 });

// --- Rate limiting ---
// In-memory, per-instance. Resets on cold start (serverless). Acceptable for now.
const MAX_PER_IP = 5;
const MAX_PER_DAY = 300;
const WINDOW_MS = 60 * 60 * 1000;

type IpEntry = { count: number; resetAt: number };
const ipStore = new Map<string, IpEntry>();
let dailyCount = 0;
let dailyResetDate = new Date().toISOString().slice(0, 10);

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function checkIpLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipStore.get(ip);
  if (!entry || entry.resetAt < now) {
    ipStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_PER_IP) return false;
  entry.count++;
  return true;
}

function checkDailyLimit(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dailyResetDate) {
    dailyCount = 0;
    dailyResetDate = today;
  }
  if (dailyCount >= MAX_PER_DAY) return false;
  dailyCount++;
  return true;
}

if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of ipStore.entries()) {
        if (entry.resetAt < now) ipStore.delete(key);
      }
    },
    5 * 60 * 1000
  );
}

// --- URL fetching and extraction ---

const FETCH_TIMEOUT_MS = 8000;
const MAX_EXTRACT_CHARS = 4000;

async function fetchAndExtract(url: string): Promise<{ text: string; title: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AccentBot/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim().slice(0, 200) : "";

    // Strip script, style, nav, footer, header, aside
    let cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<aside[\s\S]*?<\/aside>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

    // Strip all remaining tags
    cleaned = cleaned.replace(/<[^>]+>/g, " ");
    // Collapse whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    // Decode common HTML entities
    cleaned = cleaned
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");

    if (cleaned.length < 50) return null; // JS-only site with no content

    return { text: cleaned.slice(0, MAX_EXTRACT_CHARS), title };
  } catch {
    return null;
  }
}

function normalizeUrl(input: string): string | null {
  let url = input.trim();
  if (!url) return null;
  // Reject obviously non-URL input
  if (!url.includes(".") || url.includes(" ")) return null;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  try {
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

// --- Helpers ---

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const FEATURE = "generate_from_url";
const MODEL = "claude-sonnet-4-6";

// --- Route ---

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const ip = getClientIp(request);

    if (!checkDailyLimit()) {
      return json(
        {
          error: "We've hit the daily limit. Try again tomorrow, or sign up for unlimited posts.",
          reason: "daily_limit",
        },
        429
      );
    }
    if (!checkIpLimit(ip)) {
      return json(
        { error: "You've used your free posts this hour. Sign up for unlimited access.", reason: "rate_limited" },
        429
      );
    }

    const { url: rawUrl, description } = (await request.json()) as { url?: string; description?: string };

    // Two paths: URL-based or description-based (fallback)
    let pageContent: string | null = null;
    let pageTitle = "";
    let source: "url" | "description" = "url";

    if (rawUrl) {
      const url = normalizeUrl(rawUrl);
      if (!url) {
        return json(
          { error: "That doesn't look like a URL. Try pasting a link to your product page.", reason: "bad_url" },
          400
        );
      }

      const extracted = await fetchAndExtract(url);
      if (extracted) {
        pageContent = extracted.text;
        pageTitle = extracted.title;
      }
      // If fetch failed, fall through — we'll check for description fallback
    }

    if (!pageContent && description?.trim()) {
      pageContent = description.trim();
      source = "description";
    }

    if (!pageContent) {
      // URL fetch failed and no description provided
      return json(
        {
          error: "Couldn't read that page — it might need JavaScript to load, or the server blocked us.",
          reason: "fetch_failed",
          needsDescription: true,
        },
        422
      );
    }

    // --- Generate post ---
    const systemPrompt =
      source === "url"
        ? `You are a ghostwriter for founders. You've just read a product's landing page. Write a short LinkedIn-style post (150–250 words) from the founder's perspective about the PROBLEM this product exists to solve and why they're building it.

Do NOT summarize the landing page. Do NOT list features. Do NOT write marketing copy or an ad.

Write as if the founder is talking to other founders about a problem they personally experienced. Use first person. Be specific about the pain point. End with what they learned or what surprised them.

The tone should be: direct, honest, slightly informal. Like a founder explaining their product to someone they respect at a dinner. Not a pitch — a conversation.

Page title: ${pageTitle}
Page content (extracted):
${pageContent}`
        : `You are a ghostwriter for founders. A founder has described what they're building in one sentence. Write a short LinkedIn-style post (150–250 words) from their perspective about the PROBLEM this product exists to solve and why they're building it.

Do NOT write marketing copy or an ad. Write as if the founder is talking to other founders about a problem they personally experienced. Use first person. Be specific about the pain point. End with what they learned or what surprised them.

The tone should be: direct, honest, slightly informal. Like a founder explaining their product to someone they respect at a dinner.

What they're building:
${pageContent}`;

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      messages: [{ role: "user", content: systemPrompt }],
    });

    await logAiUsage({ feature: FEATURE, model: MODEL, usage: message.usage, userId: null });

    const postText = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";

    if (!postText) {
      await logAiGenerationFailure({
        feature: FEATURE,
        model: MODEL,
        reason: "empty_response",
        durationMs: Date.now() - startedAt,
        detail: `source=${source}`,
        userId: null,
      });
      return json(
        {
          error: "Couldn't generate a post. Try describing what you're building instead.",
          reason: "empty_response",
          needsDescription: true,
        },
        502
      );
    }

    return json({ post: postText, source }, 200);
  } catch (error) {
    console.error("generate-from-url error:", error);
    let reason = "error";
    if (error instanceof APIConnectionTimeoutError) reason = "timeout";
    else if (error instanceof RateLimitError) reason = "rate_limited";
    else if (error instanceof APIError && typeof error.status === "number" && error.status >= 500)
      reason = "upstream_error";

    await logAiGenerationFailure({
      feature: FEATURE,
      model: MODEL,
      reason,
      durationMs: Date.now() - startedAt,
      detail: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
      userId: null,
    });
    return json({ error: "Something went wrong. Try again?", reason }, 500);
  }
}
