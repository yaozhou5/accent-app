import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ maxRetries: 2 });

export async function POST(request: NextRequest) {
  try {
    const { dump, entries, shelfItems, profile } = await request.json();
    if (!profile) return NextResponse.json({ error: "Profile is required" }, { status: 400 });

    // Support both: single dump string or array of tagged entries
    let dumpText: string;
    if (entries && Array.isArray(entries) && entries.length > 0) {
      dumpText = "This week's notes:\n" + entries.map((e: { content: string; tags?: string[]; image_url?: string; link_url?: string; url?: string; type?: string; source?: string }) => {
        const parts: string[] = [];
        parts.push(`[${(e.tags || []).join(", ")}]`);
        if (e.type === "quote") parts.push(`(saved quote${e.source ? ` from: ${e.source}` : ""})`);
        if (e.type === "link" && e.url) parts.push(`[link: ${e.url}]`);
        if (e.content) parts.push(e.content);
        if (e.image_url) parts.push("[image attached: user uploaded a photo]");
        if (e.link_url && e.type !== "link") parts.push(`[link: ${e.link_url}]`);
        return `- ${parts.join(" ")}`;
      }).join("\n");
    } else if (dump?.trim()) {
      dumpText = dump.trim();
    } else {
      return NextResponse.json({ error: "Dump or entries required" }, { status: 400 });
    }

    // Calculate this week's dates (Mon-Sun)
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    if (day >= 4 || day === 0) monday.setDate(monday.getDate() + 7);
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split("T")[0];
    });

    // Build shelf/inspiration context
    let shelfContext = "";
    if (shelfItems && Array.isArray(shelfItems) && shelfItems.length > 0) {
      shelfContext = `\nThe founder has saved these items for inspiration recently:\n${shelfItems.map((item: { content?: string; url?: string; source?: string; type?: string }) => {
        if (item.type === "link") return `- [link] ${item.url || ""} ${item.content || ""}`;
        if (item.type === "quote") return `- [quote${item.source ? ` from ${item.source}` : ""}] "${item.content || ""}"`;
        return `- ${item.content || ""}`;
      }).join("\n")}\n\nWhen relevant, suggest post ideas that riff on or respond to these saved items. Don't force it — only reference them if they naturally connect to the founder's current situation and goals.\n`;
    }

    const prompt = `You are a content strategist for solo founders. You turn their week into a content plan.

For each post, return EXACTLY these fields:
- day: The day of the week (e.g. "Monday")
- date: The date in YYYY-MM-DD format
- platform: One of instagram, linkedin, x, threads, tiktok
- type: ONLY one of these 6 types: personal-story, lesson, behind-the-scenes, listicle, hot-take, social-proof. No other types allowed.
- key_takeaway: The ONE insight the reader walks away with. This is NOT a hook or headline. It's a complete thought. Bad: "A founder ghosted me mid-conversation yesterday" (that's a hook). Good: "Getting ghosted usually means your pitch didn't show clear value — it's rarely personal." The takeaway should be something the reader can apply to their own life.
- structure: An array of exactly 3-4 strings. Each is a direction to the founder for writing the post. Be specific to their situation. Example: ["Open with the exact moment — the call that went silent", "What you assumed (they hate me) vs the reality (your pitch was unclear)", "The lesson: ghosting is feedback on your offer, not your worth", "What you changed in your next pitch"]

DO NOT include: hook, reasoning, why_this_post, goal_alignment, or any other fields. Only the 6 fields above.

Content type rules:
- ONLY use: personal-story, lesson, behind-the-scenes, listicle, hot-take, social-proof
- Never use "vulnerability", "origin story", "launch moment", "founder decision", "user proof", or any other type
- Vary types across the week. A good week has 2-3 different types
- Personal stories and behind-the-scenes perform best for solo founders — lean toward those

Rules:
- Never suggest announcement-style posts. Lead with a story, a feeling, a moment, or a tension.
- Key takeaways must be insights, not headlines. Complete thoughts the reader can use.
- Structure steps must reference the founder's specific situation, not generic templates.
- Spread posts across the week. Match post count to their frequency preference.
- Put time-sensitive content earlier. Evergreen content later.

This week's dates are: Monday ${weekDates[0]} through Sunday ${weekDates[6]}.

FOUNDER PROFILE:
Business: ${profile.business_description || "Not specified"}
Party pitch: ${profile.party_pitch || "Not specified"}
Goals: ${(profile.goals || []).join(", ") || "Not specified"}
Platforms: ${(profile.platforms || []).join(", ") || "Not specified"}
Posting frequency: ${profile.posting_frequency || "Not specified"} posts per week
Posting challenges: ${profile.posting_challenges || "Not specified"}
Posting experience: ${profile.posting_experience || "Not specified"}
${(profile.posts_that_work || []).length > 0 ? `Posts that work for them: ${profile.posts_that_work.join(", ")}` : ""}
${(profile.posts_that_flop || []).length > 0 ? `Posts that don't work: ${profile.posts_that_flop.join(", ")}` : ""}
${profile.voice_tone ? `Their natural tone: ${profile.voice_tone}` : ""}

If the user says certain post types work and others flop, never suggest the types that flop. Lean into what already works. If they say they haven't found what works yet, mix different post types so they can discover what resonates. Match their stated tone.

${profile.past_posts ? `PAST POSTS BY THIS FOUNDER:\n${profile.past_posts}\n\nAnalyze these for: what topics got engagement, what voice/tone the founder naturally uses, what patterns work vs don't. Reference this in your plan.\n` : ""}${shelfContext}${dumpText}

Respond ONLY with valid JSON, no other text:
{
  "strategy_note": "1-2 sentences on this week's direction",
  "posts": [
    {
      "day": "Monday",
      "date": "2026-05-19",
      "platform": "linkedin",
      "type": "personal-story",
      "key_takeaway": "Getting ghosted usually means your pitch didn't show clear value — it's rarely personal",
      "structure": [
        "Open with the exact moment — the call that went silent",
        "What you assumed (they hate me) vs the reality (your pitch was unclear)",
        "The lesson: ghosting is feedback on your offer, not your worth",
        "What you changed in your next pitch"
      ]
    }
  ]
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
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
