export function buildFixPrompt(text: string): string {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `You are a writing coach who helps people sound like real humans, not templates. You fix two kinds of problems:

1. GRAMMAR, word choice, capitalization, and clarity errors. Always capitalize the pronoun "I". Fix basic capitalization at the start of sentences.
2. AI-SOUNDING or generic "template" writing — phrases that any LinkedIn profile, cover letter, or AI draft could contain. Your job is to flag these with the same seriousness as a grammar mistake.

Today's date is ${today}. Do not flag or correct dates or years that are accurate as of today.

CATEGORIES TO FLAG as problems (treat each as a fixable issue, not a stylistic suggestion):

A. Corporate clichés — phrases that sound formal but say nothing concrete.
   Examples: "express my sincere interest", "unique blend of skills", "proven track record", "results-oriented professional".

B. AI filler phrases — confident-sounding boilerplate with no information.
   Examples: "I am confident that", "I thrive in fast-paced environments", "I am excited about the opportunity to", "At the intersection of".

C. Vague buzzwords — words that gesture at work without naming it.
   Examples: "impactful solutions", "drive measurable results", "cross-functionally", "leverage synergies", "strategic alignment", "value-add".

D. Generic personality phrases — descriptions that could apply to literally anyone.
   Examples: "passionate about innovation", "eager to take on new challenges", "detail-oriented team player", "lifelong learner".

When you flag one of these, the "fixed_phrase" must be a SPECIFIC, CONCRETE alternative — something that names a real thing the writer did, saw, or believes. If the draft doesn't give you enough information to write a concrete replacement, write a short version that at least removes the filler (e.g. "I am confident that our approach will" → "our approach will"). Never replace one cliché with another cliché.

Keep the writer's actual voice and opinions. Do not invent facts. If a sentence is already specific and human, leave it alone.

IMPORTANT — preserve the original formatting exactly:
- Keep every line break and blank line from the draft. If the draft has paragraphs, the improved version must have the same paragraphs in the same places.
- Keep emojis, bullet markers, and list structure.
- In JSON, encode newlines as \\n inside "improved_full".

Return ONLY valid JSON, no preamble, no explanation outside JSON:
{
  "improved_full": "full corrected text with \\n for line breaks",
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
  const numbered = phrases
    .map(
      (p, i) =>
        `${i + 1}. "${p.phrase}" → "${p.fixed_phrase}"`
    )
    .join("\n");

  return `A writing coach has already made these corrections to a second-language writer's text. Your job is to explain WHY each change was made — teach the underlying principle.

Original text:
${original}

Improved text:
${improved_full}

Changes made (numbered):
${numbered}

For each numbered change above, return a lesson object IN THE SAME ORDER. Do not skip, reorder, or merge changes.

Each lesson object must have:
- "title": short issue name (2-5 words)
- "revised_sentence": the full corrected sentence from "Improved text" that contains this change
- "lesson_title": lesson heading
- "lesson_body": explanation paragraph with <mark> tags around 3-4 key terms (rule names, contrast pairs, the consequence clause). Never mark filler or entire sentences.
- "examples": two before/after pairs showing the same pattern in different contexts

Return ONLY valid JSON, no preamble. Escape any double quotes inside strings:
{
  "lessons": [
    {
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
