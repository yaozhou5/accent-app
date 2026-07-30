// lib/voice-instructions.ts
import { normalizeScore, type DimensionKey, type VoiceDimensions, type VoiceProfile } from "@/lib/voice-dimensions";

export function buildVoiceInstructions(
  dims: VoiceDimensions,
  profile?: { top_traits?: string[]; edge?: string; gap?: string }
): string {
  const lines: string[] = [];

  // Voice identity block — most human-readable part
  if (profile?.top_traits?.length) {
    lines.push(`YOUR VOICE IDENTITY:\n${profile.top_traits.join(". ")}.`);
  }
  if (profile?.edge) {
    lines.push(`\nYOUR EDGE:\n${profile.edge}`);
  }
  if (profile?.gap) {
    lines.push(`\nWATCH OUT FOR:\n${profile.gap}`);
  }
  if (lines.length > 0) {
    lines.push(""); // blank line before dimensional instructions
  }

  for (const [key, raw] of Object.entries(dims) as [DimensionKey, number][]) {
    const norm = normalizeScore(key, raw);
    const abs = Math.abs(norm);

    if (abs < 0.25) continue; // near-neutral, skip

    const strong = abs >= 0.75;

    switch (key) {
      case "directness":
        lines.push(
          norm > 0
            ? strong
              ? "DIRECTNESS: Be blunt. If something failed, say it failed. If you disagree, say so. The reader respects you more when you don't soften."
              : "DIRECTNESS: State your point in the first sentence. No throat-clearing, no 'I wanted to share...' Lead with the conclusion, then support it."
            : strong
              ? "DIRECTNESS: Never drop a take without setting the scene first. The reader needs to understand why before they hear what."
              : "DIRECTNESS: Build context before making your point. Don't lead with the conclusion — walk the reader through your thinking so they arrive at it with you."
        );
        break;

      case "precision":
        lines.push(
          norm > 0
            ? strong
              ? "PRECISION: Every claim needs a number or a name attached to it. Vague language ('a lot,' 'some,' 'recently') is banned. If you don't have the number, use a concrete example instead."
              : "PRECISION: Use specific numbers, names, dates, and concrete details. Say '12 deals, up from 7' not 'more deals.' Say '$34K average' not 'smaller deals.'"
            : strong
              ? "PRECISION: Avoid specific numbers unless they're the whole point. Let the reader feel the weight of something rather than count it."
              : "PRECISION: Paint impressions rather than citing data. Use feelings, metaphors, and sensory language. 'The room felt different after that meeting' over 'The meeting ran 40 minutes over.'"
        );
        break;

      case "temperature":
        lines.push(
          norm > 0
            ? strong
              ? "TEMPERATURE: Don't intellectualize feelings. 'This keeps me up at night' hits harder than 'This is challenging.' Let the reader feel what you felt, not just understand what happened."
              : "TEMPERATURE: Show emotion. If something was embarrassing, say 'I was embarrassed.' If it scared you, say that. Vulnerability is your signal — it's what makes people trust you."
            : strong
              ? "TEMPERATURE: Use understatement. 'The presentation didn't go as planned' is more powerful than 'I was mortified.' Restraint signals confidence. Never confess — observe."
              : "TEMPERATURE: Keep professional distance. Let the facts carry emotional weight on their own. Don't name your feelings — describe the situation and let the reader draw conclusions."
        );
        break;

      case "authority":
        lines.push(
          norm > 0
            ? strong
              ? "AUTHORITY: Don't hedge with 'I think' or 'In my opinion' or 'It might be worth...' Just say it. The confidence is the point."
              : "AUTHORITY: Take positions. Say 'We need to cut this' not 'I wonder if this is working.' Use declarative statements. You're not asking permission — you're sharing a conclusion you've earned."
            : strong
              ? "AUTHORITY: Frame insights as discoveries, not verdicts. The reader should feel like they're exploring with you, not being lectured. End with questions more often than conclusions."
              : "AUTHORITY: Invite the reader to think alongside you. Use questions and observations. 'I've noticed...' and 'I wonder if...' instead of declarations."
        );
        break;

      case "rhythm":
        lines.push(
          norm > 0
            ? strong
              ? "RHYTHM: Three words can be a sentence. Use them. Break up any sentence longer than 15 words. White space is your friend. Let each line land before starting the next."
              : "RHYTHM: Short sentences. Fragments are fine. Punch. Then expand for one beat. Then punch again. Vary length but bias toward brevity."
            : strong
              ? "RHYTHM: Sentences should flow like speech — connected, unhurried, with natural pauses created by commas and dashes rather than periods. One idea should lead organically to the next."
              : "RHYTHM: Write in longer, layered sentences that carry the reader through complex ideas. Let clauses build on each other. Avoid staccato fragments."
        );
        break;

      case "framing":
        lines.push(
          norm > 0
            ? strong
              ? "FRAMING: Every post should start with a story — a real moment with sensory detail. The takeaway comes AFTER the scene, never before it. Make the reader feel like they're watching a movie."
              : "FRAMING: Open with a specific scene or moment. 'Last Thursday a client called at 9pm...' Place the reader in a time and place before delivering the insight."
            : strong
              ? "FRAMING: Organize before you narrate. The reader should see the structure in the first two lines. Use headers, numbers, or parallel construction to make the architecture visible."
              : "FRAMING: Open with the takeaway, then structure the supporting evidence. Use frameworks, numbered lists, and clear sections. 'Three things I learned...' over 'I was sitting in the parking lot...'"
        );
        break;

      case "energy":
        lines.push(
          norm > 0
            ? strong
              ? "ENERGY: 'Nobody talks about this enough' energy. Pick a fight with the status quo. Your opening should make at least 20% of readers disagree — that's how you know it's sharp enough."
              : "ENERGY: Be provocative. Challenge conventional wisdom. Start with a bold, slightly uncomfortable claim that makes the reader think 'wait, really?'"
            : strong
              ? "ENERGY: 'Something I've been thinking about...' energy. Don't provoke — invite. The power is in the gentleness. A calm observation that slowly reveals depth hits harder than a hot take."
              : "ENERGY: Be reflective. Start with a quiet observation or a question you've been sitting with. Let the reader lean in rather than recoil."
        );
        break;
    }
  }
  return lines.join("\n");
}
