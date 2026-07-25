import { describe, expect, it } from "vitest";
import { question } from "../test/fixtures";
import { LearningSession } from "./session";

describe("LearningSession", () => {
  it("不正解、再選択、正解、次step、完了を遷移する", () => {
    const session = new LearningSession(question, () => 0.5);
    session.select("choice-a");
    expect(session.state.phase).toBe("choosing");
    expect(session.state.feedback).toBe("逆です。");

    session.select("choice-b");
    expect(session.state.phase).toBe("correct");
    session.next();
    expect(session.state.stepIndex).toBe(1);
    expect(session.state.phase).toBe("choosing");

    session.select("choice-a");
    session.next();
    expect(session.state.phase).toBe("completed");
  });

  it("シャッフル後もchoice.idで正誤を判定し、並び順は維持する", () => {
    const session = new LearningSession(question, () => 0);
    const firstOrder = session.choices.map((choice) => choice.id);
    expect(firstOrder).not.toEqual(question.solutionSteps[0].choices.map((choice) => choice.id));

    session.select("choice-a");
    expect(session.state.phase).toBe("choosing");
    expect(session.choices.map((choice) => choice.id)).toEqual(firstOrder);
    session.select("choice-b");
    expect(session.state.phase).toBe("correct");
  });
});
