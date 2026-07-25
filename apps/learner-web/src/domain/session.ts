import type { Choice, PublicQuestion } from "./content";

export type SessionPhase = "choosing" | "correct" | "completed";

export interface SessionSnapshot {
  question: PublicQuestion;
  stepIndex: number;
  phase: SessionPhase;
  shuffledChoiceIds: string[][];
  selectedChoiceId?: string;
  feedback?: string;
}

export type RandomSource = () => number;

function shuffle<T>(values: T[], random: RandomSource): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export class LearningSession {
  private snapshot: SessionSnapshot;

  constructor(
    question: PublicQuestion,
    random: RandomSource = Math.random,
    initialStepIndex = 0,
  ) {
    const safeStepIndex = Math.max(0, Math.min(initialStepIndex, question.solutionSteps.length - 1));
    this.snapshot = {
      question,
      stepIndex: safeStepIndex,
      phase: "choosing",
      shuffledChoiceIds: question.solutionSteps.map((step) =>
        shuffle(
          step.choices.map((choice) => choice.id),
          random,
        ),
      ),
    };
  }

  get state(): Readonly<SessionSnapshot> {
    return this.snapshot;
  }

  get choices(): Choice[] {
    const step = this.snapshot.question.solutionSteps[this.snapshot.stepIndex];
    const byId = new Map(step.choices.map((choice) => [choice.id, choice]));
    return this.snapshot.shuffledChoiceIds[this.snapshot.stepIndex]
      .map((id) => byId.get(id))
      .filter((choice): choice is Choice => choice !== undefined);
  }

  select(choiceId: string): SessionSnapshot {
    if (this.snapshot.phase !== "choosing") return this.snapshot;
    const step = this.snapshot.question.solutionSteps[this.snapshot.stepIndex];
    const choice = step.choices.find((candidate) => candidate.id === choiceId);
    if (!choice) throw new Error("選択肢が見つかりません。");

    this.snapshot = choice.isCorrect
      ? { ...this.snapshot, selectedChoiceId: choiceId, feedback: step.reason, phase: "correct" }
      : {
          ...this.snapshot,
          selectedChoiceId: choiceId,
          feedback: choice.incorrectReason ?? "もう一度考えてみましょう。",
        };
    return this.snapshot;
  }

  next(): SessionSnapshot {
    if (this.snapshot.phase !== "correct") return this.snapshot;
    const lastStep = this.snapshot.stepIndex === this.snapshot.question.solutionSteps.length - 1;
    this.snapshot = lastStep
      ? { ...this.snapshot, phase: "completed", selectedChoiceId: undefined }
      : {
          ...this.snapshot,
          stepIndex: this.snapshot.stepIndex + 1,
          phase: "choosing",
          selectedChoiceId: undefined,
          feedback: undefined,
        };
    return this.snapshot;
  }
}
