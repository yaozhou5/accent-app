import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    // Validate URL to prevent SSRF
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Invalid URL protocol" }, { status: 400 });
    }
    const hostname = parsedUrl.hostname;
    if (
      hostname === "localhost" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("169.254.") ||
      hostname.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      hostname === "[::1]"
    ) {
      return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
    }

    // YouTube/Vimeo: use oEmbed API for reliable metadata
    const ytMatch = hostname.match(/youtube\.com|youtu\.be/);
    if (ytMatch) {
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
          signal: AbortSignal.timeout(5000),
        });
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          return NextResponse.json({
            title: data.title || null,
            description: data.author_name ? `by ${data.author_name}` : null,
            image: data.thumbnail_url || null,
          });
        }
      } catch {}
    }
    if (hostname.match(/vimeo\.com/)) {
      try {
        const oembedRes = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          return NextResponse.json({
            title: data.title || null,
            description: data.author_name ? `by ${data.author_name}` : null,
            image: data.thumbnail_url || null,
          });
        }
      } catch {}
    }

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AccentBot/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json({ title: null, description: null, image: null });

    const html = await res.text();

    const getMetaContent = (property: string): string | null => {
      const patterns = [
        new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"),
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, "i"),
        new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"),
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, "i"),
      ];
      for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) return m[1];
      }
      return null;
    };

    // Title: OG → Twitter → <title> → <h1>
    const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
    const title =
      getMetaContent("og:title") ||
      getMetaContent("twitter:title") ||
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ||
      h1Match?.[1]?.trim() ||
      null;

    // Description: OG → Twitter → meta description → first meaningful <p>
    let description =
      getMetaContent("og:description") ||
      getMetaContent("twitter:description") ||
      getMetaContent("description") ||
      null;
    if (!description) {
      const pMatch = html.match(/<p[^>]*>([^<]{30,})<\/p>/i);
      if (pMatch?.[1]) description = pMatch[1].trim().slice(0, 200);
    }

    const image = getMetaContent("og:image") || getMetaContent("twitter:image") || null;

    return NextResponse.json({ title, description, image });
  } catch {
    return NextResponse.json({ title: null, description: null, image: null });
  }
}
