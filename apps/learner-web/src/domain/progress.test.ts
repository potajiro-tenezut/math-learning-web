import { beforeEach, describe, expect, it } from "vitest";
import { BrowserProgressRepository } from "./progress";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("BrowserProgressRepository", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("question.id + revisionで進捗を分離する", () => {
    const repository = new BrowserProgressRepository(storage);
    repository.save({
      questionId: "question-1",
      revision: "revision-a",
      status: "completed",
      stepIndex: 1,
      updatedAt: "2026-07-25T00:00:00.000Z",
    });
    expect(repository.get("question-1", "revision-a")?.status).toBe("completed");
    expect(repository.get("question-1", "revision-b")).toBeUndefined();
  });

  it("破損した保存データを空として扱う", () => {
    storage.setItem("hana-math:progress:v1", "{broken");
    const repository = new BrowserProgressRepository(storage);
    expect(repository.list()).toEqual([]);
  });
});
