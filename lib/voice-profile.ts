export interface VoiceSession {
  date: string;
  draftExcerpt: string;
  phrasesKept: string[];
  phrasesReplaced: string[];
  wordFrequency: Record<string, number>;
}

export interface VoiceProfile {
  sessions: VoiceSession[];
}

const STORAGE_KEY = "accent-voice-profile";

export function getVoiceProfile(): VoiceProfile {
  if (typeof window === "undefined") return { sessions: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: [] };
    return JSON.parse(raw) as VoiceProfile;
  } catch {
    return { sessions: [] };
  }
}

export function saveSession(session: VoiceSession): void {
  const profile = getVoiceProfile();
  profile.sessions.push(session);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function getSessionCount(): number {
  return getVoiceProfile().sessions.length;
}

export function getVoiceTier(): "new" | "tentative" | "confident" {
  const count = getSessionCount();
  if (count <= 2) return "new";
  if (count <= 5) return "tentative";
  return "confident";
}

export function getKeptPhrases(): string[] {
  return getVoiceProfile().sessions.flatMap((s) => s.phrasesKept);
}
