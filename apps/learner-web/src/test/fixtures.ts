import type { PublicQuestion, QuestionSummary } from "../domain/content";

export const summary: QuestionSummary = {
  id: "unit-sample-0001",
  revision: "a".repeat(64),
  file: "questions/unit-sample-0001.json",
  unit: { id: "unit-sample", name: "サンプル" },
  gradeLevel: "junior-high-review",
  difficulty: { label: "intro", score: 1 },
  problemType: "sample",
  tags: ["sample"],
};

export const question: PublicQuestion = {
  schemaVersion: "1.0.0",
  id: summary.id,
  revision: summary.revision,
  audience: { schoolStage: "high-school", levelNote: "基礎" },
  unit: summary.unit,
  gradeLevel: summary.gradeLevel,
  difficulty: summary.difficulty,
  sourceType: "original",
  problemType: "sample",
  problemText: "x + 1 = 2 を解く。",
  problemLatex: "x+1=2",
  given: { variables: ["x"], conditions: [] },
  answer: { finalAnswerLatex: "x=1" },
  solutionPlan: { summary: "両辺から1を引く。" },
  solutionSteps: [
    {
      stepId: "step-001",
      beforeLatex: "x+1=2",
      operationText: "両辺から1を引く。",
      operationLatex: "x+1-1=2-1",
      afterLatex: "x=1",
      reason: "等式の両辺から同じ数を引いても等式は保たれます。",
      choices: [
        { id: "choice-a", text: "両辺に1を足す", latex: "x=3", isCorrect: false, incorrectReason: "逆です。" },
        { id: "choice-b", text: "両辺から1を引く", latex: "x=1", isCorrect: true },
        { id: "choice-c", text: "左辺だけ1を引く", latex: "x=2", isCorrect: false, incorrectReason: "両辺に同じ操作が必要です。" },
      ],
    },
    {
      stepId: "step-002",
      beforeLatex: "x=1",
      operationText: "答えを確認する。",
      operationLatex: "1+1=2",
      afterLatex: "2=2",
      reason: "代入して等式が成り立つことを確認します。",
      choices: [
        { id: "choice-a", text: "x=1を代入する", latex: "2=2", isCorrect: true },
        { id: "choice-b", text: "x=2を代入する", latex: "3=2", isCorrect: false, incorrectReason: "求めた値は1です。" },
      ],
    },
  ],
  metadata: { tags: ["sample"] },
};
