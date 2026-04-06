"use client";

import { useState, useCallback, useEffect } from "react";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";

type CopyState = "default" | "copying" | "copied";

interface CopyButtonProps {
  text: string;
  onSave?: () => void;
  className?: string;
}

export function CopyButton({ text, onSave, className }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>("default");
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsSignedIn(!!user);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleCopy = useCallback(async () => {
    if (state !== "default") return;
    setState("copying");
    await navigator.clipboard.writeText(text);
    posthog.capture("result_copied", { saved_to_shelf: isSignedIn });
    if (isSignedIn) {
      onSave?.();
    }
    setTimeout(() => {
      setState("copied");
      setTimeout(() => setState("default"), 2000);
    }, 500);
  }, [text, state, onSave, isSignedIn]);

  const label = isSignedIn ? "Copy & save" : "Copy";

  return (
    <button
      onClick={handleCopy}
      disabled={state !== "default"}
      className={`py-2.5 min-h-[44px] rounded-[8px] text-sm font-sans font-medium transition-colors ${
        state === "copied"
          ? "bg-teal text-white"
          : state === "copying"
            ? "bg-coral/70 text-[#1B3A2D]"
            : "bg-coral text-[#1B3A2D] hover:bg-coral/90"
      } ${className || "flex-1"}`}
    >
      {state === "copied"
        ? "Copied \u2713"
        : state === "copying"
          ? "Copying\u2026"
          : label}
    </button>
  );
}
