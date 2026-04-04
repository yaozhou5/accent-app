export type ShelfCategory = "precision" | "rhythm" | "voice" | "structure";

export interface ShelfPassage {
  id: string;
  author: string;
  excerpt: string;
  category: ShelfCategory;
  craftLesson: string;
  writingPrompt: string;
}

export const shelfPassages: ShelfPassage[] = [
  // Precision
  {
    id: "hemingway-1",
    author: "Ernest Hemingway",
    excerpt:
      "He was an old man who fished alone in a skiff in the Gulf Stream and he had gone eighty-four days now without taking a fish.",
    category: "precision",
    craftLesson:
      "Hemingway loads a single sentence with specific, concrete details \u2014 alone, skiff, Gulf Stream, eighty-four days. Every word carries weight. No adjective is decorative; each one narrows the picture.",
    writingPrompt:
      "Write a single sentence that introduces a character through specific details about what they do. No adjectives that don\u2019t earn their place.",
  },
  {
    id: "hemingway-2",
    author: "Ernest Hemingway",
    excerpt:
      "The world breaks everyone and afterward many are strong at the broken places.",
    category: "precision",
    craftLesson:
      "Precision isn\u2019t just about physical details. Here Hemingway states a large truth in plain, exact language. \u2018Breaks\u2019 and \u2018broken places\u2019 do double duty as literal and metaphorical.",
    writingPrompt:
      "Write one sentence that captures a big truth using only plain, concrete words. No abstractions.",
  },
  {
    id: "pg-1",
    author: "Paul Graham",
    excerpt:
      "Write like you talk. Here\u2019s a simple trick for getting it: after you finish writing something, read it out loud and fix anything that sounds wrong.",
    category: "precision",
    craftLesson:
      "Graham\u2019s power is in actionable precision. He doesn\u2019t say \u2018be natural\u2019 \u2014 he gives you a specific test you can apply. Good nonfiction makes the reader feel they can act immediately.",
    writingPrompt:
      "Explain a skill you have in two sentences. First, the principle. Then, one specific action the reader can take right now.",
  },
  // Rhythm
  {
    id: "didion-1",
    author: "Joan Didion",
    excerpt:
      "We tell ourselves stories in order to live. The princess is caged in the consulate. The man with the candy will lead the children into the sea.",
    category: "rhythm",
    craftLesson:
      "Didion opens with a short declaration, then illustrates it with images that accelerate. The rhythm shifts from thesis to proof, from abstract to concrete. Each sentence gets more specific and more unsettling.",
    writingPrompt:
      "Write three sentences: the first states something you believe, the next two illustrate it with increasingly vivid images.",
  },
  {
    id: "vuong-1",
    author: "Ocean Vuong",
    excerpt:
      "The most beautiful part of your body is where it\u2019s headed. & remember, the body is not a grave, it is a map.",
    category: "rhythm",
    craftLesson:
      "Vuong uses rhythm to create surprise. \u2018Where it\u2019s headed\u2019 subverts our expectation of a body part. The ampersand creates a breath, a pause, then the reversal: not a grave, a map. Rhythm here is inseparable from meaning.",
    writingPrompt:
      "Write two sentences about the body or a physical object. Use the second sentence to overturn what the first one seemed to mean.",
  },
  {
    id: "vonnegut-1",
    author: "Kurt Vonnegut",
    excerpt: "And so it goes.",
    category: "rhythm",
    craftLesson:
      "Three words that carry the weight of every death in Slaughterhouse-Five. A refrain works by accumulation \u2014 the first time it\u2019s nothing, but after fifty repetitions it contains everything. Rhythm can be a structural tool, not just a sentence-level one.",
    writingPrompt:
      "Write a short paragraph about a recurring event. End with the same short phrase each time something happens. Make the phrase gain weight.",
  },
  // Voice
  {
    id: "didion-2",
    author: "Joan Didion",
    excerpt:
      "I write entirely to find out what I\u2019m thinking, what I\u2019m looking at, what I see and what it means. What I want and what I fear.",
    category: "voice",
    craftLesson:
      "Voice emerges when a writer stops performing and starts thinking on the page. Didion\u2019s repetition of \u2018what I\u2019 isn\u2019t stylistic decoration \u2014 it\u2019s the actual process of a mind sorting itself out. Authenticity reads as voice.",
    writingPrompt:
      "Complete this sentence five different ways: \u2018I write because...\u2019 Don\u2019t plan them \u2014 write fast, and let each one surprise you.",
  },
  {
    id: "vonnegut-2",
    author: "Kurt Vonnegut",
    excerpt:
      "Here is a lesson in creative writing. First rule: Do not use semicolons. They are transvestite hermaphrodites representing absolutely nothing. All they do is show you\u2019ve been to college.",
    category: "voice",
    craftLesson:
      "Vonnegut\u2019s voice comes from irreverence combined with conviction. He states opinions as facts, escalates to absurdity, then lands on a sharp social observation. Voice isn\u2019t about being funny \u2014 it\u2019s about being unafraid to sound like yourself.",
    writingPrompt:
      "Write a strong opinion about a small thing (a punctuation mark, a food, a daily habit). State it as fact. Escalate. Then land on why it actually matters.",
  },
  {
    id: "vuong-2",
    author: "Ocean Vuong",
    excerpt:
      "Let me begin again. Dear Ma, I am writing to reach you \u2014 even if each word I put down is one word further from where you are.",
    category: "voice",
    craftLesson:
      "Vuong\u2019s voice is intimate and contradictory. \u2018Writing to reach you\u2019 and \u2018one word further from where you are\u2019 exist in tension. A distinctive voice often lives in the gap between what the writer wants and what language can do.",
    writingPrompt:
      "Write a short letter (3-4 sentences) to someone you can\u2019t reach. Let the act of writing be part of what you write about.",
  },
  // Structure
  {
    id: "pg-2",
    author: "Paul Graham",
    excerpt:
      "The way to get startup ideas is not to try to think of startup ideas. It\u2019s to look for problems, preferably problems you have yourself.",
    category: "structure",
    craftLesson:
      "Graham structures arguments by negation: he tells you what NOT to do first, then pivots to what works. This creates a satisfying reversal. The reader feels their assumption overturned, making the real advice land harder.",
    writingPrompt:
      "Write two sentences about how to do something. First sentence: the common approach that\u2019s wrong. Second: what actually works.",
  },
  {
    id: "hemingway-3",
    author: "Ernest Hemingway",
    excerpt:
      "If a writer of prose knows enough of what he is writing about he may omit things that he knows and the reader, if the writer is writing truly enough, will have a feeling of those things as strongly as though the writer had stated them.",
    category: "structure",
    craftLesson:
      "Hemingway\u2019s iceberg theory: structure is as much about what you leave out as what you include. The sentence itself demonstrates the principle \u2014 it\u2019s one long, winding thought that leaves you to fill in the specific examples.",
    writingPrompt:
      "Describe a scene where something important has just happened \u2014 but don\u2019t say what it was. Let the reader feel it through details alone.",
  },
  {
    id: "pg-3",
    author: "Paul Graham",
    excerpt:
      "The best essays are not about a topic. They\u2019re about a surprise \u2014 something the writer figured out while writing.",
    category: "structure",
    craftLesson:
      "Graham reveals that structure can be emergent. The essay isn\u2019t a container for pre-formed ideas \u2014 it\u2019s a vehicle for discovering them. This reframes structure as exploration rather than architecture.",
    writingPrompt:
      "Start writing about something you think you understand. After three sentences, write something that surprises you. Follow that surprise.",
  },
];
