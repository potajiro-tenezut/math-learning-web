import {
  SUPPORTED_SCHEMA_VERSION,
  type AvailableContent,
  type ContentIndex,
  type ContentManifest,
  type PublicQuestion,
  type QuestionSummary,
} from "../domain/content";

export class ContentError extends Error {
  constructor(
    public readonly userMessage: string,
    public readonly code: string,
    diagnostic: string,
    options?: ErrorOptions,
  ) {
    super(diagnostic, options);
    this.name = "ContentError";
  }
}

export interface ContentRepository {
  loadAvailableContent(): Promise<AvailableContent>;
  loadQuestion(content: AvailableContent, summary: QuestionSummary): Promise<PublicQuestion>;
}

export interface ContentCache {
  getActive(): AvailableContent | undefined;
  setActive(content: AvailableContent): void;
  getQuestion(contentVersion: string, id: string, revision: string): PublicQuestion | undefined;
  setQuestion(contentVersion: string, question: PublicQuestion): void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function assertSchema(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> & { schemaVersion: string } {
  if (!isRecord(value) || typeof value.schemaVersion !== "string") {
    throw new ContentError(
      "コンテンツの形式が壊れています。",
      "INVALID_STRUCTURE",
      `${label}: schemaVersion is missing`,
    );
  }
  if (value.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new ContentError(
      "このコンテンツは、現在のアプリではまだ利用できません。",
      "UNSUPPORTED_SCHEMA",
      `${label}: unsupported schemaVersion ${value.schemaVersion}`,
    );
  }
}

function parseJson(text: string, label: string): unknown {
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new ContentError(
      "コンテンツの形式が壊れています。",
      "INVALID_JSON",
      `${label}: invalid JSON`,
      { cause },
    );
  }
}

function validateManifest(value: unknown, expectedVersion: string): ContentManifest {
  assertSchema(value, "manifest");
  if (
    !isRecord(value) ||
    value.contentVersion !== expectedVersion ||
    typeof value.questionCount !== "number" ||
    !Array.isArray(value.files) ||
    !value.files.every(
      (file) =>
        isRecord(file) &&
        typeof file.path === "string" &&
        typeof file.sha256 === "string" &&
        typeof file.bytes === "number",
    )
  ) {
    throw new ContentError(
      "コンテンツの目録が壊れています。",
      "INVALID_MANIFEST",
      "manifest: required fields are invalid",
    );
  }
  return value as unknown as ContentManifest;
}

function validateIndex(value: unknown, manifest: ContentManifest): ContentIndex {
  assertSchema(value, "index");
  if (
    !isRecord(value) ||
    value.contentVersion !== manifest.contentVersion ||
    typeof value.questionCount !== "number" ||
    !Array.isArray(value.questions) ||
    value.questionCount !== value.questions.length ||
    value.questionCount !== manifest.questionCount ||
    !value.questions.every(
      (question) =>
        isRecord(question) &&
        typeof question.id === "string" &&
        typeof question.revision === "string" &&
        typeof question.file === "string" &&
        isRecord(question.unit) &&
        typeof question.unit.id === "string" &&
        typeof question.unit.name === "string" &&
        isRecord(question.difficulty) &&
        typeof question.difficulty.label === "string" &&
        typeof question.difficulty.score === "number" &&
        Array.isArray(question.tags),
    )
  ) {
    throw new ContentError(
      "問題一覧の形式が壊れています。",
      "INVALID_INDEX",
      "index: count or question structure is invalid",
    );
  }
  return value as unknown as ContentIndex;
}

function validateQuestion(
  value: unknown,
  summary: Pick<QuestionSummary, "id" | "revision">,
): PublicQuestion {
  assertSchema(value, `question:${summary.id}`);
  if (
    !isRecord(value) ||
    value.id !== summary.id ||
    value.revision !== summary.revision ||
    typeof value.problemText !== "string" ||
    typeof value.problemLatex !== "string" ||
    !isRecord(value.answer) ||
    typeof value.answer.finalAnswerLatex !== "string" ||
    !isRecord(value.solutionPlan) ||
    typeof value.solutionPlan.summary !== "string" ||
    !Array.isArray(value.solutionSteps) ||
    value.solutionSteps.length === 0 ||
    !value.solutionSteps.every(
      (step) =>
        isRecord(step) &&
        typeof step.stepId === "string" &&
        typeof step.beforeLatex === "string" &&
        typeof step.afterLatex === "string" &&
        typeof step.reason === "string" &&
        Array.isArray(step.choices) &&
        step.choices.length >= 2 &&
        step.choices.filter((choice) => isRecord(choice) && choice.isCorrect === true).length === 1,
    )
  ) {
    throw new ContentError(
      "この問題のデータが壊れています。",
      "INVALID_QUESTION",
      `question:${summary.id}: required fields are invalid`,
    );
  }
  const question = value as unknown as PublicQuestion;
  return {
    ...question,
    problemText: decodeEscapedUnicode(question.problemText),
    solutionPlan: {
      ...question.solutionPlan,
      summary: decodeEscapedUnicode(question.solutionPlan.summary),
    },
    solutionSteps: question.solutionSteps.map((step) => ({
      ...step,
      operationText: decodeEscapedUnicode(step.operationText),
      reason: decodeEscapedUnicode(step.reason),
      choices: step.choices.map((choice) => ({
        ...choice,
        text: decodeEscapedUnicode(choice.text),
        incorrectReason:
          choice.incorrectReason === undefined
            ? undefined
            : decodeEscapedUnicode(choice.incorrectReason),
      })),
    })),
  };
}

export function decodeEscapedUnicode(value: string): string {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, codePoint: string) =>
    String.fromCharCode(Number.parseInt(codePoint, 16)),
  );
}

export function resolveWithinBase(relativePath: string, baseUrl: URL): URL {
  const resolved = new URL(relativePath, baseUrl);
  const basePath = baseUrl.pathname.endsWith("/") ? baseUrl.pathname : `${baseUrl.pathname}/`;
  if (
    resolved.origin !== baseUrl.origin ||
    resolved.username ||
    resolved.password ||
    !resolved.pathname.startsWith(basePath)
  ) {
    throw new ContentError(
      "安全でないコンテンツ参照を拒否しました。",
      "UNSAFE_PATH",
      `Path escaped content base: ${relativePath}`,
    );
  }
  return resolved;
}

export async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyFile(text: string, file: { sha256: string; bytes: number }, label: string) {
  const bytes = new TextEncoder().encode(text).byteLength;
  if (bytes !== file.bytes) {
    throw new ContentError(
      "コンテンツの検証に失敗しました。",
      "BYTE_MISMATCH",
      `${label}: expected ${file.bytes} bytes, received ${bytes}`,
    );
  }
  if ((await sha256(text)) !== file.sha256) {
    throw new ContentError(
      "コンテンツの検証に失敗しました。",
      "HASH_MISMATCH",
      `${label}: SHA-256 mismatch`,
    );
  }
}

async function fetchText(url: URL, init?: RequestInit): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (cause) {
    throw new ContentError(
      "コンテンツを取得できませんでした。",
      "NETWORK_ERROR",
      `Fetch failed: ${url}`,
      { cause },
    );
  }
  if (!response.ok) {
    throw new ContentError(
      "コンテンツを取得できませんでした。",
      "HTTP_ERROR",
      `${response.status} ${response.statusText}: ${url}`,
    );
  }
  return response.text();
}

export class HttpContentRepository implements ContentRepository {
  constructor(
    private readonly baseUrl: URL,
    private readonly cacheBuster: () => string = () => Date.now().toString(),
  ) {}

  async loadAvailableContent(): Promise<AvailableContent> {
    const latestUrl = resolveWithinBase("latest.json", this.baseUrl);
    // GitHub Pages and some CDNs apply their own cache headers. A unique query
    // keeps the release pointer fresh even when those headers cannot be changed.
    latestUrl.searchParams.set("cache-bust", this.cacheBuster());
    const latest = parseJson(await fetchText(latestUrl, { cache: "no-store" }), "latest");
    assertSchema(latest, "latest");
    if (
      !isRecord(latest) ||
      typeof latest.contentVersion !== "string" ||
      typeof latest.manifest !== "string"
    ) {
      throw new ContentError(
        "最新版の情報が壊れています。",
        "INVALID_LATEST",
        "latest: contentVersion or manifest is missing",
      );
    }

    const manifestUrl = resolveWithinBase(latest.manifest, this.baseUrl);
    const versionBaseUrl = new URL("./", manifestUrl);
    const manifest = validateManifest(
      parseJson(await fetchText(manifestUrl), "manifest"),
      latest.contentVersion,
    );
    const indexFile = manifest.files.find((file) => file.path === "index.json");
    if (!indexFile) {
      throw new ContentError(
        "問題一覧が見つかりません。",
        "INDEX_NOT_LISTED",
        "manifest: index.json is not listed",
      );
    }
    const indexUrl = resolveWithinBase(indexFile.path, versionBaseUrl);
    const indexText = await fetchText(indexUrl);
    await verifyFile(indexText, indexFile, "index.json");
    const index = validateIndex(parseJson(indexText, "index"), manifest);

    const manifestPaths = new Set(manifest.files.map((file) => file.path));
    if (index.questions.some((question) => !manifestPaths.has(question.file))) {
      throw new ContentError(
        "問題一覧と目録が一致しません。",
        "QUESTION_NOT_LISTED",
        "index: a question file is absent from manifest",
      );
    }
    return {
      contentVersion: latest.contentVersion,
      manifestUrl: manifestUrl.toString(),
      manifest,
      index,
      usedFallback: false,
    };
  }

  async loadQuestion(content: AvailableContent, summary: QuestionSummary): Promise<PublicQuestion> {
    const listedSummary = content.index.questions.find(
      (question) => question.id === summary.id && question.revision === summary.revision,
    );
    const manifestFile = content.manifest.files.find((file) => file.path === summary.file);
    if (!listedSummary || !manifestFile) {
      throw new ContentError(
        "この問題は公開目録にありません。",
        "QUESTION_NOT_LISTED",
        `question:${summary.id}: not present in active index/manifest`,
      );
    }
    const versionBaseUrl = new URL("./", content.manifestUrl);
    const questionUrl = resolveWithinBase(summary.file, versionBaseUrl);
    const text = await fetchText(questionUrl);
    await verifyFile(text, manifestFile, summary.file);
    return validateQuestion(parseJson(text, summary.file), summary);
  }
}

export class BrowserContentCache implements ContentCache {
  private readonly activeKey = "hana-math:content:active:v1";
  private readonly questionPrefix = "hana-math:content:question:v1:";

  constructor(private readonly storage: Storage = window.localStorage) {}

  getActive(): AvailableContent | undefined {
    try {
      const value: unknown = JSON.parse(this.storage.getItem(this.activeKey) ?? "null");
      if (
        !isRecord(value) ||
        typeof value.contentVersion !== "string" ||
        typeof value.manifestUrl !== "string"
      ) {
        return undefined;
      }
      const manifest = validateManifest(value.manifest, value.contentVersion);
      const index = validateIndex(value.index, manifest);
      return {
        contentVersion: value.contentVersion,
        manifestUrl: value.manifestUrl,
        manifest,
        index,
        usedFallback: true,
      };
    } catch {
      this.storage.removeItem(this.activeKey);
      return undefined;
    }
  }

  setActive(content: AvailableContent): void {
    try {
      this.storage.setItem(this.activeKey, JSON.stringify({ ...content, usedFallback: false }));
    } catch (error) {
      console.warn("Verified content could not be cached", error);
    }
  }

  getQuestion(contentVersion: string, id: string, revision: string): PublicQuestion | undefined {
    const key = `${this.questionPrefix}${contentVersion}:${id}:${revision}`;
    try {
      const value: unknown = JSON.parse(this.storage.getItem(key) ?? "null");
      return isRecord(value) ? validateQuestion(value, { id, revision }) : undefined;
    } catch {
      this.storage.removeItem(key);
      return undefined;
    }
  }

  setQuestion(contentVersion: string, question: PublicQuestion): void {
    const key = `${this.questionPrefix}${contentVersion}:${question.id}:${question.revision}`;
    try {
      this.storage.setItem(key, JSON.stringify(question));
    } catch (error) {
      console.warn("Verified question could not be cached", error);
    }
  }
}

export class CachedContentRepository implements ContentRepository {
  constructor(
    private readonly source: ContentRepository,
    private readonly cache: ContentCache,
  ) {}

  async loadAvailableContent(): Promise<AvailableContent> {
    try {
      const content = await this.source.loadAvailableContent();
      this.cache.setActive(content);
      return content;
    } catch (error) {
      const fallback = this.cache.getActive();
      if (fallback) return fallback;
      throw error;
    }
  }

  async loadQuestion(content: AvailableContent, summary: QuestionSummary): Promise<PublicQuestion> {
    try {
      const question = await this.source.loadQuestion(content, summary);
      this.cache.setQuestion(content.contentVersion, question);
      return question;
    } catch (error) {
      const fallback = this.cache.getQuestion(
        content.contentVersion,
        summary.id,
        summary.revision,
      );
      if (fallback) return fallback;
      throw error;
    }
  }
}
