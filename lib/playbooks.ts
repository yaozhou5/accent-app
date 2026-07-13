// lib/playbooks.ts

export interface PlaybookSection {
  id: string;
  label: string;
  helper: string;
}

export interface Playbook {
  id: string;
  name: string;
  tagline: string;
  category: "content" | "email";
  sections: PlaybookSection[];
  estimateWords: number;
  bestFor: string[];
  color: string;
  textColor: string;
  description?: string;
  gridSpan?: string; // CSS grid-column / grid-row shorthand
}

export const PLAYBOOKS: Playbook[] = [
  // 01 — Hero card
  {
    id: "build-log",
    name: "The Build Log",
    tagline: "What you made this week. Process over polish.",
    category: "content",
    sections: [
      { id: "what-you-worked-on", label: "What you worked on", helper: "What did you build, ship, or fix?" },
      { id: "one-decision", label: "One decision you made", helper: "A choice that shaped the work." },
      { id: "why", label: "Why", helper: "What drove that decision?" },
      { id: "whats-next", label: "What's next", helper: "What are you tackling next?" },
    ],
    estimateWords: 100,
    bestFor: ["X", "LinkedIn", "小红书"],
    color: "#E8DCC8",
    textColor: "#1a1a1a",
    description: "What you made this week. Process over polish.",
    gridSpan: "span 2 / span 2",
  },
  // 02
  {
    id: "story-to-lesson",
    name: "The Story-to-Lesson",
    tagline: "Something happened. What it taught you.",
    category: "content",
    sections: [
      { id: "what-happened", label: "What happened", helper: "Set the scene. What were you doing?" },
      { id: "what-you-expected", label: "What you expected", helper: "What did you think would happen?" },
      { id: "what-actually-happened", label: "What actually happened", helper: "The twist. What surprised you?" },
      { id: "what-it-taught-you", label: "What it taught you", helper: "The lesson. One clear insight." },
    ],
    estimateWords: 250,
    bestFor: ["LinkedIn", "Substack", "小红书"],
    color: "#C4876B",
    textColor: "#ffffff",
    gridSpan: "span 2 / span 1",
  },
  // 03
  {
    id: "list-takeaway",
    name: "The List Takeaway",
    tagline: "Your sharpest points, distilled.",
    category: "content",
    sections: [
      { id: "context", label: "Context", helper: "One sentence. What prompted this list?" },
      {
        id: "points",
        label: "3-5 points",
        helper: "Each one a full thought, not a bullet. Make each point standalone.",
      },
      { id: "why-it-matters", label: "Why this matters", helper: "Tie it together. What should the reader take away?" },
    ],
    estimateWords: 200,
    bestFor: ["LinkedIn", "X", "newsletter"],
    color: "#4A5899",
    textColor: "#ffffff",
  },
  // 04
  {
    id: "contrarian-flip",
    name: "The Contrarian Flip",
    tagline: "Challenge what everyone accepts.",
    category: "content",
    sections: [
      { id: "bold-claim", label: "Bold claim", helper: "What do most people get wrong? One sentence." },
      {
        id: "why-they-think-that",
        label: "Why they think that",
        helper: "What's the common logic? Why does it seem right?",
      },
      {
        id: "what-youve-seen",
        label: "What you've seen instead",
        helper: "What does the reality look like from where you stand?",
      },
      { id: "takeaway", label: "One-line takeaway", helper: "Land it. One sentence." },
    ],
    estimateWords: 200,
    bestFor: ["LinkedIn", "Substack", "X"],
    color: "#141414",
    textColor: "#ffffff",
  },
  // 05
  {
    id: "insider-truth",
    name: "The Insider Truth",
    tagline: "What your industry won't say.",
    category: "content",
    sections: [
      { id: "what-people-hear", label: "What people hear", helper: "The public narrative. What's the common belief?" },
      { id: "what-actually-happens", label: "What actually happens", helper: "The reality from the inside." },
      { id: "why-the-gap", label: "Why the gap exists", helper: "Why does this disconnect persist?" },
      { id: "what-to-do", label: "What to do about it", helper: "Practical advice for the reader." },
    ],
    estimateWords: 200,
    bestFor: ["LinkedIn", "X", "Substack"],
    color: "#2D3A3A",
    textColor: "#ffffff",
  },
  // 06
  {
    id: "origin-story",
    name: "The Origin Story",
    tagline: "How you got here and why.",
    category: "content",
    sections: [
      { id: "before", label: "What you were doing before", helper: "Set the stage. Where were you?" },
      { id: "shift", label: "The moment something shifted", helper: "What happened that changed things?" },
      { id: "what-you-did", label: "What you did about it", helper: "The action you took." },
      { id: "where-you-are", label: "Where you are now", helper: "The current state." },
      { id: "what-you-believe", label: "What you believe because of it", helper: "The conviction that drives you." },
    ],
    estimateWords: 400,
    bestFor: ["Substack", "LinkedIn", "About page"],
    color: "#B08D2E",
    textColor: "#ffffff",
    gridSpan: "span 2 / span 1",
  },
  // 07
  {
    id: "cold-intro",
    name: "The Cold Intro",
    tagline: "Reach out to someone new.",
    category: "email",
    sections: [
      { id: "why-writing", label: "Why you're writing", helper: "One sentence. Get to the point." },
      { id: "what-you-noticed", label: "What you noticed about their work", helper: "Show you've done your homework." },
      { id: "what-youre-building", label: "What you're building", helper: "One sentence. No pitch deck." },
      { id: "the-ask", label: "The ask", helper: "Specific and small. Easy to say yes to." },
    ],
    estimateWords: 80,
    bestFor: [],
    color: "#F0EDE6",
    textColor: "#1a1a1a",
  },
  // 08
  {
    id: "follow-up",
    name: "The Follow-up",
    tagline: "Nudge without being annoying.",
    category: "email",
    sections: [
      { id: "reference", label: "Reference the original message", helper: "Remind them what you sent." },
      { id: "new-thing", label: "Add one new thing", helper: "Progress, insight, or reason to reply now." },
      { id: "restate-ask", label: "Restate the ask", helper: "Same ask, fresh framing." },
    ],
    estimateWords: 50,
    bestFor: [],
    color: "#E6E2DA",
    textColor: "#1a1a1a",
  },
  // 09
  {
    id: "polite-push",
    name: "The Polite Push",
    tagline: "Be direct without being demanding.",
    category: "email",
    sections: [
      { id: "context", label: "Context", helper: "What was agreed?" },
      { id: "where-things-stand", label: "Where things stand", helper: "Current status." },
      { id: "what-you-need", label: "What you need", helper: "Be specific." },
      { id: "by-when", label: "By when", helper: "Give a deadline." },
    ],
    estimateWords: 60,
    bestFor: [],
    color: "#D4CDC2",
    textColor: "#1a1a1a",
    gridSpan: "span 2 / span 1",
  },
];

export function getPlaybook(id: string): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.id === id);
}
