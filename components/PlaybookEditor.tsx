"use client";
import { useState, useRef } from "react";
import type { Playbook } from "@/lib/playbooks";
import { createPlaybookDraft, savePlaybookDraft, createStandaloneDraft, type Draft } from "@/lib/supabase/drafts";
import type { UserProfile } from "@/lib/supabase/profiles";
import type { VoiceProfile } from "@/lib/voice-dimensions";
import { ArrowLeft } from "@/components/ArrowIcon";
import posthog from "posthog-js";

const INK = "#1A1A18";
const BLUE = "#4A6CF7";
const DIM = "#6B6860";
const FAINT = "#A8A49C";
const BORDER = "#e5e7eb";

function flattenSections(sections: Record<string, string>, playbookSections: { id: string }[]): string {
  return playbookSections
    .map((s) => sections[s.id] || "")
    .filter((t) => t.trim())
    .join("\n\n");
}

export default function PlaybookEditor({
  playbook,
  draft,
  profile,
  onBack,
  onSaveDone,
  onDevelop,
}: {
  playbook: Playbook;
  draft?: Draft;
  profile: UserProfile | null;
  onBack: () => void;
  onSaveDone: () => void;
  onDevelop: (draft: Draft) => void;
}) {
  const [sections, setSections] = useState<Record<string, string>>(() => {
    if (draft?.playbook_sections) return draft.playbook_sections;
    const initial: Record<string, string> = {};
    playbook.sections.forEach((s) => {
      initial[s.id] = "";
    });
    return initial;
  });
  const [draftId, setDraftId] = useState<string | null>(draft?.id || null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef(JSON.stringify(sections));

  const [developing, setDeveloping] = useState(false);

  const updateSection = (sectionId: string, value: string) => {
    setSections((prev) => {
      const updated = { ...prev, [sectionId]: value };

      // Debounced auto-save
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        const content = flattenSections(updated, playbook.sections);
        const serialized = JSON.stringify(updated);
        if (serialized === lastSavedRef.current) return;

        setSaving(true);
        if (draftId) {
          await savePlaybookDraft(draftId, updated, content);
        } else {
          const created = await createPlaybookDraft(playbook.id, updated, content);
          if (created) setDraftId(created.id);
        }
        lastSavedRef.current = serialized;
        setSaving(false);
      }, 1500);

      return updated;
    });
  };

  const handleExplicitSave = async () => {
    setSaving(true);
    setSaveError(null);
    const content = flattenSections(sections, playbook.sections);
    let result;
    if (draftId) {
      result = await savePlaybookDraft(draftId, sections, content);
    } else {
      result = await createPlaybookDraft(playbook.id, sections, content);
      if (result) setDraftId(result.id);
    }
    lastSavedRef.current = JSON.stringify(sections);
    setSaving(false);
    if (result) {
      posthog.capture("playbook_draft_saved", {
        playbook_id: playbook.id,
        word_count: content.trim().split(/\s+/).length,
      });
      onSaveDone();
    } else {
      setSaveError("Failed to save.");
    }
  };

  const filledSections = Object.values(sections).filter((v) => v.trim().length > 0).length;

  async function handleDevelop() {
    if (filledSections < 2 || developing || !profile?.voice_profile) return;
    setDeveloping(true);

    // Save playbook draft first
    const content = flattenSections(sections, playbook.sections);
    let savedDraft;
    if (draftId) {
      savedDraft = await savePlaybookDraft(draftId, sections, content);
    } else {
      savedDraft = await createPlaybookDraft(playbook.id, sections, content);
      if (savedDraft) setDraftId(savedDraft.id);
    }

    // Build structured input for the AI
    const structuredInput = playbook.sections
      .map((s) => {
        const val = sections[s.id]?.trim();
        return val ? `[${s.label}]\n${val}` : null;
      })
      .filter(Boolean)
      .join("\n\n");

    try {
      const res = await fetch("/api/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryContent: structuredInput,
          voiceProfile: profile.voice_profile,
          businessContext: "",
          platform: "linkedin",
        }),
      });
      if (!res.ok) throw new Error("Generate failed");
      const draftText = await res.text();

      // Create a new standalone draft with the developed content
      const developed = await createStandaloneDraft(draftText, content, "");
      if (developed) {
        posthog.capture("playbook_developed", {
          playbook_id: playbook.id,
          word_count: draftText.trim().split(/\s+/).length,
        });
        onDevelop(developed);
      }
    } catch (err) {
      console.error("Develop failed:", err);
    } finally {
      setDeveloping(false);
    }
  }

  const totalWords = flattenSections(sections, playbook.sections).trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <div className="max-w-[640px] mx-auto px-5 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="font-mono text-[12px]"
            style={{ color: DIM, background: "none", border: "none", cursor: "pointer" }}
          >
            <ArrowLeft size={12} /> Playbooks
          </button>
          <span className="font-mono text-[11px]" style={{ color: saving ? BLUE : saveError ? "#DC2626" : FAINT }}>
            {saving ? "Saving..." : saveError ? "Save failed" : draftId ? "Saved" : ""}
          </span>
        </div>

        {/* Playbook hero row */}
        <div className="flex items-start gap-4 mb-8">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 10,
              background: playbook.color,
              flexShrink: 0,
              display: "flex",
              alignItems: "flex-end",
              padding: "6px 8px",
            }}
          >
            <span
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 9,
                fontWeight: 600,
                color: playbook.textColor,
                lineHeight: 1.1,
                opacity: 0.8,
              }}
            >
              {playbook.name}
            </span>
          </div>
          <div>
            <h2 className="font-serif" style={{ fontSize: 24, fontWeight: 600, color: INK, marginBottom: 2 }}>
              {playbook.name}
            </h2>
            <p className="font-sans" style={{ fontSize: 14, color: FAINT, lineHeight: 1.4 }}>
              {playbook.tagline}
            </p>
          </div>
        </div>

        {/* Sections */}
        {playbook.sections.map((section, i) => {
          const value = sections[section.id] || "";
          const hasContent = value.trim().length > 0;
          return (
            <div key={section.id} style={{ marginBottom: i < playbook.sections.length - 1 ? 0 : 0 }}>
              <p
                className="font-mono text-[11px] uppercase"
                style={{
                  color: FAINT,
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                {section.label}
              </p>
              <p
                className="font-sans text-[13px]"
                style={{
                  color: FAINT,
                  marginBottom: 10,
                  lineHeight: 1.4,
                  opacity: hasContent ? 0 : 1,
                  height: hasContent ? 0 : "auto",
                  overflow: "hidden",
                  transition: "opacity 0.2s ease",
                }}
              >
                {section.helper}
              </p>
              <textarea
                value={value}
                onChange={(e) => updateSection(section.id, e.target.value)}
                placeholder="Start typing..."
                className="w-full outline-none resize-none font-sans"
                style={{
                  fontSize: 16,
                  color: INK,
                  lineHeight: 1.8,
                  padding: "12px 16px",
                  borderLeft: "2px solid transparent",
                  borderTop: "none",
                  borderRight: "none",
                  borderBottom: "none",
                  background: "#FAFAF7",
                  borderRadius: 12,
                  minHeight: 60,
                  overflow: "hidden",
                  transition: "background 0.15s ease, border-color 0.15s ease",
                  cursor: "text",
                }}
                onMouseEnter={(e) => {
                  if (document.activeElement !== e.currentTarget) {
                    (e.currentTarget as HTMLElement).style.background = "#F5F2EC";
                  }
                }}
                onMouseLeave={(e) => {
                  if (document.activeElement !== e.currentTarget) {
                    (e.currentTarget as HTMLElement).style.background = "#FAFAF7";
                  }
                }}
                onFocus={(e) => {
                  (e.currentTarget as HTMLElement).style.borderLeftColor = playbook.color;
                  (e.currentTarget as HTMLElement).style.background = "#FAFAF7";
                }}
                onBlur={(e) => {
                  (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent";
                  (e.currentTarget as HTMLElement).style.background = "#FAFAF7";
                }}
                ref={(el) => {
                  if (el) {
                    el.style.height = "auto";
                    el.style.height = Math.max(60, el.scrollHeight) + "px";
                  }
                }}
                readOnly={false}
              />
              {i < playbook.sections.length - 1 && (
                <div
                  style={{
                    borderBottom: `1px dashed ${BORDER}`,
                    margin: "16px 0 24px",
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Word count + Bottom actions */}
        {totalWords > 0 && (
          <p className="font-mono text-[11px] mt-4 text-right" style={{ color: FAINT }}>
            {totalWords} words
          </p>
        )}
        <div className="mt-6 pb-12" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <button
            onClick={handleDevelop}
            disabled={developing || filledSections < 2 || !profile?.voice_profile}
            className="w-full py-3.5 rounded-full font-sans font-semibold text-[15px]"
            style={{
              background: filledSections < 2 || !profile?.voice_profile ? INK : INK,
              color: "#fff",
              border: "none",
              cursor: developing || filledSections < 2 ? "not-allowed" : "pointer",
              opacity: filledSections < 2 ? 0.35 : 1,
            }}
          >
            {developing ? "Developing..." : "Develop into draft"}
          </button>
          <button
            onClick={handleExplicitSave}
            disabled={saving || totalWords === 0}
            className="font-sans text-[13px]"
            style={{
              background: "none",
              border: "none",
              color: DIM,
              cursor: totalWords === 0 ? "not-allowed" : "pointer",
              opacity: totalWords === 0 ? 0.5 : 1,
              padding: 0,
            }}
          >
            {saving ? "Saving..." : "Save for later"}
          </button>
          {saveError && (
            <p className="font-sans text-[13px]" style={{ color: "#DC2626" }}>
              {saveError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
