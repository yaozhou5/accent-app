export function buildQuickPrompt(
  text: string,
  language: string,
  sessionCount: number
): string {
  const voiceTier =
    sessionCount <= 2 ? "new" : sessionCount <= 5 ? "tentative" : "confident";

  return `You are a writing coach for second-language English writers. The user's UI language is ${language}.

Analyze this draft and return a JSON response. Be encouraging but honest.

Voice calibration: The user has completed ${sessionCount} sessions (tier: ${voiceTier}).
${voiceTier === "new" ? "Focus only on flagging AI-sounding patterns, clichés, filler words, and generic phrases." : ""}
${voiceTier === "tentative" ? "Begin tentatively identifying the user's writing voice patterns." : ""}
${voiceTier === "confident" ? "Confidently identify phrases that reflect the user's unique voice." : ""}

Determine a verdict:
- "great": The writing is genuinely good. No significant issues. Return this for clean, clear, purposeful prose.
- "mostly_good": Minor improvements possible but the writing is solid overall.
- "needs_work": Significant improvements needed in clarity, structure, or natural English expression.

Return ONLY valid JSON in this exact format:
{
  "verdict": "great" | "mostly_good" | "needs_work",
  "rewrite": "improved version of the full text (null if verdict is great)",
  "microLesson": "one brief writing tip relevant to what you found (null if verdict is great)",
  "original": "the original text back",
  "suggestions": ["specific suggestion 1", "specific suggestion 2"]
}

The user's draft:
${text}`;
}

export function buildLearnPrompt(
  text: string,
  language: string,
  sessionCount: number,
  keptPhrases: string[]
): string {
  const voiceTier =
    sessionCount <= 2 ? "new" : sessionCount <= 5 ? "tentative" : "confident";

  return `You are a writing coach for second-language English writers using Learn mode. The user's UI language is ${language}.

Analyze this draft and annotate specific phrases. Be encouraging and educational.

Voice calibration: The user has completed ${sessionCount} sessions (tier: ${voiceTier}).
${voiceTier === "new" ? "Focus only on flagging AI-sounding patterns. Mark genuinely good phrases as 'voice' type sparingly." : ""}
${voiceTier === "tentative" ? `Begin tentatively matching voice patterns. Phrases similar to these previously-kept phrases may be their voice: ${keptPhrases.slice(-20).join(", ")}` : ""}
${voiceTier === "confident" ? `Confidently identify voice. The user tends to keep phrases like: ${keptPhrases.slice(-30).join(", ")}` : ""}

For each notable phrase, classify as:
- "improve": Can be better (coral highlight). Include explanation and 2-3 rewrite options.
- "voice": This is the user's authentic voice (green highlight). Briefly note why it works.

Return ONLY valid JSON in this exact format:
{
  "verdict": "great" | "mostly_good" | "needs_work",
  "annotatedPhrases": [
    {
      "text": "exact phrase from the draft",
      "type": "improve" | "voice",
      "startIndex": 0,
      "endIndex": 10,
      "explanation": "why this phrase was flagged",
      "rewrites": ["option 1", "option 2"]
    }
  ],
  "teachingNotes": "2-3 sentences of overall teaching feedback",
  "practicePrompts": ["prompt 1", "prompt 2"],
  "original": "the original text back"
}

The user's draft:
${text}`;
}

export function buildPracticeCheckPrompt(
  original: string,
  userAttempt: string,
  context: string,
  language: string
): string {
  return `You are a writing coach. The user's UI language is ${language}.

The user was given this original phrase to improve:
"${original}"

Context: ${context}

Their rewrite attempt:
"${userAttempt}"

Evaluate their attempt. Be encouraging. Did they improve it? What's working? Any further suggestions?

Return ONLY valid JSON:
{
  "feedback": "2-3 sentences of specific feedback",
  "isImproved": true or false,
  "suggestions": ["suggestion if needed"]
}`;
}
