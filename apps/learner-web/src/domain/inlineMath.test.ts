import { describe, expect, it } from "vitest";
import { splitInlineMath } from "./inlineMath";

describe("splitInlineMath", () => {
  it("文章中の分数を前後の式ごとインライン数式にする", () => {
    expect(splitInlineMath("x=\\frac{45}{11}をy=15-4xへ代入する。")).toEqual([
      { kind: "math", value: "x=\\frac{45}{11}" },
      { kind: "text", value: "をy=15-4xへ代入する。" },
    ]);
  });

  it("根号や複数のLaTeXコマンドを一つの数式として扱う", () => {
    expect(
      splitInlineMath("第1項 \\frac{\\sqrt7}{\\sqrt7-\\sqrt2} の分母を有理化する。"),
    ).toEqual([
      { kind: "text", value: "第1項 " },
      { kind: "math", value: "\\frac{\\sqrt7}{\\sqrt7-\\sqrt2}" },
      { kind: "text", value: " の分母を有理化する。" },
    ]);
  });

  it("かけ算とわり算を別々のインライン数式にする", () => {
    expect(splitInlineMath("4 \\times 5=20 なので、20 \\div 4=5 です。")).toEqual([
      { kind: "math", value: "4 \\times 5=20" },
      { kind: "text", value: " なので、" },
      { kind: "math", value: "20 \\div 4=5" },
      { kind: "text", value: " です。" },
    ]);
  });
});
