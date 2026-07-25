import { describe, expect, it } from "vitest";
import { pickRoastMessage, roastMessages } from "./roasts";

describe("roast messages", () => {
  it("has exactly 100 unique messages", () => {
    expect(roastMessages).toHaveLength(100);
    expect(new Set(roastMessages).size).toBe(100);
  });

  it("does not immediately repeat the previous message", () => {
    for (const previous of roastMessages) {
      expect(pickRoastMessage(() => 0, previous)).not.toBe(previous);
    }
  });
});
