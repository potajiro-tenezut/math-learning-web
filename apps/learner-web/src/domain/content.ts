export const SUPPORTED_SCHEMA_VERSION = "1.0.0";

export type DifficultyLabel = "intro" | "standard" | "challenge";
export type ProgressStatus = "not-started" | "in-progress" | "completed";

export interface Unit {
  id: string;
  name: string;
}

export interface Difficulty {
  label: DifficultyLabel;
  score: number;
}

export interface QuestionSummary {
  id: string;
  revision: string;
  file: string;
  unit: Unit;
  gradeLevel: "junior-high-review" | "high-school-basic";
  difficulty: Difficulty;
  problemType: string;
  tags: string[];
}

export interface ContentIndex {
  schemaVersion: string;
  contentVersion: string;
  generatedAt: string;
  questionCount: number;
  questions: QuestionSummary[];
}

export interface ManifestFile {
  path: string;
  sha256: string;
  bytes: number;
}

export interface ContentManifest {
  schemaVersion: string;
  contentVersion: string;
  generatedAt: string;
  questionCount: number;
  packageChecksum: string;
  files: ManifestFile[];
}

export interface Choice {
  id: string;
  text: string;
  latex: string;
  isCorrect: boolean;
  incorrectReason?: string;
}

export interface SolutionStep {
  stepId: string;
  beforeLatex: string;
  operationText: string;
  operationLatex: string;
  afterLatex: string;
  reason: string;
  choices: Choice[];
}

export interface PublicQuestion {
  schemaVersion: string;
  id: string;
  revision: string;
  audience: { schoolStage: "high-school"; levelNote: string };
  unit: Unit;
  gradeLevel: QuestionSummary["gradeLevel"];
  difficulty: Difficulty;
  sourceType: "original" | "adapted" | "imported";
  problemType: string;
  problemText: string;
  problemLatex: string;
  given: { variables: string[]; conditions: string[] };
  answer: { finalAnswerLatex: string };
  solutionPlan: { summary: string };
  solutionSteps: SolutionStep[];
  metadata: { tags: string[] };
}

export interface AvailableContent {
  contentVersion: string;
  manifestUrl: string;
  manifest: ContentManifest;
  index: ContentIndex;
  usedFallback: boolean;
}
