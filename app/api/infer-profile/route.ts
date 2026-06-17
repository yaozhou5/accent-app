import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ maxRetries: 2 });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { q1, q2, q3, q4 } = await request.json();
    if (!q1?.trim() || !q2?.trim() || !q3?.trim()) {
      return NextResponse.json({ error: "Answers required" }, { status: 400 });
    }

    const prompt = `You are analyzing onboarding answers from a new user of Accent, a content tool. Your job is to (a) infer their account type and (b) give direction on the post hiding in their recent moment.

Their answers:

Q1 "What are you building or working on, and who's it for?"
"${q1}"

Q2 "What's something that happened with it recently worth sharing?"
"${q2}"

Q3 "What do you want this account to do for you?"
"${q3}"

${q4?.trim() ? `Q4 "What's something you believe about your space that not everyone agrees with?"\n"${q4}"` : "Q4: skipped"}

Return ONLY valid JSON, no preamble:
{
  "inferred_profile": {
    "account_type": "personal" | "creator" | "company" | "unsure",
    "goal": "one short phrase summarizing their main goal",
    "confidence": "high" | "low"
  },
  "direction": "2-3 sentences of editorial direction (see rules below)"
}

Rules for account_type:
- "personal" if they speak as an individual sharing their journey, building in public
- "creator" if they reference an existing audience, followers, or regular posting habit
- "company" if they speak about a product with no personal "I" and no personal-brand intent
- "unsure" if answers are too short or ambiguous. Do NOT guess. Set confidence to "low"

Rules for direction (this is the "Idea" step, NOT a draft):
1. Name what kind of moment this is in one specific phrase — the recognizable theme a reader would relate to (e.g. "this is an activation story," "this is a hard-pivot moment," "this is a customer-truth moment"). Be specific to their content, not a generic label.
2. Point at what would make it a strong post — 1-2 concrete questions or details that are currently missing, drawn from their specific moment. (e.g. "What did seeing 450 feel like before you checked usage? What did you expect that didn't happen?")
3. Invite the next step — frame it as "add a bit more and this becomes a post worth publishing."

CRITICAL — adapt direction to the inferred account_type:
- "personal": you may reference their personal angle, POV, feelings, and how they come across. The moment is about THEM and their journey.
- "creator": do NOT treat them as a beginner or teach them what content is. They know. Point at what made the moment resonate and how to do more of it. Respect their existing voice.
- "company": keep everything neutral and product/customer-focused. Do NOT reference "your voice," "your journey," "how you come across," or any personal narrative. Point at the product angle or customer angle in the moment. Use "the team" or "the product" framing, not "you."
- "unsure": use the MOST NEUTRAL handling. Never invent a personal narrative. A vague answer like "shipped a dashboard update" must produce neutral, modest direction — not a confident personal story. Do not assume there is a person behind the account.

Do NOT write a finished post, a story angle, or a thesis. Give DIRECTION only.
Do NOT paraphrase what they said back to them.
The missing-detail questions must be specific to their actual moment, not generic. If the questions would fit any founder, they've failed.
BANNED clichés: "vanity metrics," "the journey from X to Y," "the harsh reality," "the only number that matters."
Warm and curious in tone, like a smart editor who sees the post hiding in there and wants to draw it out. 2-3 sentences total.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6-20250620",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") return NextResponse.json({ error: "Unexpected response" }, { status: 500 });

    let text = content.text.trim();
    if (text.startsWith("```")) text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Failed to parse" }, { status: 500 });

    return NextResponse.json(JSON.parse(match[0]));
  } catch (error) {
    console.error("Infer profile error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
