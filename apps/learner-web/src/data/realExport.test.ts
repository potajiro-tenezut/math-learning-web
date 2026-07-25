import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { HttpContentRepository } from "./contentRepository";

describe("実エクスポート統合", () => {
  it("現在の30問を検証して読み込める", async () => {
    const contentRoot = resolve(process.cwd(), "public/content");
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = new URL(String(input));
      const path = decodeURIComponent(url.pathname.replace(/^\/content\//, ""));
      try {
        return new Response(await readFile(join(contentRoot, path)));
      } catch {
        return new Response("", { status: 404 });
      }
    });

    const repository = new HttpContentRepository(new URL("https://local.test/content/"));
    const content = await repository.loadAvailableContent();
    const questions = await Promise.all(
      content.index.questions.map((summary) => repository.loadQuestion(content, summary)),
    );
    expect(content.index.questionCount).toBe(30);
    expect(questions).toHaveLength(30);
    expect(new Set(questions.map((question) => question.id)).size).toBe(30);
  });
});
