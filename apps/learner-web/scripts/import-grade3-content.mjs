import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(process.argv[2] || ".");
const outputRoot = resolve(appRoot, process.argv[3] || "public/content-grade3");
const contentVersion = "2026-07-25.grade3.1";
const generatedAt = "2026-07-25T00:00:00.000Z";

function safeResolve(root, path) {
  if (isAbsolute(path)) throw new Error(`絶対パスは利用できません: ${path}`);
  const resolved = resolve(root, path);
  const childPath = relative(root, resolved);
  if (childPath === ".." || childPath.startsWith(`..${sep}`)) {
    throw new Error(`指定範囲の外を参照しています: ${path}`);
  }
  return resolved;
}

const hash = (value) => createHash("sha256").update(value).digest("hex");
const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`;
const bytes = (value) => Buffer.byteLength(value, "utf8");

const sourceIndex = JSON.parse(
  await readFile(safeResolve(sourceRoot, "questions/index.json"), "utf8"),
);
if (
  sourceIndex?.counts?.approved !== 200 ||
  !Array.isArray(sourceIndex.questions) ||
  sourceIndex.questions.length !== 200
) {
  throw new Error("承認済み200問の問題集ではありません。");
}

const versionRoot = safeResolve(outputRoot, contentVersion);
const questionRoot = safeResolve(versionRoot, "questions");
await mkdir(questionRoot, { recursive: true });

const summaries = [];
const files = [];
for (const item of [...sourceIndex.questions].sort((a, b) => a.id.localeCompare(b.id))) {
  if (item.status !== "approved" || item.humanApproved !== true) {
    throw new Error(`未承認の問題が含まれています: ${item.id}`);
  }
  const raw = JSON.parse(await readFile(safeResolve(sourceRoot, item.file), "utf8"));
  const revision = hash(
    JSON.stringify({
      id: raw.id,
      problemText: raw.problemText,
      answer: raw.answer,
      solutionSteps: raw.solutionSteps,
    }),
  );
  const question = {
    schemaVersion: "1.0.0",
    id: raw.id,
    revision,
    audience: {
      schoolStage: "elementary-school",
      levelNote: "小学3年生の夏休みに取り組める、やさしい計算問題。",
    },
    unit: raw.unit,
    gradeLevel: "elementary-grade-3",
    difficulty: raw.difficulty,
    sourceType: "original",
    problemType: raw.problemType,
    problemText: raw.problemText,
    problemLatex: raw.problemLatex,
    given: raw.given,
    answer: { finalAnswerLatex: raw.answer.finalAnswerLatex },
    solutionPlan: { summary: raw.solutionPlan.summary },
    solutionSteps: raw.solutionSteps,
    metadata: { tags: raw.metadata.tags },
  };
  const path = `questions/${raw.id}.json`;
  const text = jsonText(question);
  await writeFile(safeResolve(versionRoot, path), text);
  files.push({ path, sha256: hash(text), bytes: bytes(text) });
  summaries.push({
    id: question.id,
    revision,
    file: path,
    unit: question.unit,
    gradeLevel: question.gradeLevel,
    difficulty: question.difficulty,
    problemType: question.problemType,
    tags: question.metadata.tags,
  });
}

const indexText = jsonText({
  schemaVersion: "1.0.0",
  contentVersion,
  generatedAt,
  questionCount: summaries.length,
  questions: summaries,
});
await writeFile(safeResolve(versionRoot, "index.json"), indexText);
files.unshift({ path: "index.json", sha256: hash(indexText), bytes: bytes(indexText) });

const manifestText = jsonText({
  schemaVersion: "1.0.0",
  contentVersion,
  generatedAt,
  questionCount: summaries.length,
  packageChecksum: hash(files.map((file) => `${file.path}:${file.sha256}`).join("\n")),
  files,
});
await writeFile(safeResolve(versionRoot, "manifest.json"), manifestText);
await mkdir(outputRoot, { recursive: true });
await writeFile(
  safeResolve(outputRoot, "latest.json"),
  jsonText({
    schemaVersion: "1.0.0",
    contentVersion,
    manifest: `${contentVersion}/manifest.json`,
  }),
);

console.log(`${summaries.length}問を ${outputRoot} へ取り込みました。`);
