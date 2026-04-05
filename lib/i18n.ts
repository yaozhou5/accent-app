export type Locale = "en" | "zh" | "nl";

// Flip to true when ready to support multiple languages
export const SHOW_LANGUAGE_SELECTOR = false;

export const localeNames: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  nl: "Nederlands",
};

const translations = {
  en: {
    appName: "Accent",
    write: "Write",
    shelf: "Shelf",
    quick: "Quick",
    learn: "Learn",
    checkButton: "Check my writing",
    placeholder: "Paste your draft here...",
    precision: "Precision",
    rhythm: "Rhythm",
    voice: "Voice",
    structure: "Structure",
    tryIt: "Try it",
    submit: "Submit",
    tryWritingIt: "Try writing it yourself",
    checkAgain: "Check again",
    greatWriting: "This is good writing!",
    practicePrompt: "Practice prompt",
    craftLesson: "Craft lesson",
    teachingNotes: "Teaching notes",
    yourVoice: "your voice",
    canImprove: "can improve",
    microLesson: "Micro-lesson",
    before: "Before",
    after: "After",
    feedbackPlaceholder: "Write your version here...",
    languageLabel: "Language",
    close: "Close",
  },
  zh: {
    appName: "Accent",
    write: "写作",
    shelf: "书架",
    quick: "快速",
    learn: "学习",
    checkButton: "检查我的写作",
    placeholder: "在这里粘贴你的草稿...",
    precision: "精确",
    rhythm: "节奏",
    voice: "声音",
    structure: "结构",
    tryIt: "试试",
    submit: "提交",
    tryWritingIt: "试着自己写",
    checkAgain: "再次检查",
    greatWriting: "写得很好！",
    practicePrompt: "练习提示",
    craftLesson: "写作课",
    teachingNotes: "教学笔记",
    yourVoice: "你的声音",
    canImprove: "可以改进",
    microLesson: "微课",
    before: "之前",
    after: "之后",
    feedbackPlaceholder: "在这里写你的版本...",
    languageLabel: "语言",
    close: "关闭",
  },
  nl: {
    appName: "Accent",
    write: "Schrijven",
    shelf: "Plank",
    quick: "Snel",
    learn: "Leren",
    checkButton: "Controleer mijn tekst",
    placeholder: "Plak je tekst hier...",
    precision: "Precisie",
    rhythm: "Ritme",
    voice: "Stem",
    structure: "Structuur",
    tryIt: "Probeer het",
    submit: "Verstuur",
    tryWritingIt: "Probeer het zelf te schrijven",
    checkAgain: "Opnieuw controleren",
    greatWriting: "Dit is goed geschreven!",
    practicePrompt: "Oefenopdracht",
    craftLesson: "Schrijfles",
    teachingNotes: "Lesnotities",
    yourVoice: "jouw stem",
    canImprove: "kan beter",
    microLesson: "Microles",
    before: "Voor",
    after: "Na",
    feedbackPlaceholder: "Schrijf hier jouw versie...",
    languageLabel: "Taal",
    close: "Sluiten",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale][key];
}

export function useTranslations(locale: Locale) {
  return (key: TranslationKey) => t(locale, key);
}
