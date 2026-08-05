import { describe, test, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockSend = vi.fn();
vi.mock("resend", () => {
  return {
    Resend: class {
      emails = { send: mockSend };
    },
  };
});

const mockGenerateLink = vi.fn();
const mockUpsert = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { admin: { generateLink: mockGenerateLink } },
    from: vi.fn(() => ({ upsert: mockUpsert })),
  })),
}));

// --- Helpers ---

function makeVoiceProfile() {
  return {
    dimensions: {
      directness: 2,
      precision: -1,
      temperature: 1,
      authority: 0,
      rhythm: 1,
      framing: -2,
      energy: -1,
    },
    top_traits: ["Direct", "Warm", "Staccato"],
    edge: "You get to the point fast.",
    gap: "Sometimes too blunt.",
    completed_at: "2026-07-16T00:00:00Z",
  };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/claim-voice-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Tests ---

describe("POST /api/claim-voice-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateLink.mockResolvedValue({
      data: { user: { id: "user-123" }, properties: { hashed_token: "tok_abc" } },
      error: null,
    });
    mockUpsert.mockResolvedValue({ error: null });
    mockSend.mockResolvedValue({ error: null });
  });

  test("returns 400 when email is missing", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ voiceProfile: makeVoiceProfile() }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("email required");
  });

  test("returns 400 when email is empty string", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ email: "  ", voiceProfile: makeVoiceProfile() }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("email required");
  });

  test("returns 400 when voiceProfile is missing", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ email: "test@example.com" }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("voiceProfile required");
  });

  test("lowercases and trims the email", async () => {
    const { POST } = await import("./route");
    await POST(makeRequest({ email: "  Test@Example.COM  ", voiceProfile: makeVoiceProfile() }) as any);
    expect(mockGenerateLink).toHaveBeenCalledWith(expect.objectContaining({ email: "test@example.com" }));
  });

  test("returns 500 when generateLink fails", async () => {
    mockGenerateLink.mockResolvedValue({ data: null, error: new Error("Supabase down") });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ email: "test@example.com", voiceProfile: makeVoiceProfile() }) as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to create account");
  });

  test("upserts voice profile for created user", async () => {
    const profile = makeVoiceProfile();
    const { POST } = await import("./route");
    await POST(makeRequest({ email: "test@example.com", voiceProfile: profile }) as any);
    expect(mockUpsert).toHaveBeenCalledWith({
      id: "user-123",
      voice_profile: profile,
      onboarding_completed: true,
    });
  });

  test("sends email with correct subject from voice traits", async () => {
    const { POST } = await import("./route");
    await POST(makeRequest({ email: "test@example.com", voiceProfile: makeVoiceProfile() }) as any);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: "Your voice: Direct. Warm. Staccato.",
        from: "Accent <yao@myaccent.io>",
      })
    );
  });

  test("email CTA links to plain dashboard URL, not a magic link", async () => {
    const { POST } = await import("./route");
    await POST(makeRequest({ email: "test@example.com", voiceProfile: makeVoiceProfile() }) as any);

    const sentHtml = mockSend.mock.calls[0][0].html as string;

    // The CTA href must be a plain dashboard link
    expect(sentHtml).toContain('href="http://localhost:3000/dashboard"');
    // Must NOT contain any token/magic link parameters
    expect(sentHtml).not.toContain("token_hash");
    expect(sentHtml).not.toContain("type=magiclink");
    expect(sentHtml).not.toContain("auth/confirm");
  });

  test("email contains voice profile content", async () => {
    const { POST } = await import("./route");
    await POST(makeRequest({ email: "test@example.com", voiceProfile: makeVoiceProfile() }) as any);

    const sentHtml = mockSend.mock.calls[0][0].html as string;
    expect(sentHtml).toContain("Your Voice Profile");
    expect(sentHtml).toContain("Direct. Warm. Staccato.");
    expect(sentHtml).toContain("You get to the point fast.");
    expect(sentHtml).toContain("Sometimes too blunt.");
    expect(sentHtml).toContain("See what you can write");
  });

  test("returns 500 when email send fails", async () => {
    mockSend.mockResolvedValue({ error: new Error("Resend down") });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ email: "test@example.com", voiceProfile: makeVoiceProfile() }) as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to send email");
  });

  test("returns success when everything works", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ email: "test@example.com", voiceProfile: makeVoiceProfile() }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(true);
  });
});
