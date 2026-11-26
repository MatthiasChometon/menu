// Fails when a `pnpm-workspace.yaml` override is no longer needed.
//
// An override exists because a dependency's parent still asks for a version with
// a published advisory. Once the parent asks for a fixed one, the override only
// hides what is installed. For each override this copies the manifest, the
// lockfile and the workspace file to a temp folder, removes that one override,
// resolves again (lockfile only, nothing installed) and runs
// `pnpm audit --prod --audit-level=low`. If the audit stays clean, the override
// is dead weight: the script says so and exits 1.
//
// Usage: node ops/check-overrides.mjs <package folder> [...]
// Overrides in KEEP are not about advisories (they dedupe a package) and stay.
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const KEEP = new Set(["fastify"]);
const FILES = ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"];

const run = (cwd, args) => {
  try {
    execFileSync("pnpm", args, {
      cwd,
      stdio: "pipe",
      shell: process.platform === "win32",
    });
    return 0;
  } catch (error) {
    return error.status ?? 1;
  }
};

const overrideLines = (workspace) => {
  const lines = workspace.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith("overrides:"));
  if (start === -1) return [];
  const found = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i] !== "" && !lines[i].startsWith(" ")) break;
    const match = /^ {2}(['"]?)([^#\s'"].*?)\1: /.exec(lines[i]);
    if (match) found.push({ index: i, key: match[2] });
  }
  return found;
};

const withoutOverride = (workspace, index) =>
  workspace
    .split(/\r?\n/)
    .filter((_, i) => i !== index)
    .join("\n");

const isNeeded = (folder, workspace, index) => {
  const work = mkdtempSync(join(tmpdir(), "check-overrides-"));
  try {
    for (const file of FILES)
      if (existsSync(join(folder, file)))
        cpSync(join(folder, file), join(work, file));
    writeFileSync(
      join(work, "pnpm-workspace.yaml"),
      withoutOverride(workspace, index),
    );
    const resolved = run(work, [
      "install",
      "--lockfile-only",
      "--ignore-scripts",
      "--no-frozen-lockfile",
    ]);
    if (resolved !== 0) return true; // cannot resolve without it: still needed
    return run(work, ["audit", "--prod", "--audit-level=low"]) !== 0;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
};

const check = (folder) => {
  const workspace = readFileSync(join(folder, "pnpm-workspace.yaml"), "utf8");
  const unneeded = [];
  for (const { index, key } of overrideLines(workspace)) {
    if (KEEP.has(key)) continue;
    const needed = isNeeded(folder, workspace, index);
    console.log(
      `${folder}: ${key} ${needed ? "still needed" : "NOT NEEDED ANY MORE"}`,
    );
    if (!needed) unneeded.push(key);
  }
  return unneeded;
};

const failures = process.argv
  .slice(2)
  .flatMap((folder) =>
    check(resolve(folder)).map((key) => `${folder}: ${key}`),
  );
if (failures.length > 0) {
  console.error(
    `\nRemove from pnpm-workspace.yaml (the audit is clean without them):\n  ${failures.join("\n  ")}`,
  );
  process.exit(1);
}
