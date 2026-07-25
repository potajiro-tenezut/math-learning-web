import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(
  appRoot,
  process.argv[2] || process.env.CONTENT_EXPORT_DIR || "../../dist",
);
const targetRoot = resolve(appRoot, "public/content");

function safeResolve(root, path) {
  if (isAbsolute(path)) throw new Error(`絶対パスは利用できません: ${path}`);
  const resolved = resolve(root, path);
  const childPath = relative(root, resolved);
  if (childPath === ".." || childPath.startsWith(`..${sep}`)) {
    throw new Error(`コピー元の外を参照しています: ${path}`);
  }
  return resolved;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function copyRelative(path) {
  const source = safeResolve(sourceRoot, path);
  const target = safeResolve(targetRoot, path);
  await stat(source);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}

const latest = await readJson(safeResolve(sourceRoot, "latest.json"));
if (typeof latest.manifest !== "string" || typeof latest.contentVersion !== "string") {
  throw new Error("latest.json の形式が正しくありません。");
}
const manifest = await readJson(safeResolve(sourceRoot, latest.manifest));
if (!Array.isArray(manifest.files) || manifest.contentVersion !== latest.contentVersion) {
  throw new Error("manifest.json の形式またはバージョンが正しくありません。");
}

await copyRelative(latest.manifest);
for (const file of manifest.files) {
  if (!file || typeof file.path !== "string") throw new Error("manifest の file が不正です。");
  await copyRelative(join(dirname(latest.manifest), file.path));
}
// latest.json is deliberately copied last so an interrupted sync cannot activate a partial release.
await copyRelative("latest.json");

console.log(
  `${manifest.questionCount}問（${latest.contentVersion}）を ${targetRoot} へ同期しました。`,
);
