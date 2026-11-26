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
import { pathToFileURL } from "node:url";

const KEEP = new Set(["fastify"]);
const FILES = ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"];

// Outcomes of one audit: 'clean' (no advisory), 'vulnerable' (advisories found),
// 'error' (no usable audit report: network, registry, resolve). Only a parsed
// report counts; a failing command without one is never read as "needed".
const SEVERITIES = ["low", "moderate", "high", "critical"];

export const classifyAudit = (stdout) => {
  try {
    const report = JSON.parse(stdout);
    if (report === null || typeof report !== "object" || "error" in report) {
      return "error";
    }
    const counts = SEVERITIES.map((s) => report.metadata?.vulnerabilities?.[s]);
    if (!counts.every((n) => typeof n === "number" && Number.isFinite(n))) {
      return "error";
    }
    return counts.some((n) => n > 0) ? "vulnerable" : "clean";
  } catch {
    return "error";
  }
};

const run = (cwd, args) => {
  try {
    return {
      status: 0,
      stdout: execFileSync("pnpm", args, {
        cwd,
        stdio: "pipe",
        shell: process.platform === "win32",
      }).toString(),
    };
  } catch (error) {
    return { status: error.status ?? 1, stdout: String(error.stdout ?? "") };
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

// 'needed' | 'unneeded' | 'error'. One retry: the registry has flaky moments.
export const verdict = (attempt) => {
  const first = attempt();
  return first === "error" ? attempt() : first;
};

const attemptWithout = (folder, workspace, index) => () => {
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
    if (resolved.status !== 0) return "error";
    const audit = classifyAudit(
      run(work, ["audit", "--prod", "--audit-level=low", "--json"]).stdout,
    );
    return audit === "vulnerable"
      ? "needed"
      : audit === "clean"
        ? "unneeded"
        : "error";
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
};

const check = (folder) => {
  const workspace = readFileSync(join(folder, "pnpm-workspace.yaml"), "utf8");
  const result = { unneeded: [], errors: [] };
  for (const { index, key } of overrideLines(workspace)) {
    if (KEEP.has(key)) continue;
    const outcome = verdict(attemptWithout(folder, workspace, index));
    console.log(
      `${folder}: ${key} ${{ needed: "still needed", unneeded: "NOT NEEDED ANY MORE", error: "COULD NOT BE CHECKED" }[outcome]}`,
    );
    if (outcome === "unneeded") result.unneeded.push(key);
    if (outcome === "error") result.errors.push(key);
  }
  return result;
};

const main = () => {
  const results = process.argv
    .slice(2)
    .map((folder) => ({ folder, ...check(resolve(folder)) }));
  const list = (field) =>
    results
      .flatMap((r) => r[field].map((key) => `${r.folder}: ${key}`))
      .join("\n  ");
  const errors = list("errors");
  const unneeded = list("unneeded");
  if (errors) {
    console.error(
      `\nNo usable audit report (network, registry or resolve error, retried once); nothing was concluded for:\n  ${errors}`,
    );
  }
  if (unneeded) {
    console.error(
      `\nRemove from pnpm-workspace.yaml (the audit is clean without them):\n  ${unneeded}`,
    );
  }
  if (errors || unneeded) process.exit(1);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
