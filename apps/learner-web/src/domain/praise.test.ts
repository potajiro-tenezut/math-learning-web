import { describe, expect, it } from "vitest";
import { pickPraiseMessage, praiseMessages } from "./praise";

describe("praise messages", () => {
  it("has varied, unique praise for finishing three questions", () => {
    expect(praiseMessages.length).toBeGreaterThanOrEqual(20);
    expect(new Set(praiseMessages).size).toBe(praiseMessages.length);
  });

  it("picks a message with the supplied random source", () => {
    expect(pickPraiseMessage(() => 0)).toBe(praiseMessages[0]);
    expect(pickPraiseMessage(() => 0.999)).toBe(praiseMessages.at(-1));
  });
});
