import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ maxRetries: 2 });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { note, notes, recentNotes, profile, userReply, step, previousAngles } = await request.json();
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

    if (step === "question") {
      // Step 1: Ask one follow-up question
      const questionPrompt = isMultiNote
        ? `You're a content coach for solo founders. A founder selected these ${notes.length} notes to develop together:

${notes.map((n: string, i: number) => `Note ${i + 1}: "${n}"`).join("\n\n")}
${profileContext}
${recentContext}

These notes were chosen together because the founder senses a connection. Ask ONE follow-up question that:
- Points out a specific thread or tension you see connecting these notes
- Helps them see the story that emerges from combining them
- Draws on their profile/goals if available
- Feels like a smart friend saying "wait, I see something here..."

Return ONLY the question. One or two sentences max. Conversational tone.`
        : `You're a content coach for solo founders. A founder just logged this note:

"${note}"
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
      return NextResponse.json({ response: content.type === "text" ? content.text.trim() : null });

    } else if (step === "suggest") {
      // Step 2: Suggest a story angle based on their reply
      const suggestPrompt = isMultiNote
        ? `You're a content coach for solo founders. Here's the conversation so far:

Their ${notes.length} notes:
${notes.map((n: string, i: number) => `Note ${i + 1}: "${n}"`).join("\n")}

Your question was asked, and they replied: "${userReply}"
${profileContext}

These notes together reveal a story. Suggest ONE specific story angle that weaves these notes into a single post. Include:
1. A one-line hook (the opening line of the post)
2. Which platform it fits best (from their platforms: ${(profile?.platforms || []).join(", ") || "LinkedIn"})
3. What content type it is (personal-story, lesson, behind-the-scenes, hot-take)

Format your response as:
HOOK: [the opening line]
PLATFORM: [platform name]
TYPE: [content type]
WHY: [one sentence on why combining these notes makes a stronger story]

Be specific to their situation. No generic advice.${avoidAngles}`
        : `You're a content coach for solo founders. Here's the conversation so far:

Their note: "${note}"
Your question was asked, and they replied: "${userReply}"
${profileContext}

Now suggest ONE specific story angle they could turn into a post. Include:
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
      if (content.type !== "text") return NextResponse.json({ response: null });

      // Parse the structured response
      const text = content.text.trim();
      const hookMatch = text.match(/HOOK:\s*(.+)/i);
      const platformMatch = text.match(/PLATFORM:\s*(.+)/i);
      const typeMatch = text.match(/TYPE:\s*(.+)/i);
      const whyMatch = text.match(/WHY:\s*(.+)/i);

      return NextResponse.json({
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
