"use client";
import { useState, useEffect, useRef } from "react";
import type { Playbook } from "@/lib/playbooks";
import { createPlaybookDraft, savePlaybookDraft, type Draft } from "@/lib/supabase/drafts";
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
}: {
  playbook: Playbook;
  draft?: Draft;
  profile: UserProfile | null;
  onBack: () => void;
  onSaveDone: () => void;
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

  // Inline annotations state
  const [showEdits, setShowEdits] = useState(false);
  const [annotations, setAnnotations] = useState<
    { phrase: string; dimension: string; explanation: string; alternative: string }[]
  >([]);
  const [activeAnnotation, setActiveAnnotation] = useState<number | null>(null);
  const [loadingEdits, setLoadingEdits] = useState(false);

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

  async function fetchAnnotations() {
    if (annotations.length > 0 || loadingEdits || !profile?.voice_profile) return;
    setLoadingEdits(true);
    const vp = profile.voice_profile as VoiceProfile;
    const content = flattenSections(sections, playbook.sections);
    try {
      const res = await fetch("/api/voice-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: content, dimensions: vp.dimensions }),
      });
      const data = await res.json();
      setAnnotations(data.notes || []);
    } catch {}
    setLoadingEdits(false);
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
            <ArrowLeft size={12} /> Back
          </button>
          <div className="flex items-center gap-3">
            {profile?.voice_profile && (
              <button
                onClick={() => {
                  const next = !showEdits;
                  setShowEdits(next);
                  if (next) fetchAnnotations();
                  if (!next) setActiveAnnotation(null);
                }}
                disabled={loadingEdits || totalWords < 20}
                style={{
                  background: showEdits ? `${BLUE}10` : "transparent",
                  border: `1.5px solid ${showEdits ? BLUE : FAINT}`,
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  color: showEdits ? BLUE : DIM,
                  cursor: loadingEdits || totalWords < 20 ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  opacity: totalWords < 20 ? 0.4 : 1,
                }}
              >
                {loadingEdits ? "Loading..." : showEdits ? "Hide edits" : "Voice check"}
              </button>
            )}
            <span className="font-mono text-[11px]" style={{ color: saving ? BLUE : saveError ? "#DC2626" : FAINT }}>
              {saving ? "Saving..." : saveError ? "Save failed" : draftId ? "Saved" : ""}
            </span>
          </div>
        </div>

        {/* Playbook name */}
        <h2 className="font-serif mb-1" style={{ fontSize: 24, fontWeight: 600, color: INK }}>
          {playbook.name}
        </h2>
        <p className="font-sans mb-8" style={{ fontSize: 14, color: FAINT }}>
          {playbook.tagline}
        </p>

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
                  marginBottom: 8,
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
                placeholder=""
                className="w-full outline-none resize-none font-sans"
                style={{
                  fontSize: 16,
                  color: INK,
                  lineHeight: 1.8,
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  minHeight: 60,
                  overflow: "hidden",
                }}
                ref={(el) => {
                  if (el) {
                    el.style.height = "auto";
                    el.style.height = Math.max(60, el.scrollHeight) + "px";
                  }
                }}
                readOnly={showEdits}
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

        {/* Word count */}
        {totalWords > 0 && (
          <p className="font-mono text-[11px] mt-4" style={{ color: FAINT }}>
            {totalWords} words
          </p>
        )}

        {/* Annotations (when Voice check is on) */}
        {showEdits && annotations.length > 0 && (
          <div className="mt-6 mb-4">
            <p
              className="font-mono text-[11px] uppercase mb-3"
              style={{ color: FAINT, letterSpacing: "0.05em", fontWeight: 500 }}
            >
              Voice notes
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {annotations.map((note, i) => (
                <button
                  key={i}
                  onClick={() => setActiveAnnotation(activeAnnotation === i ? null : i)}
                  style={{
                    textAlign: "left",
                    background: activeAnnotation === i ? "#f0f4ff" : "#f9fafb",
                    border: `1px solid ${activeAnnotation === i ? BLUE : BORDER}`,
                    borderRadius: 10,
                    padding: "12px 16px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <p
                    className="font-mono text-[11px] uppercase"
                    style={{ color: BLUE, fontWeight: 600, marginBottom: 6 }}
                  >
                    {note.dimension}
                  </p>
                  <p
                    className="font-sans text-[14px]"
                    style={{
                      color: INK,
                      borderBottom: `2px dotted ${BLUE}40`,
                      display: "inline",
                      lineHeight: 1.6,
                    }}
                  >
                    &ldquo;{note.phrase}&rdquo;
                  </p>
                  {activeAnnotation === i && (
                    <div className="mt-3 space-y-2">
                      <p className="font-sans text-[13px]" style={{ color: INK, lineHeight: 1.5 }}>
                        {note.explanation}
                      </p>
                      <p
                        className="font-sans text-[13px]"
                        style={{
                          color: DIM,
                          lineHeight: 1.5,
                          fontStyle: "italic",
                        }}
                      >
                        Alternative: {note.alternative}
                      </p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="mt-8 space-y-3 pb-12">
          <button
            onClick={handleExplicitSave}
            disabled={saving || totalWords === 0}
            className="w-full py-3 rounded-full font-sans font-semibold text-[14px]"
            style={{
              background: "transparent",
              color: totalWords === 0 ? FAINT : DIM,
              border: `1.5px solid ${BORDER}`,
              cursor: totalWords === 0 ? "not-allowed" : "pointer",
              opacity: totalWords === 0 ? 0.5 : 1,
            }}
          >
            Save draft
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
