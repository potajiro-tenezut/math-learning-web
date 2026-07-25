import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { HttpContentRepository } from "./contentRepository";

describe("実エクスポート統合", () => {
  it("高校30問と小学3年生200問を検証して読み込める", async () => {
    const contentRoots = new Map([
      ["/content/", resolve(process.cwd(), "public/content")],
      ["/content-grade3/", resolve(process.cwd(), "public/content-grade3")],
    ]);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = new URL(String(input));
      const prefix = [...contentRoots.keys()].find((item) => url.pathname.startsWith(item));
      if (!prefix) return new Response("", { status: 404 });
      const path = decodeURIComponent(url.pathname.slice(prefix.length));
      try {
        return new Response(await readFile(join(contentRoots.get(prefix)!, path)));
      } catch {
        return new Response("", { status: 404 });
      }
    });

    const highSchoolRepository = new HttpContentRepository(
      new URL("https://local.test/content/"),
    );
    const highSchoolContent = await highSchoolRepository.loadAvailableContent();
    const highSchoolQuestions = await Promise.all(
      highSchoolContent.index.questions.map((summary) =>
        highSchoolRepository.loadQuestion(highSchoolContent, summary),
      ),
    );
    expect(highSchoolContent.index.questionCount).toBe(30);
    expect(highSchoolQuestions).toHaveLength(30);

    const grade3Repository = new HttpContentRepository(
      new URL("https://local.test/content-grade3/"),
    );
    const grade3Content = await grade3Repository.loadAvailableContent();
    const grade3Questions = await Promise.all(
      grade3Content.index.questions.map((summary) =>
        grade3Repository.loadQuestion(grade3Content, summary),
      ),
    );
    expect(grade3Content.index.questionCount).toBe(200);
    expect(grade3Questions).toHaveLength(200);
    expect(new Set(grade3Questions.map((question) => question.id)).size).toBe(200);
    expect(new Set(grade3Questions.map((question) => question.unit.name))).toEqual(
      new Set(["たし算", "ひき算", "かけ算", "わり算"]),
    );
    const grade3Prose = grade3Questions.flatMap((question) => [
      question.problemText,
      question.solutionPlan.summary,
      ...question.solutionSteps.flatMap((step) => [
        step.operationText,
        step.reason,
        ...step.choices.flatMap((choice) => [
          choice.text,
          choice.incorrectReason ?? "",
        ]),
      ]),
    ]);
    expect(grade3Prose.join("\n")).not.toMatch(/\\(?:times|div)\b/);
  });
});
