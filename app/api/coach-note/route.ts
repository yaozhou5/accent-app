import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ maxRetries: 2 });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { note, notes, recentNotes, profile, step, conversation, previousAngles } = await request.json();
    if (!note?.trim()) return NextResponse.json({ error: "Note required" }, { status: 400 });
    const isMultiNote = Array.isArray(notes) && notes.length > 1;
    const avoidAngles = Array.isArray(previousAngles) && previousAngles.length > 0
      ? `\n\nIMPORTANT: You already suggested these angles. Give a COMPLETELY DIFFERENT angle:\n${previousAngles.map((a: string) => `- "${a}"`).join("\n")}`
      : "";

    const profileContext = profile ? `
About this founder:
- What they do: ${profile.what_you_do || profile.business_description || "Not specified"}
- Building: ${profile.what_you_build || profile.party_pitch || "Not specified"}
- Why they post: ${profile.why_you_post || (profile.goals || []).join(", ") || "Not specified"}
- Platforms: ${(profile.platforms || []).join(", ") || "Not specified"}
- Tone: ${profile.voice_tone || "Not specified"}` : "";

    const recentContext = recentNotes?.length ? `\nTheir recent notes (for context):\n${recentNotes.slice(0, 5).map((n: string) => `- ${n}`).join("\n")}` : "";

    const noteBlock = isMultiNote
      ? `${(notes as string[]).map((n: string, i: number) => `Note ${i + 1}: "${n}"`).join("\n\n")}`
      : `"${note}"`;

    // Build conversation history string
    const convoHistory = Array.isArray(conversation) && conversation.length > 0
      ? conversation.map((m: { role: string; text: string }) =>
          m.role === "ai" ? `You asked: "${m.text}"` : `They replied: "${m.text}"`
        ).join("\n")
      : "";

    if (step === "question") {
      const questionPrompt = isMultiNote
        ? `You're a content coach for solo founders. A founder selected these ${(notes as string[]).length} notes to develop together:

${noteBlock}
${profileContext}
${recentContext}

These notes were chosen together because the founder senses a connection. Ask ONE follow-up question that:
- Points out a specific thread or tension you see connecting these notes
- Helps them see the story that emerges from combining them
- Draws on their profile/goals if available
- Feels like a smart friend saying "wait, I see something here..."

Return ONLY the question. One or two sentences max. Conversational tone.`
        : `You're a content coach for solo founders. A founder just logged this note:

${noteBlock}
${profileContext}
${recentContext}

Ask ONE follow-up question that helps them see why this moment matters for content. The question should:
- Be specific to what they wrote (not generic)
- Draw on their profile/goals if available
- Help them realize there's a story here they haven't seen yet
- Feel like a smart friend asking "wait, tell me more about..."

Return ONLY the question. One or two sentences max. Conversational tone.`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 150,
        messages: [{ role: "user", content: questionPrompt }],
      });

      const content = message.content[0];
      return NextResponse.json({ type: "followup", response: content.type === "text" ? content.text.trim() : null });

    } else if (step === "respond") {
      // Evaluate the user's reply and decide: follow-up or suggest angles
      const respondPrompt = `You're a content coach for solo founders. You read replies the way a good editor reads a draft — not "what content can I make from this" but "is there something real here yet."

The founder's ${isMultiNote ? `${(notes as string[]).length} notes` : "note"}:
${noteBlock}
${profileContext}

Conversation so far:
${convoHistory}

Now evaluate their latest reply (the last "They replied" above) and choose ONE path:

PATH A — LOW-EFFORT REPLY (under ~15 words, vague, "idk", "yeah", "not sure", single-word answers):
Ask a specific follow-up that makes it EASY to answer. Give them something concrete to react to.
Examples: "What specifically caught your eye about this?" or "Was it funny, frustrating, or something else?"

PATH B — SURFACE-LEVEL REPLY (has a real thought but hasn't gone deep enough):
Reflect their idea back and push one layer deeper. Show them the interesting tension in what they said.
Example: "You said AI tools make us feel like our capacity is larger. Is that true, or is it an illusion? That distinction might be the post."

PATH C — SUBSTANTIVE REPLY (personal connection, specific insight, honest admission, real emotion):
Generate a story angle because there's something real to work with.

Respond in EXACTLY one of these formats:

If PATH A or B:
FOLLOWUP: [your question or reflection, 1-3 sentences, conversational]

If PATH C:
HOOK: [one-line opening for the post]
PLATFORM: [best platform from: ${(profile?.platforms || []).join(", ") || "LinkedIn"}]
TYPE: [personal-story, lesson, behind-the-scenes, or hot-take]
WHY: [one sentence on why this angle works]

Choose PATH C only when the material is genuinely strong. Never generate angles from thin material.`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{ role: "user", content: respondPrompt }],
      });

      const content = message.content[0];
      if (content.type !== "text") return NextResponse.json({ type: "followup", response: null });

      const text = content.text.trim();

      // Check if it's a follow-up or a suggestion
      const followupMatch = text.match(/FOLLOWUP:\s*(.+(?:\n.+)*)/i);
      if (followupMatch) {
        return NextResponse.json({ type: "followup", response: followupMatch[1].trim() });
      }

      // Parse as suggestion
      const hookMatch = text.match(/HOOK:\s*(.+)/i);
      const platformMatch = text.match(/PLATFORM:\s*(.+)/i);
      const typeMatch = text.match(/TYPE:\s*(.+)/i);
      const whyMatch = text.match(/WHY:\s*(.+)/i);

      if (hookMatch) {
        return NextResponse.json({
          type: "suggest",
          response: text,
          structured: {
            hook: hookMatch[1]?.trim() || null,
            platform: platformMatch?.[1]?.trim() || null,
            type: typeMatch?.[1]?.trim() || null,
            why: whyMatch?.[1]?.trim() || null,
          }
        });
      }

      // Fallback: treat as follow-up
      return NextResponse.json({ type: "followup", response: text });

    } else if (step === "suggest") {
      // Force generate a story angle (used by "Show another angle")
      const lastReply = Array.isArray(conversation)
        ? (conversation.filter((m: { role: string }) => m.role === "user").pop()?.text || "")
        : "";

      const suggestPrompt = `You're a content coach for solo founders. Here's the full conversation:

The founder's ${isMultiNote ? `${(notes as string[]).length} notes` : "note"}:
${noteBlock}

${convoHistory}
${profileContext}

Generate ONE specific story angle they could turn into a post. Include:
1. A one-line hook (the opening line of the post)
2. Which platform it fits best (from their platforms: ${(profile?.platforms || []).join(", ") || "LinkedIn"})
3. What content type it is (personal-story, lesson, behind-the-scenes, hot-take)

Format your response as:
HOOK: [the opening line]
PLATFORM: [platform name]
TYPE: [content type]
WHY: [one sentence on why this angle works for their audience]

Be specific to their situation. No generic advice.${avoidAngles}`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 250,
        messages: [{ role: "user", content: suggestPrompt }],
      });

      const content = message.content[0];
      if (content.type !== "text") return NextResponse.json({ type: "suggest", response: null });

      const text = content.text.trim();
      const hookMatch = text.match(/HOOK:\s*(.+)/i);
      const platformMatch = text.match(/PLATFORM:\s*(.+)/i);
      const typeMatch = text.match(/TYPE:\s*(.+)/i);
      const whyMatch = text.match(/WHY:\s*(.+)/i);

      return NextResponse.json({
        type: "suggest",
        response: text,
        structured: {
          hook: hookMatch?.[1]?.trim() || null,
          platform: platformMatch?.[1]?.trim() || null,
          type: typeMatch?.[1]?.trim() || null,
          why: whyMatch?.[1]?.trim() || null,
        }
      });
    }

    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  } catch (error) {
    console.error("Coach note error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
