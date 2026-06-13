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

    const prompt = `You are analyzing onboarding answers from a new user of Accent, a content tool. Your job is to (a) infer their account type and (b) surface the story angle hiding in their recent moment.

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
  "story": "1-2 sentence story ANGLE from their Q2 answer — the insight or tension in their moment"
}

Rules for account_type:
- "personal" if they speak as an individual sharing their journey, building in public
- "creator" if they reference an existing audience, followers, or regular posting habit
- "company" if they speak about a product with no personal "I" and no personal-brand intent
- "unsure" if answers are too short or ambiguous. Do NOT guess. Set confidence to "low"

Rules for story:
- Surface the angle hiding in their Q2 moment. What's the insight, tension, or surprise?
- Output ONLY the angle (1-2 sentences). Never write a finished or draft post.
- Be specific to their actual moment. Generic observations like "there's a story about growth here" are failures.
- If account_type is "unsure", the story must stay neutral and not assume there is a person behind the account.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
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
