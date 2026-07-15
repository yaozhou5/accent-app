import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@supabase/ssr";
import { DIMENSION_LABELS, normalizeScore, type DimensionKey, type VoiceProfile } from "@/lib/voice-dimensions";

const resend = new Resend(process.env.RESEND_API_KEY);

function voiceTip(key: DimensionKey, norm: number): string {
  const tips: Record<DimensionKey, { pos: string; neg: string }> = {
    directness: {
      pos: "Lead with your conclusion. Your reader should know your point in the first line — then decide whether to keep reading for the reasoning.",
      neg: "Your contextual style builds trust before making a point. Use it to walk readers through your thinking — but make sure the point lands clearly by the end.",
    },
    precision: {
      pos: "Numbers and specifics are your superpower. When you say '12 deals, up from 7,' the reader trusts you instantly. Keep using concrete proof.",
      neg: "You paint pictures instead of citing spreadsheets. That's memorable — but drop in one sharp number per post to anchor the story.",
    },
    temperature: {
      pos: "You let people in. Vulnerability makes your writing stick. Don't over-edit the honesty out — it's what makes readers feel something.",
      neg: "Your measured tone signals competence. To avoid sounding distant, add one personal moment per piece — just enough warmth to feel human.",
    },
    authority: {
      pos: "You take positions and stand behind them. That's rare and magnetic. Make sure you earn each declaration with evidence or experience.",
      neg: "You invite readers to think with you. That builds genuine engagement. Occasionally, try ending with a clear stance instead of a question.",
    },
    rhythm: {
      pos: "Short punchy sentences hit hard. Vary length occasionally — a longer sentence after three short ones creates emphasis through contrast.",
      neg: "Your flowing prose carries readers through complex ideas smoothly. Break up walls of text with a short sentence for emphasis.",
    },
    framing: {
      pos: "You open with scenes and stories. That's the hardest skill to teach and you have it naturally. Make sure the insight follows the story.",
      neg: "Your structured openings set clear expectations. Try starting one post with a specific moment — even one sentence of scene-setting adds dimension.",
    },
    energy: {
      pos: "You provoke. You challenge. That gets attention. Balance it by delivering on the promise — a bold opening needs substance behind it.",
      neg: "Your reflective tone attracts thoughtful readers. To grow your reach, try one post that starts with a bold, surprising claim.",
    },
  };
  return norm >= 0 ? tips[key].pos : tips[key].neg;
}

function buildEmailHtml(profile: VoiceProfile, magicLink: string): string {
  const dims = profile.dimensions;

  const spectrumRows = (Object.entries(dims) as [DimensionKey, number][])
    .map(([key, raw]) => {
      const norm = normalizeScore(key, raw);
      const labels = DIMENSION_LABELS[key];
      const pct = ((norm + 1) / 2) * 100;
      const leftPct = Math.round(pct);
      const rightPct = 100 - leftPct;
      return `
        <tr>
          <td style="padding: 16px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #6B6860;">${labels.low}</td>
                <td style="font-size: 14px; font-weight: 600; color: #6B6860; text-align: right;">${labels.high}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top: 8px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: #e5e5e5; border-radius: 5px;">
                    <tr>
                      <td width="${leftPct}%" style="height: 10px;"></td>
                      <td width="20" style="height: 10px;">
                        <div style="width: 20px; height: 20px; border-radius: 50%; background: #4A6CF7; margin-top: -5px;"></div>
                      </td>
                      <td width="${rightPct}%" style="height: 10px;"></td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join("");

  const tipRows = (Object.entries(dims) as [DimensionKey, number][])
    .map(([key, raw]) => {
      const norm = normalizeScore(key, raw);
      const labels = DIMENSION_LABELS[key];
      const label = norm >= 0 ? labels.high : labels.low;
      const tip = voiceTip(key, norm);
      return `
        <tr>
          <td style="padding: 8px 0;">
            <div style="background: #ffffff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px 24px;">
              <p style="font-size: 13px; font-weight: 700; color: #4A6CF7; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 8px 0;">${label}</p>
              <p style="font-size: 15px; color: #1A1A18; line-height: 1.6; margin: 0;">${tip}</p>
            </div>
          </td>
        </tr>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #F7F4EF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #F7F4EF; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr><td style="padding: 0 0 32px 0;"><span style="font-size: 24px; font-weight: 400; color: #1A1A18; font-family: Georgia, serif;">accent</span></td></tr>
          <tr><td style="padding: 0 0 8px 0;"><p style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #A8A49C; margin: 0;">Your Voice Profile</p></td></tr>
          <tr><td style="padding: 0 0 32px 0;"><h1 style="font-size: 36px; font-weight: 800; color: #1A1A18; line-height: 1.15; margin: 0;">${profile.top_traits.join(". ")}.</h1></td></tr>
          <tr><td><table width="100%" cellpadding="0" cellspacing="0">${spectrumRows}</table></td></tr>
          <tr>
            <td style="padding: 32px 0 16px 0;">
              <div style="background: #ffffff; border: 1px solid #e5e5e5; border-radius: 16px; padding: 28px 32px;">
                <p style="font-size: 13px; font-weight: 700; color: #4A6CF7; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 12px 0;">Your Edge</p>
                <p style="font-size: 17px; color: #1A1A18; line-height: 1.65; margin: 0;">${profile.edge}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 0 32px 0;">
              <div style="background: #ffffff; border: 1px solid #e5e5e5; border-radius: 16px; padding: 28px 32px;">
                <p style="font-size: 13px; font-weight: 700; color: #D97706; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 12px 0;">Watch Out For</p>
                <p style="font-size: 17px; color: #1A1A18; line-height: 1.65; margin: 0;">${profile.gap}</p>
              </div>
            </td>
          </tr>
          <tr><td style="padding: 0 0 16px 0;"><h2 style="font-size: 24px; font-weight: 800; color: #1A1A18; margin: 0;">Writing tips for your voice</h2></td></tr>
          <tr><td><table width="100%" cellpadding="0" cellspacing="0">${tipRows}</table></td></tr>
          <tr>
            <td style="padding: 32px 0;" align="center">
              <a href="${magicLink}" style="display: inline-block; background: #4A6CF7; color: #ffffff; text-decoration: none; border-radius: 12px; padding: 16px 48px; font-size: 18px; font-weight: 700;">See what you can write</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 0 0 0;" align="center">
              <p style="font-size: 13px; color: #A8A49C; margin: 0;">Clicking the button above creates your free Accent account and logs you in.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 0 0 0; border-top: 1px solid #e5e5e5;" align="center">
              <p style="font-size: 13px; color: #A8A49C; margin: 0;">accent — help every voice grow in the age of AI</p>
              <p style="font-size: 13px; color: #A8A49C; margin: 8px 0 0 0;">myaccent.io</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const { email, voiceProfile } = (await request.json()) as {
      email: string;
      voiceProfile: VoiceProfile;
    };

    if (!email?.trim()) return NextResponse.json({ error: "email required" }, { status: 400 });
    if (!voiceProfile) return NextResponse.json({ error: "voiceProfile required" }, { status: 400 });

    const cleanEmail = email.trim().toLowerCase();

    // Use Supabase service role to generate a magic link
    // This creates the user if they don't exist, and gives us the link token
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: { getAll: () => [], setAll: () => {} },
    });

    // Generate magic link — creates user if needed, returns the link
    const siteUrl = process.env.NODE_ENV === "production" ? "https://myaccent.io" : "http://localhost:3000";

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: cleanEmail,
      options: {
        redirectTo: `${siteUrl}/dashboard`,
      },
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("generateLink error:", linkError);
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    // Build the magic link URL that auto-authenticates on click
    const token = linkData.properties.hashed_token;
    const magicLink = `${siteUrl}/auth/confirm?token_hash=${token}&type=magiclink&redirect_to=${encodeURIComponent(`${siteUrl}/dashboard`)}`;

    // Save voice profile to the user's profile row now (user exists after generateLink)
    const userId = linkData.user?.id;
    if (userId) {
      await supabase.from("profiles").upsert({
        id: userId,
        voice_profile: voiceProfile,
        onboarding_completed: true,
      });
    }

    // Send ONE email via Resend with the magic link embedded
    const { error: emailError } = await resend.emails.send({
      from: "Accent <yao@myaccent.io>",
      to: cleanEmail,
      subject: `Your voice: ${voiceProfile.top_traits.join(". ")}.`,
      html: buildEmailHtml(voiceProfile, magicLink),
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("claim-voice-report error:", error);
    return NextResponse.json({ error: "Failed to send report" }, { status: 500 });
  }
}
