import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import type { VoiceProfile } from "@/lib/voice-dimensions";
import { buildVoiceReportEmailHtml } from "@/lib/voice-report-email";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { voiceProfile } = (await request.json()) as {
      voiceProfile: VoiceProfile;
    };

    if (!voiceProfile) return NextResponse.json({ error: "voiceProfile required" }, { status: 400 });

    const { error } = await resend.emails.send({
      from: "Accent <yao@myaccent.io>",
      to: user.email!,
      subject: `Your voice: ${voiceProfile.top_traits.join(". ")}.`,
      html: buildVoiceReportEmailHtml(voiceProfile, {
        dashboardUrl: "https://myaccent.io/dashboard",
        ctaText: "Start logging",
      }),
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("send-voice-report error:", error);
    return NextResponse.json({ error: "Failed to send report" }, { status: 500 });
  }
}
