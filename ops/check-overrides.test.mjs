import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyAudit, verdict } from "./check-overrides.mjs";

const report = (vulnerabilities) =>
  JSON.stringify({ metadata: { vulnerabilities } });

test("needed: the audit without the override reports advisories", () => {
  assert.equal(
    classifyAudit(report({ low: 0, moderate: 1, high: 0, critical: 0 })),
    "vulnerable",
  );
});

test("not needed: the audit without the override is clean", () => {
  assert.equal(
    classifyAudit(report({ low: 0, moderate: 0, high: 0, critical: 0 })),
    "clean",
  );
});

test("error: no usable report (network down, registry error, empty output)", () => {
  assert.equal(classifyAudit(""), "error");
  assert.equal(
    classifyAudit('{"error":{"code":"ERR_PNPM_AUDIT_BAD_RESPONSE"}}'),
    "error",
  );
  assert.equal(classifyAudit("<html>502</html>"), "error");
});

test("an error is retried once, then reported as an error, never as needed", () => {
  let calls = 0;
  assert.equal(
    verdict(() => ((calls += 1), "error")),
    "error",
  );
  assert.equal(calls, 2);
});

test("a flaky first attempt is recovered by the retry", () => {
  const answers = ["error", "unneeded"];
  assert.equal(
    verdict(() => answers.shift()),
    "unneeded",
  );
});
