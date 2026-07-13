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
  {
    id: "contrarian-flip",
    name: "The Contrarian Flip",
    tagline: "Challenge what everyone accepts",
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
    description: "Flip the script on a common belief. Show the other side.",
    gridSpan: "span 2 / span 2",
  },
  {
    id: "story-to-lesson",
    name: "The Story-to-Lesson",
    tagline: "From what happened to what it means",
    category: "content",
    sections: [
      { id: "what-happened", label: "What happened", helper: "Set the scene. What were you doing?" },
      { id: "what-you-expected", label: "What you expected", helper: "What did you think would happen?" },
      { id: "what-actually-happened", label: "What actually happened", helper: "The twist. What surprised you?" },
      { id: "what-it-taught-you", label: "What it taught you", helper: "The lesson. One clear insight." },
    ],
    estimateWords: 200,
    bestFor: ["LinkedIn", "Substack", "X"],
    color: "#C4876B",
    textColor: "#ffffff",
  },
  {
    id: "origin-story",
    name: "The Origin Story",
    tagline: "How you got here and why",
    category: "content",
    sections: [
      { id: "before", label: "What you were doing before", helper: "Set the stage. Where were you?" },
      { id: "shift", label: "The moment something shifted", helper: "What happened that changed things?" },
      { id: "what-you-did", label: "What you did about it", helper: "The action you took." },
      { id: "where-you-are", label: "Where you are now", helper: "The current state." },
      { id: "what-you-believe", label: "What you believe because of it", helper: "The conviction that drives you." },
    ],
    estimateWords: 200,
    bestFor: ["LinkedIn", "Substack", "X"],
    color: "#9A8B2E",
    textColor: "#ffffff",
  },
  {
    id: "hot-take",
    name: "The Hot Take",
    tagline: "A strong opinion, held firmly",
    category: "content",
    sections: [
      { id: "the-take", label: "The take", helper: "Your opinion in one sentence." },
      { id: "why-it-matters", label: "Why it matters", helper: "What's at stake?" },
      { id: "the-evidence", label: "The evidence", helper: "What you've seen that backs this up." },
      { id: "the-pushback", label: "The pushback", helper: "What critics would say — and why they're wrong." },
    ],
    estimateWords: 200,
    bestFor: ["LinkedIn", "Substack", "X"],
    color: "#8B3A3A",
    textColor: "#ffffff",
  },
  {
    id: "mistake-i-made",
    name: "The Mistake I Made",
    tagline: "Vulnerability as a teaching tool",
    category: "content",
    sections: [
      { id: "what-i-did", label: "What I did", helper: "The decision you made." },
      { id: "why-i-thought", label: "Why I thought it would work", helper: "The logic that seemed sound at the time." },
      { id: "what-actually-happened", label: "What actually happened", helper: "The reality check." },
      { id: "what-id-do-differently", label: "What I'd do differently", helper: "The lesson, made actionable." },
    ],
    estimateWords: 200,
    bestFor: ["LinkedIn", "Substack", "X"],
    color: "#4A5899",
    textColor: "#ffffff",
  },
  {
    id: "framework",
    name: "The Framework",
    tagline: "Give readers a mental model",
    category: "content",
    sections: [
      { id: "the-problem", label: "The problem", helper: "What people struggle with." },
      { id: "the-framework", label: "The framework", helper: "Your model in 3-4 parts." },
      { id: "how-to-use-it", label: "How to use it", helper: "Walk through applying the framework." },
      { id: "why-it-works", label: "Why it works", helper: "What makes this model effective." },
    ],
    estimateWords: 200,
    bestFor: ["LinkedIn", "Substack", "X"],
    color: "#2D6B5A",
    textColor: "#ffffff",
  },
  {
    id: "listicle-teaches",
    name: "The Listicle That Teaches",
    tagline: "Structured insight, not just a list",
    category: "content",
    sections: [
      { id: "context", label: "Context", helper: "One sentence. What prompted this list?" },
      {
        id: "insights",
        label: "3-5 insights",
        helper: "Each one a full thought, not a bullet. Make each point standalone.",
      },
      { id: "the-thread", label: "The thread", helper: "What connects them all." },
    ],
    estimateWords: 200,
    bestFor: ["LinkedIn", "Substack", "X"],
    color: "#5A6B2D",
    textColor: "#ffffff",
  },
  {
    id: "letter-past-self",
    name: "Letter to Past Self",
    tagline: "Wisdom as time travel",
    category: "content",
    sections: [
      { id: "dear-past-me", label: "Dear past me", helper: "Set the scene. When and where?" },
      { id: "what-you-didnt-know", label: "What you didn't know yet", helper: "The blind spots you had." },
      { id: "what-you-know-now", label: "What you know now", helper: "The hard-won wisdom." },
      { id: "what-hasnt-changed", label: "What hasn't changed", helper: "The constants that still hold." },
    ],
    estimateWords: 200,
    bestFor: ["LinkedIn", "Substack", "X"],
    color: "#8B5A3A",
    textColor: "#ffffff",
  },
  {
    id: "unpopular-opinion",
    name: "The Unpopular Opinion",
    tagline: "Say the quiet part out loud",
    category: "content",
    sections: [
      { id: "the-opinion", label: "The opinion", helper: "State it plainly." },
      { id: "why-people-disagree", label: "Why most people disagree", helper: "The conventional wisdom." },
      { id: "why-you-believe-it", label: "Why you believe it anyway", helper: "Your evidence and experience." },
      { id: "what-would-change", label: "What would change your mind", helper: "Show intellectual honesty." },
    ],
    estimateWords: 200,
    bestFor: ["LinkedIn", "Substack", "X"],
    color: "#6B3A8B",
    textColor: "#ffffff",
  },
];

export function getPlaybook(id: string): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.id === id);
}
