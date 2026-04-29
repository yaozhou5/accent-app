"use client";

import { useState, useEffect } from "react";
import posthog from "posthog-js";
import type { Locale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import {
  getShelfEntries,
  deleteShelfEntry,
  type ShelfEntry,
} from "@/lib/supabase/shelf";
import { ShelfDetail } from "./ShelfDetail";

interface ShelfTabProps {
  locale: Locale;
}

export function ShelfTab({ locale }: ShelfTabProps) {
  const [entries, setEntries] = useState<ShelfEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<boolean>(false);
  const [selectedEntry, setSelectedEntry] = useState<ShelfEntry | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(!!user);
      if (user) {
        getShelfEntries().then((data) => {
          setEntries(data);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleDelete = async (id: string) => {
    const success = await deleteShelfEntry(id);
    if (success) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (selectedEntry?.id === id) setSelectedEntry(null);
      posthog.capture("shelf_entry_deleted");
    }
  };

  if (selectedEntry) {
    return (
      <ShelfDetail
        entry={selectedEntry}
        locale={locale}
        onBack={() => setSelectedEntry(null)}
        onDelete={handleDelete}
      />
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <p className="font-serif font-bold text-xl text-ink">Your shelf</p>
        <p className="font-sans text-sm text-ink/50 text-center">
          Save your revisions to build a record of your progress.
        </p>
        <button
          onClick={() => {
            const signInBtn =
              document.querySelector<HTMLButtonElement>("[data-auth-trigger]");
            signInBtn?.click();
          }}
          className="px-6 py-2.5 rounded-full bg-[#2563EB] text-white text-sm font-sans font-medium hover:opacity-90 transition-colors"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse-subtle space-y-3 py-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white border border-ink/10 rounded-[12px] px-4 py-4 space-y-2"
          >
            <div className="h-3 bg-ink/10 rounded w-24" />
            <div className="h-4 bg-ink/5 rounded w-full" />
            <div className="h-4 bg-ink/5 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <p className="font-serif font-bold text-xl text-ink">
          Your shelf is empty
        </p>
        <p className="font-sans text-sm text-ink/50 text-center">
          Tap &ldquo;Copy &amp; save&rdquo; after checking your writing to save
          it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-serif font-bold text-xl text-ink">Your shelf</p>
      {entries.map((entry) => (
        <div
          key={entry.id}
          onClick={() => { posthog.capture("shelf_entry_opened", { mode: entry.mode }); setSelectedEntry(entry); }}
          className="bg-white border border-ink/10 rounded-[12px] px-4 py-4 space-y-2 cursor-pointer hover:bg-warm/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-sans text-ink/40">
              {new Date(entry.created_at).toLocaleDateString(
                locale === "zh"
                  ? "zh-CN"
                  : locale === "nl"
                    ? "nl-NL"
                    : "en-US",
                { month: "short", day: "numeric" }
              )}
              {" \u00B7 "}
              {entry.mode === "quick"
                ? "\u26A1 Quick"
                : "\uD83D\uDCD6 Teach"}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(entry.id);
              }}
              className="text-xs font-sans text-ink/30 hover:text-ink/60 transition-colors min-h-[44px] px-2"
              aria-label="Delete entry"
            >
              Delete
            </button>
          </div>

          <div
            className="border-l-[3px] border-[#C4553A] rounded-[8px] px-3 py-2"
            style={{ backgroundColor: "rgba(196, 85, 58, 0.08)" }}
          >
            <p className="font-sans text-xs leading-relaxed text-ink/70 line-clamp-2">
              {entry.original}
            </p>
          </div>

          <div className="border-l-[3px] border-teal/30 rounded-[8px] bg-teal-light/30 px-3 py-2">
            <p className="font-sans text-xs leading-relaxed text-ink line-clamp-2">
              {entry.improved}
            </p>
          </div>

          {entry.lessons.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {entry.lessons.map((lesson, i) => (
                <span
                  key={i}
                  className="text-[11px] font-sans text-ink/40 bg-warm rounded-full px-2 py-0.5"
                >
                  {lesson.title}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
