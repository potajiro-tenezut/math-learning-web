import type { ProgressStatus } from "./content";

export interface ProgressRecord {
  questionId: string;
  revision: string;
  status: Exclude<ProgressStatus, "not-started">;
  stepIndex: number;
  updatedAt: string;
}

export interface ProgressRepository {
  get(questionId: string, revision: string): ProgressRecord | undefined;
  list(): ProgressRecord[];
  save(record: ProgressRecord): void;
  remove(questionId: string, revision: string): void;
}

export const progressKey = (questionId: string, revision: string) => `${questionId}@${revision}`;

export class BrowserProgressRepository implements ProgressRepository {
  private readonly storageKey = "hana-math:progress:v1";

  constructor(private readonly storage: Storage = window.localStorage) {}

  private read(): Record<string, ProgressRecord> {
    try {
      const parsed: unknown = JSON.parse(this.storage.getItem(this.storageKey) ?? "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return parsed as Record<string, ProgressRecord>;
    } catch {
      this.storage.removeItem(this.storageKey);
      return {};
    }
  }

  get(questionId: string, revision: string): ProgressRecord | undefined {
    return this.read()[progressKey(questionId, revision)];
  }

  list(): ProgressRecord[] {
    return Object.values(this.read()).filter(
      (item) =>
        item &&
        typeof item.questionId === "string" &&
        typeof item.revision === "string" &&
        (item.status === "in-progress" || item.status === "completed"),
    );
  }

  save(record: ProgressRecord): void {
    const records = this.read();
    records[progressKey(record.questionId, record.revision)] = record;
    this.storage.setItem(this.storageKey, JSON.stringify(records));
  }

  remove(questionId: string, revision: string): void {
    const records = this.read();
    delete records[progressKey(questionId, revision)];
    this.storage.setItem(this.storageKey, JSON.stringify(records));
  }
}
