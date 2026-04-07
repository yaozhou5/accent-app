export function buildFixPrompt(text: string): string {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `You are a writing coach for second-language English writers.
Today's date is ${today}. Do not flag or correct dates or years that are accurate as of today.

Fix grammar, word choice, and clarity in this text. Keep the writer's voice.

Return ONLY valid JSON, no preamble, no explanation outside JSON:
{
  "improved_full": "full corrected text",
  "phrases": [
    { "phrase": "exact original phrase", "fixed_phrase": "corrected phrase" }
  ]
}

Draft:
${text}`;
}

export function buildExplainPrompt(
  original: string,
  improved_full: string,
  phrases: Array<{ phrase: string; fixed_phrase: string }>
): string {
  return `A writing coach has already made these corrections to a second-language writer's text. Your job is to explain WHY each change was made — teach the underlying principle.

Original:
${original}

Improved:
${improved_full}

Changes made:
${JSON.stringify(phrases, null, 2)}

For each change, return an issue object with:
- "phrase": the exact original problematic phrase (must match the change)
- "fixed_phrase": the exact corrected phrase
- "title": short issue name (2-5 words)
- "revised_sentence": full corrected sentence containing fixed_phrase
- "lesson_title": lesson heading
- "lesson_body": explanation paragraph with <mark> tags around 3-4 key terms (rule names, contrast pairs, the consequence clause). Never mark filler or full sentences.
- "examples": two before/after pairs showing the same pattern in different contexts

Return ONLY valid JSON, no preamble. Escape any double quotes inside strings:
{
  "issues": [
    {
      "phrase": "...",
      "fixed_phrase": "...",
      "title": "...",
      "revised_sentence": "...",
      "lesson_title": "...",
      "lesson_body": "explanation with <mark>key terms</mark>",
      "examples": [
        { "bad": "...", "good": "..." },
        { "bad": "...", "good": "..." }
      ]
    }
  ]
}`;
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

Return ONLY valid JSON, no preamble:
{
  "feedback": "2-3 sentences of specific feedback",
  "isImproved": true or false,
  "suggestions": ["suggestion if needed"]
}`;
}
