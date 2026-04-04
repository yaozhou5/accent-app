export type Verdict = "great" | "mostly_good" | "needs_work";
export type WriteMode = "quick" | "learn";

// Quick mode
export interface QuickCheckRequest {
  text: string;
  mode: "quick";
  language: string;
  sessionCount: number;
}

export interface QuickCheckResponse {
  verdict: Verdict;
  rewrite: string | null;
  microLesson: string | null;
  original: string;
  suggestions?: string[];
}

// Learn mode
export interface AnnotatedPhrase {
  text: string;
  type: "improve" | "voice";
  startIndex: number;
  endIndex: number;
  explanation?: string;
  rewrites?: string[];
}

export interface LearnCheckRequest {
  text: string;
  mode: "learn";
  language: string;
  sessionCount: number;
  keptPhrases?: string[];
}

export interface LearnCheckResponse {
  verdict: Verdict;
  annotatedPhrases: AnnotatedPhrase[];
  teachingNotes: string;
  practicePrompts: string[];
  original: string;
}

export type CheckRequest = QuickCheckRequest | LearnCheckRequest;
export type CheckResponse = QuickCheckResponse | LearnCheckResponse;

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
