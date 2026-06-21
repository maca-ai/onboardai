import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  assert.match(output, /proof real-run <odoo\|notion> <run-id>/);
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

test("proof real-run fails closed for a missing real target-tool run directory", () => {
  const result = spawnSync("node", ["dist/index.js", "proof", "real-run", "odoo", "missing-real-run"], {
    cwd: packageRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /real run odoo\/missing-real-run failed/);
  assert.match(result.stderr, /final-screen\.png/);
  assert.match(result.stderr, /screen-input-evidence\.json/);
});

test("proof real-run validates complete real target-tool run artifacts without creating a summary", () => {
  const runId = "real-cli-validation-001";
  const captureId = "capture-real-cli-validation-001";
  const runDir = new URL(`evals/runs/odoo/${runId}/`, workspaceRoot);
  const normalizedDir = new URL(`captures/normalized/${captureId}/`, workspaceRoot);
  const redactedDir = new URL(`captures/redacted/${captureId}/`, workspaceRoot);
  const summaryPath = new URL("evals/reports/real-tool-proof-odoo.json", workspaceRoot);
  const summaryExistedBefore = existsSync(summaryPath);

  rmSync(runDir, { recursive: true, force: true });
  rmSync(normalizedDir, { recursive: true, force: true });
  rmSync(redactedDir, { recursive: true, force: true });
  mkdirSync(runDir, { recursive: true });
  mkdirSync(normalizedDir, { recursive: true });
  mkdirSync(redactedDir, { recursive: true });

  try {
    writeFileSync(
      new URL("step-trace.json", runDir),
      `${JSON.stringify(
        [
          {
            stepId: "step-001",
            title: "complete taught step",
            fromStateId: "state-001",
            toStateId: "state-002",
            currentFrame: `evals/runs/odoo/${runId}/redacted-frame-0001.png`,
            expectedVisibleText: ["demo"],
            matchedVisibleText: ["demo"],
            missingVisibleText: [],
            overlayConfidence: 0.9,
            overlayKind: "instruction",
            overlayMessage: "Use the visible control shown in the flow.",
            highlightedAnchorId: "anchor-001",
            actionPrimitive: {
              kind: "click",
              targetAnchorId: "anchor-001",
              manualOnly: true
            },
            success: true
          }
        ],
        null,
        2
      )}\n`
    );
    writeFileSync(new URL("final-screen.png", runDir), "redacted final screen marker\n");
    writeFileSync(new URL("redacted-frame-0001.png", runDir), "held-out redacted frame marker\n");
    writeFileSync(new URL("eval-recording.mp4", runDir), "real eval recording marker\n");
    writeFileSync(new URL("failure-log.md", runDir), "# failure log\n\nno failure observed\n");
    writeFileSync(new URL("reviewer-checklist.md", runDir), "# reviewer checklist\n\n- accepted: true\n");
    writeFileSync(
      new URL("outcome-evidence.json", runDir),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          tool: "odoo",
          substrate: "real-tool",
          completionRate: 1,
          stepCount: 1,
          stepsCompleted: 1,
          terminalBusinessStateReached: true,
          terminalMissingVisibleText: [],
          zeroHumanHelp: true,
          noInventedSteps: true,
          noPrivilegedAccess: true,
          heldOutFromCapture: true,
          seniorReviewerSignoff: true,
          belowThresholdEvents: 0,
          humanHelpIncidents: 0,
          inventedStepIncidents: 0,
          privilegedAccessViolations: [],
          overlayMisreads: [],
          finalScreenEvidencePath: `evals/runs/odoo/${runId}/final-screen.png`,
          stepTraceEvidencePath: `evals/runs/odoo/${runId}/step-trace.json`
        },
        null,
        2
      )}\n`
    );
    writeFileSync(new URL("manifest.json", normalizedDir), "{}\n");
    writeFileSync(new URL("frame-0001.png", redactedDir), "redacted frame marker\n");
    writeFileSync(
      new URL("screen-input-evidence.json", runDir),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          tool: "odoo",
          substrate: "real-tool",
          dataSource: "clean-seeded-demo-data",
          rawCapturePolicy: "unsafe-to-share-local-only-git-ignored",
          nativeScreenRecordingCaptured: true,
          keyboardEventLogCaptured: true,
          mouseEventLogCaptured: true,
          hardRedactionCompleted: true,
          noPrivilegedAccessUsed: true,
          screenRecordingEvidencePath: `evals/runs/odoo/${runId}/eval-recording.mp4`,
          normalizedCaptureManifestPath: `captures/normalized/${captureId}/manifest.json`,
          redactedFrameEvidencePaths: [`captures/redacted/${captureId}/frame-0001.png`]
        },
        null,
        2
      )}\n`
    );

    const result = spawnSync("node", ["dist/index.js", "proof", "real-run", "odoo", runId], {
      cwd: packageRoot,
      encoding: "utf8"
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /real run odoo\/real-cli-validation-001 valid: 7\/7 required artifacts/);
    assert.equal(existsSync(summaryPath), summaryExistedBefore);
  } finally {
    rmSync(runDir, { recursive: true, force: true });
    rmSync(normalizedDir, { recursive: true, force: true });
    rmSync(redactedDir, { recursive: true, force: true });
  }
});
