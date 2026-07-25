import { afterEach, describe, expect, it, vi } from "vitest";
import type { AvailableContent, ContentIndex, ContentManifest } from "../domain/content";
import { question, summary } from "../test/fixtures";
import {
  CachedContentRepository,
  ContentError,
  HttpContentRepository,
  normalizeProseMath,
  resolveWithinBase,
  sha256,
  type ContentCache,
} from "./contentRepository";

async function makePackage(schemaVersion = "1.0.0") {
  const questionText = JSON.stringify({ ...question, schemaVersion });
  const index: ContentIndex = {
    schemaVersion,
    contentVersion: "2026-01-01.1",
    generatedAt: "2026-01-01T00:00:00.000Z",
    questionCount: 1,
    questions: [summary],
  };
  const indexText = JSON.stringify(index);
  const manifest: ContentManifest = {
    schemaVersion,
    contentVersion: index.contentVersion,
    generatedAt: index.generatedAt,
    questionCount: 1,
    packageChecksum: "b".repeat(64),
    files: [
      { path: "index.json", sha256: await sha256(indexText), bytes: new TextEncoder().encode(indexText).byteLength },
      { path: summary.file, sha256: await sha256(questionText), bytes: new TextEncoder().encode(questionText).byteLength },
    ],
  };
  return {
    latest: JSON.stringify({
      schemaVersion,
      contentVersion: index.contentVersion,
      manifest: `${index.contentVersion}/manifest.json`,
    }),
    manifest: JSON.stringify(manifest),
    index: indexText,
    question: questionText,
  };
}

function installFetch(files: Awaited<ReturnType<typeof makePackage>>) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/latest.json")) {
      expect(init).toMatchObject({ cache: "no-store" });
      return new Response(files.latest);
    }
    if (url.pathname.endsWith("/manifest.json")) return new Response(files.manifest);
    if (url.pathname.endsWith("/index.json")) return new Response(files.index);
    if (url.pathname.endsWith(`/${summary.file}`)) return new Response(files.question);
    return new Response("", { status: 404 });
  });
}

afterEach(() => vi.restoreAllMocks());

describe("HttpContentRepository", () => {
  it("latest → manifest → index → questionのURLを解決する", async () => {
    const files = await makePackage();
    const fetchSpy = installFetch(files);
    const repository = new HttpContentRepository(
      new URL("https://example.test/content/"),
      () => "test",
    );
    const content = await repository.loadAvailableContent();
    const loaded = await repository.loadQuestion(content, summary);

    expect(loaded.id).toBe(summary.id);
    expect(fetchSpy.mock.calls.map(([url]) => String(url))).toEqual([
      "https://example.test/content/latest.json?cache-bust=test",
      "https://example.test/content/2026-01-01.1/manifest.json",
      "https://example.test/content/2026-01-01.1/index.json",
      "https://example.test/content/2026-01-01.1/questions/unit-sample-0001.json",
    ]);
  });

  it("未対応schemaVersionを拒否する", async () => {
    installFetch(await makePackage("2.0.0"));
    const repository = new HttpContentRepository(new URL("https://example.test/content/"));
    await expect(repository.loadAvailableContent()).rejects.toMatchObject({
      code: "UNSUPPORTED_SCHEMA",
    });
  });

  it("indexのSHA-256不一致を拒否する", async () => {
    const files = await makePackage();
    const manifest = JSON.parse(files.manifest) as ContentManifest;
    manifest.files[0].sha256 = "0".repeat(64);
    installFetch({ ...files, manifest: JSON.stringify(manifest) });
    const repository = new HttpContentRepository(new URL("https://example.test/content/"));
    await expect(repository.loadAvailableContent()).rejects.toMatchObject({
      code: "HASH_MISMATCH",
    });
  });

  it("問題のSHA-256不一致を拒否する", async () => {
    const files = await makePackage();
    installFetch({ ...files, question: `${files.question} ` });
    const repository = new HttpContentRepository(new URL("https://example.test/content/"));
    const content = await repository.loadAvailableContent();
    await expect(repository.loadQuestion(content, summary)).rejects.toBeInstanceOf(ContentError);
  });

  it("別オリジンと親ディレクトリへの逸脱を拒否する", () => {
    const base = new URL("https://example.test/content/");
    expect(() => resolveWithinBase("../secret.json", base)).toThrow();
    expect(() => resolveWithinBase("https://evil.test/data.json", base)).toThrow();
  });
});

describe("normalizeProseMath", () => {
  it("二重エスケープされたUnicodeだけを表示文字へ戻す", () => {
    expect(normalizeProseMath("\\u221a50 を簡単にする")).toBe("√50 を簡単にする");
    expect(normalizeProseMath("\\u00b12 と \\u03c0")).toBe("±2 と π");
  });

  it("通常の文章とLaTeXは変更しない", () => {
    expect(normalizeProseMath("平方根を考える")).toBe("平方根を考える");
    expect(normalizeProseMath("\\sqrt{50} と \\frac{1}{2}")).toBe(
      "\\sqrt{50} と \\frac{1}{2}",
    );
  });
});

describe("CachedContentRepository", () => {
  it("新版の取得失敗時に最後の正常版を維持する", async () => {
    const fallback = {
      contentVersion: "old",
      manifestUrl: "https://example.test/content/old/manifest.json",
      manifest: {},
      index: {},
      usedFallback: true,
    } as AvailableContent;
    const cache: ContentCache = {
      getActive: () => fallback,
      setActive: vi.fn(),
      getQuestion: () => undefined,
      setQuestion: vi.fn(),
    };
    const repository = new CachedContentRepository(
      {
        loadAvailableContent: async () => {
          throw new Error("network");
        },
        loadQuestion: async () => {
          throw new Error("unused");
        },
      },
      cache,
    );
    await expect(repository.loadAvailableContent()).resolves.toBe(fallback);
  });
});
