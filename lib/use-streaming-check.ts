import { useState, useCallback, useRef } from "react";
import posthog from "posthog-js";
import type { CheckResponse, WriteMode } from "./types";

export type StreamState = "idle" | "streaming" | "done" | "error";

export function useStreamingCheck() {
  const [streamState, setStreamState] = useState<StreamState>("idle");
  const [streamedText, setStreamedText] = useState("");
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const submit = useCallback(
    async (
      text: string,
      language: string,
      sessionCount: number,
      mode: WriteMode
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStreamState("streaming");
      setStreamedText("");
      setResult(null);
      setError(null);

      try {
        const res = await fetch("/api/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-POSTHOG-DISTINCT-ID": posthog.get_distinct_id(),
          },
          body: JSON.stringify({ text, language, sessionCount, mode }),
          signal: controller.signal,
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          setError(data.error || "Failed to analyze writing.");
          setStreamState("error");
          return;
        }

        const parsed = data as CheckResponse;
        setResult(parsed);
        setStreamedText(parsed.improved_full);
        setStreamState("done");
        return parsed;
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return;
        console.error("Fetch error:", err);
        setError("Network error. Please check your connection.");
        setStreamState("error");
      }
    },
    []
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStreamState("idle");
    setStreamedText("");
    setResult(null);
    setError(null);
  }, []);

  return { streamState, streamedText, result, error, submit, reset };
}
