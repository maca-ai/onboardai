import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const packageRoot = new URL("..", import.meta.url);
const workspaceRoot = new URL("../../..", import.meta.url);

test("cli prints usage for empty invocation", () => {
  const output = execFileSync("node", ["dist/index.js"], {
    cwd: packageRoot,
    encoding: "utf8"
  });

  assert.match(output, /onboardai flow validate/);
});

test("proof fixtures materializes referenced shareable frame artifacts", () => {
  const output = execFileSync("node", ["dist/index.js", "proof", "fixtures"], {
    cwd: packageRoot,
    encoding: "utf8"
  });
  const audit = JSON.parse(readFileSync(new URL("evals/reports/fixture-proof-audit.json", workspaceRoot), "utf8"));
  const goalStatus = JSON.parse(readFileSync(new URL("evals/reports/full-goal-proof-status.json", workspaceRoot), "utf8"));

  assert.match(output, /fixture proof passed: 2\/2 tools/);
  assert.equal(existsSync(new URL("captures/redacted/odoo-qualify-opportunity/frame-0001.png", workspaceRoot)), true);
  assert.equal(existsSync(new URL("evals/fixtures/notion-update-task-status/held-out-frame-0001.png", workspaceRoot)), true);
  assert.equal(audit.shareableEvidence.passed, true);
  assert.equal(audit.summary.missingEvidenceReferences, 0);
  assert.equal(audit.summary.unsafeEvidenceReferences, 0);
  assert.equal(audit.summary.disallowedEvidenceReferences, 0);
  assert.ok(audit.summary.evidenceReferencesAudited > 20);
  assert.equal(goalStatus.fullGoalProven, false);
  assert.equal(goalStatus.fixtureProofPassed, true);
  assert.equal(goalStatus.realToolProofPassed, false);
  assert.equal(goalStatus.realToolProofs.length, 0);
  assert.equal(goalStatus.summary.missingRealToolProofs, 2);
});
