import { createClient } from "./client";

export interface Draft {
  id: string;
  user_id: string;
  plan_id: string | null;
  post_index: number | null;
  content: string;
  original_draft: string | null;
  source_note: string | null;
  source_entry_id: string | null;
  playbook_id: string | null;
  playbook_sections: Record<string, string> | null;
  published: boolean;
  published_platform: string | null;
  published_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getDraft(planId: string, postIndex: number): Promise<Draft | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .eq("user_id", user.id)
    .eq("plan_id", planId)
    .eq("post_index", postIndex)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch draft:", error);
    return null;
  }
  return data as Draft | null;
}

export async function getAllDrafts(): Promise<Draft[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch drafts:", error);
    return [];
  }
  return data as Draft[];
}

export async function markAsPublished(draftId: string, platform: string, url?: string): Promise<Draft | null> {
  const supabase = createClient();

  // Fetch current state for voice signal computation
  const { data: existing } = await supabase
    .from("drafts")
    .select("original_draft, content, user_id")
    .eq("id", draftId)
    .single();

  const { data, error } = await supabase
    .from("drafts")
    .update({
      published: true,
      published_platform: platform,
      published_url: url || null,
      published_at: new Date().toISOString(),
    })
    .eq("id", draftId)
    .select()
    .single();

  if (error) {
    console.error("Failed to mark as published:", JSON.stringify(error));
    return null;
  }

  // Compute voice signals on publish (fire-and-forget)
  if (existing?.original_draft && existing.original_draft !== existing.content) {
    computeAndStoreSignals(existing.user_id, draftId, existing.original_draft, existing.content).catch(() => {});
  }

  return data as Draft;
}

export async function createStandaloneDraft(
  content: string,
  sourceNote: string,
  sourceEntryId: string
): Promise<Draft | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const row: Record<string, unknown> = { user_id: user.id, content, original_draft: content, source_note: sourceNote };
  if (sourceEntryId) row.source_entry_id = sourceEntryId;
  const { data, error } = await supabase.from("drafts").insert(row).select().single();

  if (error) {
    console.error("Failed to create standalone draft:", JSON.stringify(error));
    return null;
  }
  return data as Draft;
}

export async function createPlaybookDraft(
  playbookId: string,
  sections: Record<string, string>,
  content: string
): Promise<Draft | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("drafts")
    .insert({
      user_id: user.id,
      content,
      playbook_id: playbookId,
      playbook_sections: sections,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create playbook draft:", JSON.stringify(error));
    return null;
  }
  return data as Draft;
}

export async function savePlaybookDraft(
  draftId: string,
  sections: Record<string, string>,
  content: string
): Promise<Draft | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("drafts")
    .update({
      content,
      playbook_sections: sections,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId)
    .select()
    .single();

  if (error) {
    console.error("Failed to save playbook draft:", JSON.stringify(error));
    return null;
  }
  return data as Draft;
}

export async function saveDraftById(draftId: string, content: string): Promise<Draft | null> {
  const supabase = createClient();

  // Fetch current draft to get original_draft for diff
  const { data: existing } = await supabase.from("drafts").select("original_draft, user_id").eq("id", draftId).single();

  const { data, error } = await supabase
    .from("drafts")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .select()
    .single();

  if (error) {
    console.error("Failed to save draft by id:", JSON.stringify(error));
    return null;
  }

  // Compute voice signals in the background (fire-and-forget)
  if (existing?.original_draft && existing.original_draft !== content) {
    computeAndStoreSignals(existing.user_id, draftId, existing.original_draft, content).catch(() => {});
  }

  return data as Draft;
}

export async function deleteDraft(draftId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("drafts").delete().eq("id", draftId);
  if (error) {
    console.error("Failed to delete draft:", JSON.stringify(error));
    return false;
  }
  return true;
}

export async function saveDraft(planId: string, postIndex: number, content: string): Promise<Draft | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const existing = await getDraft(planId, postIndex);
  if (existing) {
    const { data, error } = await supabase
      .from("drafts")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) {
      console.error("Failed to update draft:", JSON.stringify(error));
      return null;
    }
    return data as Draft;
  }

  const { data, error } = await supabase
    .from("drafts")
    .insert({ user_id: user.id, plan_id: planId, post_index: postIndex, content })
    .select()
    .single();

  if (error) {
    console.error("Failed to insert draft:", JSON.stringify(error));
    return null;
  }
  return data as Draft;
}

// ── Voice signal collection ──────────────────────────────────────────

interface VoiceSignal {
  user_id: string;
  draft_id: string;
  signal_type: "deletion" | "rewrite" | "kept";
  original_text: string;
  edited_text: string | null;
}

/**
 * Compare original AI draft with user-edited version.
 * Splits both into sentences, then classifies each original sentence as:
 *   - "kept" if it appears verbatim in the edited version
 *   - "deletion" if it was removed entirely
 *   - "rewrite" if a similar sentence exists (shares 3+ words) but was changed
 */
async function computeAndStoreSignals(
  userId: string,
  draftId: string,
  original: string,
  edited: string
): Promise<void> {
  const originalSentences = splitSentences(original);
  const editedSentences = splitSentences(edited);

  if (originalSentences.length === 0) return;

  const editedSet = new Set(editedSentences.map((s) => s.toLowerCase().trim()));
  const editedWords = editedSentences.map((s) => new Set(s.toLowerCase().split(/\s+/)));

  const signals: VoiceSignal[] = [];

  for (const sentence of originalSentences) {
    const lower = sentence.toLowerCase().trim();
    if (!lower) continue;

    if (editedSet.has(lower)) {
      // Kept verbatim
      signals.push({
        user_id: userId,
        draft_id: draftId,
        signal_type: "kept",
        original_text: sentence,
        edited_text: null,
      });
    } else {
      // Check for rewrite (similar sentence with 3+ shared words)
      const origWords = new Set(lower.split(/\s+/));
      let bestMatch: string | null = null;
      let bestOverlap = 0;

      for (let i = 0; i < editedSentences.length; i++) {
        let overlap = 0;
        for (const w of origWords) {
          if (w.length > 2 && editedWords[i].has(w)) overlap++;
        }
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestMatch = editedSentences[i];
        }
      }

      if (bestOverlap >= 3 && bestMatch) {
        signals.push({
          user_id: userId,
          draft_id: draftId,
          signal_type: "rewrite",
          original_text: sentence,
          edited_text: bestMatch,
        });
      } else {
        signals.push({
          user_id: userId,
          draft_id: draftId,
          signal_type: "deletion",
          original_text: sentence,
          edited_text: null,
        });
      }
    }
  }

  // Also capture additions: sentences in edited that don't match any original
  const originalSet = new Set(originalSentences.map((s) => s.toLowerCase().trim()));
  const originalWords = originalSentences.map((s) => new Set(s.toLowerCase().split(/\s+/)));

  for (const sentence of editedSentences) {
    const lower = sentence.toLowerCase().trim();
    if (!lower || originalSet.has(lower)) continue;

    // Check if this was already captured as a rewrite target
    const isRewriteTarget = signals.some((s) => s.signal_type === "rewrite" && s.edited_text === sentence);
    if (isRewriteTarget) continue;

    // Check if it shares 3+ words with any original (would be a rewrite, already captured)
    let isRelated = false;
    const editWords = new Set(lower.split(/\s+/));
    for (const origWordSet of originalWords) {
      let overlap = 0;
      for (const w of editWords) {
        if (w.length > 2 && origWordSet.has(w)) overlap++;
      }
      if (overlap >= 3) {
        isRelated = true;
        break;
      }
    }
    if (isRelated) continue;

    // Pure addition — not related to any original sentence
    // We don't store these as signals for now (no "addition" type yet)
  }

  if (signals.length === 0) return;

  // Store signals
  const supabase = createClient();
  const { error } = await supabase.from("voice_signals").insert(signals);
  if (error) {
    console.error("Failed to store voice signals:", JSON.stringify(error));
  }
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10); // Skip very short fragments
}
