export type StudyPriority = "high" | "medium" | "low";
export type QuestionKind = "short" | "medium" | "long" | "writing";

export type SuggestionImage = {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  data: string;
};

export type SuggestionQuestionDraft = {
  id: string;
  imageId: string;
  sourcePage: number;
  kind: QuestionKind;
  topic: string;
  question: string;
  marks: number | null;
};

export type StudyQuestion = {
  topic: string;
  question: string;
  answer: string;
  priority: StudyPriority;
};

export type StudyTopic = {
  name: string;
  priority: StudyPriority;
  reason: string;
};

export type StudyPack = {
  title: string;
  summary: string;
  topics: StudyTopic[];
  questions: Record<QuestionKind, StudyQuestion[]>;
  studyPlan: Array<{ time: string; task: string }>;
  lastMinuteTips: string[];
};

export type StudyRequest = {
  subject: string;
  examLevel: string;
  examTiming: string;
  focusNotes: string;
  images: SuggestionImage[];
};