export type WriteMode = "quick" | "teach";

// Unified API response for /api/check
export interface Issue {
  phrase: string;
  fixed_phrase: string;
  title: string;
  revised_sentence: string;
  lesson_title: string;
  lesson_body: string;
  examples: Array<{ bad: string; good: string }>;
}

export interface CheckRequest {
  text: string;
  language: string;
  sessionCount: number;
}

export interface CheckResponse {
  issues: Issue[];
  improved_full: string;
}

// Practice check
export interface PracticeCheckRequest {
  original: string;
  userAttempt: string;
  context: string;
  language: string;
}

export interface PracticeCheckResponse {
  feedback: string;
  isImproved: boolean;
  suggestions: string[];
}
