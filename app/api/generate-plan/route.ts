import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ maxRetries: 2 });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { dump, entries, shelfItems, profile, moreIdeas, entryCount: rawEntryCount } = await request.json();
    if (!profile) return NextResponse.json({ error: "Profile is required" }, { status: 400 });
    const entryCount = rawEntryCount || entries?.length || 0;
    const maxPosts = entryCount < 3 ? 3 : entryCount <= 5 ? 5 : 7;
    if (typeof dump === "string" && dump.length > 50000)
      return NextResponse.json({ error: "Input too long" }, { status: 400 });

    // Support both: single dump string or array of tagged entries
    // Fetch OG titles for link entries
    async function getOgTitle(url: string): Promise<string | null> {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; AccentBot/1.0)" },
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) return null;
        const html = await res.text().then((t) => t.slice(0, 20000));
        const ogMatch =
          html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) ||
          html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i);
        if (ogMatch?.[1]) return ogMatch[1];
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        return titleMatch?.[1]?.trim() || null;
      } catch {
        return null;
      }
    }

    let dumpText: string;
    if (entries && Array.isArray(entries) && entries.length > 0) {
      // Fetch OG titles for link entries in parallel
      const linkUrls = entries
        .filter((e: { type?: string; url?: string }) => e.type === "link" && e.url)
        .map((e: { url?: string }) => e.url as string);
      const ogTitles: Record<string, string> = {};
      if (linkUrls.length > 0) {
        const results = await Promise.all(
          linkUrls.slice(0, 5).map(async (url) => ({ url, title: await getOgTitle(url) }))
        );
        for (const r of results) {
          if (r.title) ogTitles[r.url] = r.title;
        }
      }

      dumpText =
        "This week's notes:\n" +
        entries
          .map(
            (e: {
              content: string;
              tags?: string[];
              image_url?: string;
              link_url?: string;
              url?: string;
              type?: string;
              source?: string;
            }) => {
              const parts: string[] = [];
              parts.push(`[${(e.tags || []).join(", ")}]`);
              if (e.type === "quote") parts.push(`(saved quote${e.source ? ` from: ${e.source}` : ""})`);
              if (e.type === "link" && e.url) {
                const title = ogTitles[e.url];
                parts.push(title ? `[link: "${title}" — ${e.url}]` : `[link: ${e.url}]`);
              }
              if (e.content) parts.push(e.content);
              if (e.image_url) parts.push("[image attached: user uploaded a photo]");
              if (e.link_url && e.type !== "link") parts.push(`[link: ${e.link_url}]`);
              return `- ${parts.join(" ")}`;
            }
          )
          .join("\n");
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
      shelfContext = `\nThe founder has saved these items for inspiration recently:\n${shelfItems
        .map((item: { content?: string; url?: string; source?: string; type?: string }) => {
          if (item.type === "link") return `- [link] ${item.url || ""} ${item.content || ""}`;
          if (item.type === "quote")
            return `- [quote${item.source ? ` from ${item.source}` : ""}] "${item.content || ""}"`;
          return `- ${item.content || ""}`;
        })
        .join(
          "\n"
        )}\n\nWhen relevant, suggest post ideas that riff on or respond to these saved items. Don't force it — only reference them if they naturally connect to the founder's current situation and goals.\n`;
    }

    const prompt = `You are a smart friend who reads a founder's weekly notes and tells them what to post about. Not a content strategist. A friend with good taste.

For each post idea, return EXACTLY these fields:
- day: Day of the week (e.g. "Monday")
- date: Date in YYYY-MM-DD format
- platform: One of linkedin, x, substack, xiaohongshu, threads
- type: One of: personal-story, lesson, behind-the-scenes, listicle, hot-take, social-proof
- prompt: A one-line nudge that helps the founder see their log entry as a post. Write it like a friend texting them. Examples:
  - "You said you don't have time to post — what if that's the post?"
  - "That investor rejection stings but founders eat that story up. Write the email you wish you'd sent back."
  - "8 people at your community call. Most founders can't get 2. That's your LinkedIn post."
  - "You rewrote onboarding from 40 min to 8 min. The before/after is the content."
- source_snippet: A short quote from their actual log entry that inspired this idea. Copy their exact words, max 1-2 sentences. This shows the founder which note became which post idea. For link entries, use the link title (e.g. "Why AI writing tools fail non-native speakers") NOT the raw URL. If a link has a title in quotes, use that title.

DO NOT include: hook, reasoning, structure, key_takeaway, goal_alignment, or any other fields.

Rules:
- The prompt should feel like a text from a friend, not a content brief
- Be specific. Reference their actual words and situation.
- EVERY idea MUST trace back to a specific log entry. The source_snippet MUST be a direct quote from one of their notes. NEVER generate an orphan idea with no source. If there are only 2 notes, generate only 2 ideas.
- Generate AT MOST ${maxPosts} ideas, but FEWER if the notes don't support that many. Quality over quantity. If you can only find 2 good angles from the notes, return 2.
- Each idea MUST be genuinely different: different angle, different content type, different platform if possible. If two ideas would reference the same source, they must explore completely different aspects. If you can't find a genuinely different angle, don't force it — return fewer ideas.
- NEVER generate generic filler like "share a lesson" or "what did you change your mind about" — every idea must come from something specific they wrote.
- Vary content types. Personal stories and behind-the-scenes work best for solo founders.
- Spread across the week. Time-sensitive stuff earlier.

This week's dates are: Monday ${weekDates[0]} through Sunday ${weekDates[6]}.

FOUNDER PROFILE:
What they do: ${profile.what_you_do || profile.business_description || "Not specified"}
What they're building: ${profile.what_you_build || profile.party_pitch || "Not specified"}
Why they post: ${profile.why_you_post || (profile.goals || []).join(", ") || "Not specified"}
Platforms: ${(profile.platforms || []).join(", ") || "Not specified"}
Posting frequency: ${profile.posting_frequency || "Not specified"}
Posting challenges: ${profile.posting_challenges || "Not specified"}
Posting experience: ${profile.posting_experience || "Not specified"}
${(profile.posts_that_work || []).length > 0 ? `Posts that work for them: ${profile.posts_that_work.join(", ")}` : ""}
${(profile.posts_that_flop || []).length > 0 ? `Posts that don't work: ${profile.posts_that_flop.join(", ")}` : ""}
${profile.voice_tone ? `Their natural tone: ${profile.voice_tone}` : ""}

If the user says certain post types work and others flop, never suggest the types that flop. Lean into what already works. If they say they haven't found what works yet, mix different post types so they can discover what resonates. Match their stated tone.

${profile.past_posts ? `PAST POSTS BY THIS FOUNDER:\n${profile.past_posts}\n\nAnalyze these for: what topics got engagement, what voice/tone the founder naturally uses, what patterns work vs don't. Reference this in your plan.\n` : ""}${shelfContext}${dumpText}
${moreIdeas ? `\nIMPORTANT: Generate exactly ${moreIdeas.count} MORE content ideas. Do NOT repeat or rephrase these existing ideas:\n${(moreIdeas.exclude as string[]).map((p: string) => `- "${p}"`).join("\n")}\n\nFind completely different angles from the same material. Look for moments or details you haven't used yet.` : ""}

Respond ONLY with valid JSON, no other text:
{
  "strategy_note": "1-2 sentences on this week's vibe",
  "posts": [
    {
      "day": "Monday",
      "date": "2026-05-19",
      "platform": "linkedin",
      "type": "personal-story",
      "prompt": "You said you don't have time to post — what if that's the post?",
      "source_snippet": "i don't have time to post anything this week"
    }
  ]
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
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
