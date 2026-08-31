Accent — Review mode (build spec)
The problem

Accent has one entry point: log a note → generate a draft → edit it. That's a creation flow.

The flow that's missing is review: I already wrote this somewhere else, tell me how it reads. Today that requires logging a note first and then editing a draft I've already written, which makes no sense.

Two consequences:

Anyone who arrives with existing writing has nothing to do. This is a gate, the same shape as the voice quiz removed in late July — and removing that gate took note-logging from ~15% of signups to over 70%.
At article length, the current inline-suggestion UI stops being reviewable. A short post has five suggestions and you read all five. An article has sixty and you read none.
What to build

A Review mode: paste existing text, get a short overall read, then a small number of voice notes separated from grammar.

1. Entry point
   New tab alongside Log / Ideas / Drafts, or a clear secondary action from the dashboard.
   A single paste box. No note required, no draft generation step.
   Accepts up to ~3,000 words. Above that, ask the user to review a section.
2. Output — summary first, markup second

Do not render inline markers on first load. The first screen is a verdict, not a marked-up document.

Overall read — at most three short lines. Where the voice holds, where it drifts, one pointer to the weakest section. Fixed format, not free-form prose. This is what the current Voice Coach fails to give: it writes an essay about the essay.

Voice notes — hard cap at 5. Each anchored to a specific passage, with the passage quoted. If the analysis finds more than 5, return the 5 that matter most; do not surface the rest. The restraint is the product: a tool that returns sixty suggestions is telling the writer their draft is wrong sixty times, and most people respond by accepting everything — which is the flattening Accent exists to prevent.

Grammar — collapsed by default into a single count ("12 grammar fixes"). Expandable. Bulk-accept in one action. Never interleaved with voice notes.

The separation matters because the two have different review economics. Grammar is objective, high-volume, needs no judgement. Voice is subjective, low-volume, and is the only place the writer's attention is worth spending.

3. Interaction
   Click a voice note → scroll to that passage and highlight it. Inline markup appears only for the note being viewed.
   Accept / dismiss per voice note. Dismissals feed the voice profile the same way edits do — dismissing a suggestion is the same signal as changing something back.
   No "rewrite it for me" button. Review is not generation. That's the point of the mode.
4. Out of scope for v1
   Scoring or grading out of 10. A number invites optimisation toward the number.
   Multi-document review, version history, exports.
   Any rewriting of the full text.
   Instrumentation

Add these from the start, and verify each fires in production — draft_saved was scoped to a path nobody used and showed zero events against 44 drafts started.

review_started — with word count as a property
review_completed
voice_note_expanded — which of the 5, by index
voice_note_accepted / voice_note_dismissed
grammar_bulk_accepted
review_failed — with a reason
Error handling

Apply the same pattern just fixed on generate-draft:

Every early return includes a reason in the JSON body.
Every failure path writes to ai_generation_failures, including 401 and 400.
Auth expiry gets its own user-facing message.
Explicit timeout on the Anthropic client.
Why this order

The review flow and the suggestion-density problem are one build, not two. Paste-an-article is precisely the case where a verdict has to come before markup — a summary is the reason someone pastes in the first place.
