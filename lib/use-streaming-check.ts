import { useState, useCallback, useRef } from "react";
import posthog from "posthog-js";
import type { QuickCheckResponse, Issue } from "./types";

export type FixState = "idle" | "fixing" | "done" | "error";
export type ExplainState = "idle" | "explaining" | "done" | "error";

export function useStreamingCheck() {
  const [fixState, setFixState] = useState<FixState>("idle");
  const [explainState, setExplainState] = useState<ExplainState>("idle");
  const [fixResult, setFixResult] = useState<QuickCheckResponse | null>(null);
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fixAbortRef = useRef<AbortController | null>(null);
  const explainAbortRef = useRef<AbortController | null>(null);
  const explainStartedRef = useRef(false);

  const submitFix = useCallback(
    async (text: string): Promise<QuickCheckResponse | null> => {
      fixAbortRef.current?.abort();
      explainAbortRef.current?.abort();
      const controller = new AbortController();
      fixAbortRef.current = controller;

      setFixState("fixing");
      setExplainState("idle");
      setFixResult(null);
      setIssues(null);
      setError(null);
      explainStartedRef.current = false;

      try {
        const res = await fetch("/api/check/fix", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-POSTHOG-DISTINCT-ID": posthog.get_distinct_id(),
          },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || "Failed to fix writing.");
          setFixState("error");
          return null;
        }
        const parsed = data as QuickCheckResponse;
        setFixResult(parsed);
        setFixState("done");
        return parsed;
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return null;
        console.error("Fix fetch error:", err);
        setError("Network error. Please check your connection.");
        setFixState("error");
        return null;
      }
    },
    []
  );

  const requestExplain = useCallback(
    async (original: string, fix: QuickCheckResponse) => {
      // Skip if already explaining or already done
      if (explainStartedRef.current) return;
      explainStartedRef.current = true;

      explainAbortRef.current?.abort();
      const controller = new AbortController();
      explainAbortRef.current = controller;

      setExplainState("explaining");

      try {
        const res = await fetch("/api/check/explain", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-POSTHOG-DISTINCT-ID": posthog.get_distinct_id(),
          },
          body: JSON.stringify({
            original,
            improved_full: fix.improved_full,
            phrases: fix.phrases,
          }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          setExplainState("error");
          return;
        }
        setIssues((data.issues as Issue[]) ?? []);
        setExplainState("done");
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return;
        console.error("Explain fetch error:", err);
        setExplainState("error");
        explainStartedRef.current = false;
      }
    },
    []
  );

  const reset = useCallback(() => {
    fixAbortRef.current?.abort();
    explainAbortRef.current?.abort();
    setFixState("idle");
    setExplainState("idle");
    setFixResult(null);
    setIssues(null);
    setError(null);
    explainStartedRef.current = false;
  }, []);

  return {
    fixState,
    explainState,
    fixResult,
    issues,
    error,
    submitFix,
    requestExplain,
    reset,
  };
}
