export type AiCheckResult = { met: boolean; reason: string; quote: string | null };

function isValidResult(value: unknown): value is AiCheckResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.met === "boolean" && typeof v.reason === "string" && (v.quote === null || typeof v.quote === "string")
  );
}

/**
 * Returns null on any failure — network error, non-2xx, or a malformed
 * body — so the caller can fall back to needs_confirmation rather than
 * surfacing an error. The server has already done the real validation;
 * this is defense in depth, not the primary check.
 */
export async function checkWithAi(transcript: string, criterionId: string): Promise<AiCheckResult | null> {
  try {
    const res = await fetch("/api/check-ai-chip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, criterionId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return isValidResult(data) ? data : null;
  } catch {
    return null;
  }
}
