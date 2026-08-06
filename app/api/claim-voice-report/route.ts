import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@supabase/ssr";
import type { VoiceProfile } from "@/lib/voice-dimensions";
import { buildVoiceReportEmailHtml } from "@/lib/voice-report-email";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Create user account if needed (generateLink creates the user as a side effect)
    const siteUrl = process.env.NODE_ENV === "production" ? "https://myaccent.io" : "http://localhost:3000";

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: cleanEmail,
      options: {
        redirectTo: `${siteUrl}/dashboard`,
      },
    });

    if (linkError) {
      console.error("generateLink error:", linkError);
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    // Save voice profile to the user's profile row now (user exists after generateLink)
    const userId = linkData?.user?.id;
    if (userId) {
      await supabase.from("profiles").upsert({
        id: userId,
        voice_profile: voiceProfile,
        onboarding_completed: true,
      });
    }

    // Send voice results email with a plain dashboard link (not a magic link)
    // Users will sign in normally when they visit — no expiring tokens
    const dashboardUrl = `${siteUrl}/dashboard`;
    const { error: emailError } = await resend.emails.send({
      from: "Accent <yao@myaccent.io>",
      to: cleanEmail,
      subject: `Your voice: ${voiceProfile.top_traits.join(". ")}.`,
      html: buildVoiceReportEmailHtml(voiceProfile, {
        dashboardUrl,
        ctaText: "See what you can write",
        subtext: "Your free Accent account is ready — sign in to get started.",
      }),
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
