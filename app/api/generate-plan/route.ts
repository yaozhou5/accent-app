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

    const prompt = `You are a content strategist for solo founders. You help them turn what's happening in their business into a weekly content plan.

You will receive:
- The founder's business description and how they explain it
- Their content goals (get users, raise money, find partners, build credibility)
- Their platforms and posting frequency
- What's been hard about posting for them
- This week's notes: a collection of things happening in their business
- Optionally: saved inspiration items (links, quotes they've collected)

Your job is to turn the notes into a content plan. For each post, provide:
1. key_takeaway: One sentence. The single idea the reader should remember. Be specific, not generic. Bad: "Consistency matters." Good: "200 signups means nothing if you don't have a product behind the button."
2. structure: An array of 3-4 strings, each one a step in the post's arc. Write them as directions to the founder, not as the actual copy. Example: ["Open with the exact moment you realized something", "Describe what you expected vs what happened", "The lesson — state it plainly", "End with what you're doing differently now"]
3. type: One of personal-story, lesson, behind-the-scenes, listicle, hot-take, social-proof
4. platform: Which platform this is best suited for
5. day: Which day of the week to post
6. date: The actual date (YYYY-MM-DD)

Content type rules:
- Vary the types across the week. Don't make every post a lesson.
- A good week has 2-3 different types.
- Personal stories and behind-the-scenes perform best for solo founders — lean toward those.

Rules:
- Never suggest announcement-style posts ("Big news! We just..."). Those don't work for founders who aren't famous yet. Always lead with a story, a feeling, a moment, or a tension.
- Make key takeaways specific to their actual situation, not generic.
- Spread posts across the week. Don't cluster them.
- Match post count to their stated frequency preference.
- Put time-sensitive content earlier in the week. Put evergreen content later.
- If their goal is "get users", prioritize content that reaches their target audience.
- If their goal is "raise money", prioritize LinkedIn content that signals traction and vision.
- Be opinionated about sequencing.

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

Respond ONLY with valid JSON matching this structure, no other text:
{
  "strategy_note": "A 1-2 sentence note about this week's plan and why you chose this direction",
  "posts": [
    {
      "day": "Monday",
      "date": "YYYY-MM-DD",
      "platform": "instagram|linkedin|x|threads|tiktok",
      "key_takeaway": "The single idea the reader should remember",
      "structure": ["Step 1 direction", "Step 2 direction", "Step 3 direction", "Step 4 direction"],
      "type": "personal-story|lesson|behind-the-scenes|listicle|hot-take|social-proof"
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
