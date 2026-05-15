import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ maxRetries: 2 });

export async function POST(request: NextRequest) {
  try {
    const { dump, profile } = await request.json();
    if (!dump?.trim()) return NextResponse.json({ error: "Dump is required" }, { status: 400 });
    if (!profile) return NextResponse.json({ error: "Profile is required" }, { status: 400 });

    // Calculate this week's dates (Mon-Sun)
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split("T")[0];
    });

    const prompt = `You are a content strategist for solo founders. You help them turn what's happening in their business into a weekly content plan.

You will receive:
- The founder's business description and how they explain it
- Their content goals (get users, raise money, find partners, build credibility)
- Their platforms and posting frequency
- What's been hard about posting for them
- This week's dump: a messy brain dump of what's happening in their business

Your job is to turn the dump into a content plan. For each post, provide:
1. Which day to post (spread across the week)
2. Which platform
3. A specific hook (the opening line of the post)
4. 2-3 sentences explaining why this post matters right now and why on this platform
5. A post type tag (origin story, launch moment, founder decision, behind the scenes, user proof, industry take, vulnerability, lesson learned)
6. How it connects to their stated goal

Rules:
- Never suggest announcement-style posts ("Big news! We just..."). Those don't work for founders who aren't famous yet. Always lead with a story, a feeling, a moment, or a tension.
- Make hooks specific to their actual situation, not generic. "We put our app on a billboard. We have 0 users." is good. "Excited to announce our new campaign!" is bad.
- Spread posts across the week. Don't cluster them.
- Match post count to their stated frequency preference.
- Put time-sensitive content (launches, events) earlier in the week. Put evergreen content (origin stories, lessons) later.
- If their goal is "get users", prioritize content that reaches their target audience on the platforms their audience uses.
- If their goal is "raise money", prioritize LinkedIn content that signals traction and vision.
- Be opinionated about sequencing. Explain why this post goes on this day.

This week's dates are: Monday ${weekDates[0]} through Sunday ${weekDates[6]}.

FOUNDER PROFILE:
Business: ${profile.business_description || "Not specified"}
Party pitch: ${profile.party_pitch || "Not specified"}
Goals: ${(profile.goals || []).join(", ") || "Not specified"}
Platforms: ${(profile.platforms || []).join(", ") || "Not specified"}
Posting frequency: ${profile.posting_frequency || "Not specified"} posts per week
Posting challenges: ${profile.posting_challenges || "Not specified"}

${profile.past_posts ? `PAST POSTS BY THIS FOUNDER:
${profile.past_posts}

If past posts are provided, analyze them for: what topics got engagement, what voice/tone the founder naturally uses, what patterns work vs don't. Reference this in your plan. For example, if their personal story posts outperform their announcement posts, lean toward personal stories.
` : ""}THIS WEEK'S DUMP:
${dump}

Respond ONLY with valid JSON matching this structure, no other text:
{
  "strategy_note": "A 1-2 sentence note about this week's plan and why you chose this direction",
  "posts": [
    {
      "day": "Monday",
      "date": "YYYY-MM-DD",
      "platform": "instagram|linkedin|x|threads|tiktok",
      "hook": "The opening line",
      "reasoning": "Why this post, why this day, why this platform",
      "post_type": "origin story|launch moment|founder decision|behind the scenes|user proof|industry take|vulnerability|lesson learned",
      "goal_alignment": "How this connects to their goal"
    }
  ]
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") return NextResponse.json({ error: "Unexpected response" }, { status: 500 });

    let text = content.text.trim();
    if (text.startsWith("```")) text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Failed to parse plan" }, { status: 500 });

    return NextResponse.json(JSON.parse(match[0]));
  } catch (error) {
    console.error("Generate plan error:", error);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}
