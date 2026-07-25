import { describe, expect, it } from "vitest";
import { pickRandomQuestions } from "./quickSession";

describe("pickRandomQuestions", () => {
  it("重複せず指定数を選ぶ", () => {
    const result = pickRandomQuestions([1, 2, 3, 4, 5], 3, () => 0);
    expect(result).toHaveLength(3);
    expect(new Set(result).size).toBe(3);
  });

  it("未完了などの優先対象から先に選ぶ", () => {
    const result = pickRandomQuestions(
      [
        { id: "done", preferred: false },
        { id: "new-1", preferred: true },
        { id: "new-2", preferred: true },
        { id: "done-2", preferred: false },
      ],
      3,
      () => 0.5,
      (item) => item.preferred,
    );
    expect(result.slice(0, 2).every((item) => item.preferred)).toBe(true);
    expect(new Set(result.map((item) => item.id)).size).toBe(3);
  });
});
