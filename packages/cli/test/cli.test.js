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
  assert.match(output, /capture normalize-run <odoo\|notion> <run-id>/);
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
  assert.equal(existsSync(new URL("evals/runs/odoo/fixture-odoo-qualify-001/capture-manifest.json", workspaceRoot)), true);
  assert.equal(existsSync(new URL("evals/runs/odoo/fixture-odoo-qualify-001/redacted-frame-0001.png", workspaceRoot)), true);
  assert.equal(existsSync(new URL("evals/fixtures/notion-update-task-status/held-out-frame-0001.png", workspaceRoot)), true);
  assert.match(
    readFileSync(new URL("evals/runs/odoo/fixture-odoo-qualify-001/capture-manifest.json", workspaceRoot), "utf8"),
    /evals\/runs\/odoo\/fixture-odoo-qualify-001\/redacted-frame-0001\.png/
  );
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

test("proof status reports fixture proof separately from missing real target-tool proof", () => {
  execFileSync("node", ["dist/index.js", "proof", "fixtures"], {
    cwd: packageRoot,
    encoding: "utf8"
  });

  const result = spawnSync("node", ["dist/index.js", "proof", "status"], {
    cwd: packageRoot,
    encoding: "utf8"
  });
  const goalStatus = JSON.parse(readFileSync(new URL("evals/reports/full-goal-proof-status.json", workspaceRoot), "utf8"));

  assert.equal(result.status, 1);
  assert.match(result.stdout, /full goal not proven/);
  assert.match(result.stdout, /fixture proof passed/);
  assert.match(result.stdout, /real-tool proof failed: 0\/2 tools/);
  assert.match(result.stdout, /odoo: missing real target-tool held-out teaching eval evidence/);
  assert.match(result.stdout, /odoo: missing native screen-plus-input capture evidence/);
  assert.match(result.stdout, /notion: missing real target-tool held-out teaching eval evidence/);
  assert.match(result.stdout, /notion: missing native screen-plus-input capture evidence/);
  assert.equal(goalStatus.fullGoalProven, false);
  assert.equal(goalStatus.fixtureProofPassed, true);
  assert.equal(goalStatus.realToolProofPassed, false);
  assert.equal(goalStatus.realToolProofs.length, 0);
});

test("proof scan-shareable passes current redacted shareable artifacts", () => {
  execFileSync("node", ["dist/index.js", "proof", "fixtures"], {
    cwd: packageRoot,
    encoding: "utf8"
  });

  const result = spawnSync("node", ["dist/index.js", "proof", "scan-shareable"], {
    cwd: packageRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /shareable artifact scan passed: \d+ file\(s\) scanned/);
});

test("proof scan-shareable rejects forbidden secrets and unsafe capture paths", () => {
  const badArtifact = new URL("evals/reports/shareable-scan-validation.md", workspaceRoot);
  writeFileSync(
    badArtifact,
    "email: reviewer@example.com\npassword: hunter2\ntoken: sk-live-1234567890\nraw: captures/raw/demo/frame-0001.png\n"
  );

  try {
    const result = spawnSync("node", ["dist/index.js", "proof", "scan-shareable"], {
      cwd: packageRoot,
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /shareable artifact scan failed/);
    assert.match(result.stderr, /shareable-scan-validation\.md: email address/);
    assert.match(result.stderr, /shareable-scan-validation\.md: password/);
    assert.match(result.stderr, /shareable-scan-validation\.md: token/);
    assert.match(result.stderr, /shareable-scan-validation\.md: unsafe capture path/);
  } finally {
    rmSync(badArtifact, { force: true });
  }
});

test("capture normalize-run writes fixture run-local manifest without real proof summary", () => {
  const runId = "fixture-run-local-cli-001";
  const runDir = new URL(`evals/runs/odoo/${runId}/`, workspaceRoot);
  const summaryPath = new URL("evals/reports/real-tool-proof-odoo.json", workspaceRoot);
  const summaryBefore = existsSync(summaryPath) ? readFileSync(summaryPath, "utf8") : null;

  rmSync(runDir, { recursive: true, force: true });

  try {
    const result = spawnSync("node", ["dist/index.js", "capture", "normalize-run", "odoo", runId], {
      cwd: packageRoot,
      encoding: "utf8"
    });
    const manifestPath = new URL("capture-manifest.json", runDir);
    const framePath = new URL("redacted-frame-0001.png", runDir);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

    assert.equal(result.status, 0);
    assert.match(result.stdout, /normalized odoo fixture run capture to evals\/runs\/odoo\/fixture-run-local-cli-001\/capture-manifest\.json/);
    assert.equal(existsSync(manifestPath), true);
    assert.equal(existsSync(framePath), true);
    assert.equal(JSON.stringify(manifest).includes("captures/raw/"), false);
    assert.equal(manifest.redactedFrames[0].path, `evals/runs/odoo/${runId}/redacted-frame-0001.png`);
    assert.equal(existsSync(summaryPath), summaryBefore !== null);
    if (summaryBefore !== null) {
      assert.equal(readFileSync(summaryPath, "utf8"), summaryBefore);
    }
  } finally {
    rmSync(runDir, { recursive: true, force: true });
    if (summaryBefore === null) {
      rmSync(summaryPath, { force: true });
    } else {
      writeFileSync(summaryPath, summaryBefore);
    }
  }
});

test("proof real-run init creates a non-passing real target-tool run skeleton", () => {
  const runId = "real-init-validation-001";
  const runDir = new URL(`evals/runs/notion/${runId}/`, workspaceRoot);
  const summaryPath = new URL("evals/reports/real-tool-proof-notion.json", workspaceRoot);
  const summaryBefore = existsSync(summaryPath) ? readFileSync(summaryPath, "utf8") : null;

  rmSync(runDir, { recursive: true, force: true });

  try {
    const initResult = spawnSync("node", ["dist/index.js", "proof", "real-run", "init", "notion", runId], {
      cwd: packageRoot,
      encoding: "utf8"
    });

    assert.equal(initResult.status, 0);
    assert.match(initResult.stdout, /initialized real run notion\/real-init-validation-001/);
    assert.equal(existsSync(new URL("step-trace.json", runDir)), true);
    assert.equal(existsSync(new URL("flow-evidence.json", runDir)), true);
    assert.equal(existsSync(new URL("capture-readiness.json", runDir)), true);
    assert.equal(existsSync(new URL("capture-manifest.json", runDir)), true);
    assert.equal(existsSync(new URL("screen-input-evidence.json", runDir)), true);
    assert.equal(existsSync(new URL("outcome-evidence.json", runDir)), true);
    assert.match(readFileSync(new URL("flow-evidence.json", runDir), "utf8"), /flows\/notion\/update-task-status\.flow\.md/);
    assert.match(readFileSync(new URL("capture-manifest.json", runDir), "utf8"), /"tool": "notion"/);
    assert.match(readFileSync(new URL("capture-manifest.json", runDir), "utf8"), /"flowId": "notion-update-task-status"/);
    assert.match(readFileSync(new URL("capture-manifest.json", runDir), "utf8"), /evals\/runs\/notion\/real-init-validation-001\/redacted-frame-0001\.png/);
    assert.match(readFileSync(new URL("screen-input-evidence.json", runDir), "utf8"), /"tool": "notion"/);
    assert.match(readFileSync(new URL("screen-input-evidence.json", runDir), "utf8"), /evals\/runs\/notion\/real-init-validation-001\/capture-readiness\.json/);
    assert.match(readFileSync(new URL("outcome-evidence.json", runDir), "utf8"), /evals\/runs\/notion\/real-init-validation-001\/step-trace\.json/);

    const validationResult = spawnSync("node", ["dist/index.js", "proof", "real-run", "notion", runId], {
      cwd: packageRoot,
      encoding: "utf8"
    });

    assert.equal(validationResult.status, 1);
    assert.match(validationResult.stderr, /final-screen\.png/);
    assert.match(validationResult.stderr, /eval-recording\.mp4/);
    assert.match(validationResult.stderr, /reviewer checklist must contain accepted: true/);
    assert.equal(existsSync(summaryPath), summaryBefore !== null);

    const secondInitResult = spawnSync("node", ["dist/index.js", "proof", "real-run", "init", "notion", runId], {
      cwd: packageRoot,
      encoding: "utf8"
    });
    assert.equal(secondInitResult.status, 1);
    assert.match(secondInitResult.stderr, /refusing to overwrite run evidence/);
  } finally {
    rmSync(runDir, { recursive: true, force: true });
    if (summaryBefore === null) {
      rmSync(summaryPath, { force: true });
    } else {
      writeFileSync(summaryPath, summaryBefore);
    }
  }
});

test("proof real-run init rejects unsafe run ids", () => {
  const result = spawnSync("node", ["dist/index.js", "proof", "real-run", "init", "odoo", "../bad"], {
    cwd: packageRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /usage: onboardai proof real-run init/);
  assert.equal(existsSync(new URL("evals/runs/bad/", workspaceRoot)), false);
});

test("proof real-run fails closed for a missing real target-tool run directory", () => {
  const summaryPath = new URL("evals/reports/real-tool-proof-odoo.json", workspaceRoot);
  const summaryBefore = existsSync(summaryPath) ? readFileSync(summaryPath, "utf8") : null;
  const result = spawnSync("node", ["dist/index.js", "proof", "real-run", "odoo", "missing-real-run"], {
    cwd: packageRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /real run odoo\/missing-real-run failed/);
  assert.match(result.stderr, /final-screen\.png/);
  assert.match(result.stderr, /screen-input-evidence\.json/);

  const writeResult = spawnSync("node", ["dist/index.js", "proof", "real-run", "odoo", "missing-real-run", "--write-summary"], {
    cwd: packageRoot,
    encoding: "utf8"
  });

  assert.equal(writeResult.status, 1);
  assert.match(writeResult.stderr, /real run odoo\/missing-real-run failed/);
  assert.equal(existsSync(summaryPath), summaryBefore !== null);
  if (summaryBefore !== null) {
    assert.equal(readFileSync(summaryPath, "utf8"), summaryBefore);
  }
});

test("proof real-run validates complete real target-tool run artifacts and writes summary only when requested", () => {
  const runId = "real-cli-validation-001";
  const runDir = new URL(`evals/runs/odoo/${runId}/`, workspaceRoot);
  const summaryPath = new URL("evals/reports/real-tool-proof-odoo.json", workspaceRoot);
  const summaryExistedBefore = existsSync(summaryPath);
  const summaryBefore = summaryExistedBefore ? readFileSync(summaryPath, "utf8") : null;

  rmSync(runDir, { recursive: true, force: true });
  if (!summaryExistedBefore) {
    rmSync(summaryPath, { force: true });
  }
  mkdirSync(runDir, { recursive: true });

  try {
    writeFileSync(
      new URL("step-trace.json", runDir),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          steps: [
            {
              stepId: "step-001",
              title: "open the opportunity",
              fromStateId: "state-001",
              toStateId: "state-002",
              currentFrame: `evals/runs/odoo/${runId}/redacted-frame-0001.png`,
              expectedVisibleText: ["pipeline", "demo opportunity", "new"],
              matchedVisibleText: ["pipeline", "demo opportunity", "new"],
              missingVisibleText: [],
              overlayConfidence: 0.9,
              overlayKind: "instruction",
              overlayCanAutomateInput: false,
              overlayMessage: "select the opportunity card named demo opportunity.",
              highlightedAnchorId: "opportunity-card",
              actionPrimitive: {
                kind: "click",
                targetAnchorId: "opportunity-card",
                manualOnly: true
              },
              success: true
            },
            {
              stepId: "step-002",
              title: "choose qualified stage",
              fromStateId: "state-002",
              toStateId: "state-003",
              currentFrame: `evals/runs/odoo/${runId}/redacted-frame-0002.png`,
              expectedVisibleText: ["demo opportunity", "stage", "new", "qualified"],
              matchedVisibleText: ["demo opportunity", "stage", "new", "qualified"],
              missingVisibleText: [],
              overlayConfidence: 0.9,
              overlayKind: "instruction",
              overlayCanAutomateInput: false,
              overlayMessage: "select the qualified stage.",
              highlightedAnchorId: "qualified-stage",
              actionPrimitive: {
                kind: "click",
                targetAnchorId: "qualified-stage",
                manualOnly: true
              },
              success: true
            },
            {
              stepId: "step-003",
              title: "save the qualified stage",
              fromStateId: "state-003",
              toStateId: "state-004",
              currentFrame: `evals/runs/odoo/${runId}/redacted-frame-0003.png`,
              expectedVisibleText: ["demo opportunity", "stage", "qualified", "unsaved changes"],
              matchedVisibleText: ["demo opportunity", "stage", "qualified", "unsaved changes"],
              missingVisibleText: [],
              overlayConfidence: 0.9,
              overlayKind: "instruction",
              overlayCanAutomateInput: false,
              overlayMessage: "save the opportunity so the qualified stage remains visible.",
              highlightedAnchorId: "save-button",
              actionPrimitive: {
                kind: "click",
                targetAnchorId: "save-button",
                manualOnly: true
              },
              success: true
            },
          ]
        },
        null,
        2
      )}\n`
    );
    writeFileSync(new URL("final-screen.png", runDir), "redacted final screen marker\n");
    writeFileSync(new URL("redacted-frame-0001.png", runDir), "held-out redacted frame marker\n");
    writeFileSync(new URL("redacted-frame-0002.png", runDir), "held-out redacted frame marker\n");
    writeFileSync(new URL("redacted-frame-0003.png", runDir), "held-out redacted frame marker\n");
    writeFileSync(new URL("eval-recording.mp4", runDir), "real eval recording marker\n");
    writeFileSync(
      new URL("failure-log.md", runDir),
      [
        "# failure log",
        "",
        "## result",
        "",
        "- passed: true",
        "- terminal state reached: true",
        "- zero human help: true",
        "- no invented steps: true",
        "- no privileged access: true",
        "",
        "## observed failure",
        "",
        "no failure observed",
        ""
      ].join("\n")
    );
    writeFileSync(
      new URL("reviewer-checklist.md", runDir),
      [
        "# reviewer checklist",
        "",
        "- tool: odoo",
        "- flow id: odoo-qualify-opportunity",
        `- run id: ${runId}`,
        "- reviewer: senior-reviewer-001",
        "- date: 2026-06-23",
        "",
        "- step-001: accepted",
        "- step-002: accepted",
        "- step-003: accepted",
        "- accepted: true",
        "- rejected: false",
        ""
      ].join("\n")
    );
    writeFileSync(
      new URL("flow-evidence.json", runDir),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          tool: "odoo",
          substrate: "real-tool",
          flowPath: "flows/odoo/qualify-opportunity.flow.md",
          flowId: "odoo-qualify-opportunity",
          terminalBusinessState: "demo opportunity visible with stage qualified",
          stepIds: ["step-001", "step-002", "step-003"]
        },
        null,
        2
      )}\n`
    );
    writeFileSync(
      new URL("outcome-evidence.json", runDir),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          tool: "odoo",
          substrate: "real-tool",
          evaluatorRole: "first-time-user",
          completionRate: 1,
          stepCount: 3,
          stepsCompleted: 3,
          terminalBusinessStateReached: true,
          terminalBusinessState: "demo opportunity visible with stage qualified",
          terminalExpectedVisibleText: ["demo opportunity", "qualified", "saved"],
          terminalMatchedVisibleText: ["demo opportunity", "qualified", "saved"],
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
          stepTraceEvidencePath: `evals/runs/odoo/${runId}/step-trace.json`,
          heldOutEvidencePaths: [`evals/runs/odoo/${runId}/final-screen.png`, `evals/runs/odoo/${runId}/eval-recording.mp4`]
        },
        null,
        2
      )}\n`
    );
    writeFileSync(
      new URL("capture-readiness.json", runDir),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          tool: "odoo",
          substrate: "real-tool",
          adapterKind: "native",
          adapterName: "onboardai-native-capture",
          adapterVersion: "0.0.0-local",
          platform: "macos",
          docsVerified: true,
          verifiedDocReferences: [
            {
              sourceType: "context7",
              reference: "/websites/v2_tauri_app",
              appliesToAdapterVersion: "0.0.0-local",
              behaviors: ["screen-recording", "keyboard-event-log", "mouse-event-log", "redacted-frame-output", "raw-artifacts-ignored"]
            }
          ],
          screenRecording: true,
          keyboardEventLog: true,
          mouseEventLog: true,
          redactedFrameOutput: true,
          rawArtifactsIgnored: true,
          blockers: []
        },
        null,
        2
      )}\n`
    );
    writeFileSync(
      new URL("capture-manifest.json", runDir),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          captureId: `${runId}-capture`,
          flowId: "odoo-qualify-opportunity",
          flowPath: "flows/odoo/qualify-opportunity.flow.md",
          tool: "odoo",
          generatedAt: "2026-06-21T00:00:00.000Z",
          dataClass: "clean-demo",
          rawCapturePolicy: "unsafe-to-share-local-only",
          redactionPolicy: "hard-secret-redaction-v0",
          rawCaptureSummary: {
            screenRecordingCaptured: true,
            keyboardEventLogCaptured: true,
            mouseEventLogCaptured: true,
            humanNotesCaptured: true
          },
          rawArtifacts: [
            { kind: "screen-recording", safety: "unsafe-to-share-local-only", gitPolicy: "excluded-from-git" },
            { kind: "keyboard-event-log", safety: "unsafe-to-share-local-only", gitPolicy: "excluded-from-git" },
            { kind: "mouse-event-log", safety: "unsafe-to-share-local-only", gitPolicy: "excluded-from-git" },
            { kind: "human-context-notes", safety: "unsafe-to-share-local-only", gitPolicy: "excluded-from-git" }
          ],
          redactedFrames: [
            {
              frameId: "frame-0001",
              path: `evals/runs/odoo/${runId}/redacted-frame-0001.png`,
              visibleText: ["demo opportunity", "qualified"]
            }
          ],
          anchors: [],
          inputEvidence: [
            { stepId: "step-001", inputEvents: [{ kind: "mouse", event: "click", anchorId: "opportunity-card" }] },
            { stepId: "step-002", inputEvents: [{ kind: "mouse", event: "click", anchorId: "qualified-stage" }] },
            { stepId: "step-003", inputEvents: [{ kind: "mouse", event: "click", anchorId: "save-button" }] }
          ],
          redaction: {
            replacements: [],
            businessSensitiveTags: []
          }
        },
        null,
        2
      )}\n`
    );
    writeFileSync(
      new URL("screen-input-evidence.json", runDir),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          tool: "odoo",
          substrate: "real-tool",
          dataSource: "clean-seeded-demo-data",
          rawCapturePolicy: "unsafe-to-share-local-only-git-ignored",
          captureAdapterName: "onboardai-native-capture",
          captureAdapterVersion: "0.0.0-local",
          nativeScreenRecordingCaptured: true,
          keyboardEventLogCaptured: true,
          mouseEventLogCaptured: true,
          hardRedactionCompleted: true,
          noPrivilegedAccessUsed: true,
          noPlaywrightSelectorsUsed: true,
          noComputerUseAutomationUsed: true,
          captureReadinessEvidencePath: `evals/runs/odoo/${runId}/capture-readiness.json`,
          screenRecordingEvidencePath: `evals/runs/odoo/${runId}/eval-recording.mp4`,
          normalizedCaptureManifestPath: `evals/runs/odoo/${runId}/capture-manifest.json`,
          redactedFrameEvidencePaths: [`evals/runs/odoo/${runId}/redacted-frame-0001.png`]
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
    assert.match(result.stdout, /real run odoo\/real-cli-validation-001 valid: 9\/9 required artifacts/);
    assert.equal(existsSync(summaryPath), summaryExistedBefore);

    const writeResult = spawnSync("node", ["dist/index.js", "proof", "real-run", "odoo", runId, "--write-summary"], {
      cwd: packageRoot,
      encoding: "utf8"
    });
    const summary = JSON.parse(readFileSync(summaryPath, "utf8"));

    assert.equal(writeResult.status, 0);
    assert.match(writeResult.stdout, /real run odoo\/real-cli-validation-001 valid: 9\/9 required artifacts/);
    assert.match(writeResult.stdout, /wrote evals\/reports\/real-tool-proof-odoo\.json/);
    assert.equal(summary.tool, "odoo");
    assert.equal(summary.substrate, "real-tool");
    assert.equal(summary.evidencePath, `evals/runs/odoo/${runId}/step-trace.json`);
    assert.equal(summary.heldOutTeachingEvalPassed, true);
    assert.equal(summary.nativeScreenPlusInputCaptureVerified, true);
    assert.equal(summary.runEvidenceAudited, undefined);
  } finally {
    rmSync(runDir, { recursive: true, force: true });
    if (summaryBefore === null) {
      rmSync(summaryPath, { force: true });
    } else {
      writeFileSync(summaryPath, summaryBefore);
    }
  }
});
