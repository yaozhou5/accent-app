export type WriteMode = "quick" | "teach";

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
  mode: WriteMode;
}

export interface QuickCheckResponse {
  improved_full: string;
  phrases: Array<{ phrase: string; fixed_phrase: string }>;
}

export interface TeachCheckResponse {
  improved_full: string;
  issues: Issue[];
}

export type CheckResponse = QuickCheckResponse | TeachCheckResponse;

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
