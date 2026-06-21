import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDeterministicFixture } from "@onboardai/fixtures";
import { parseFlowMarkdown } from "@onboardai/flow";
import {
  auditCaptureTeachGoalStatus,
  auditEvalProofResults,
  auditRealToolRunArtifacts,
  auditShareableEvidencePaths,
  matchScreenState,
  parseRealToolProofEvidenceFile,
  runDeterministicEval
} from "../dist/index.js";

const workspaceRoot = new URL("../../..", import.meta.url);

test("odoo-like fixture eval reaches the terminal business state without privileged access", () => {
  const fixture = getDeterministicFixture("odoo");
  const flow = readFixtureFlow(fixture.flowPath);
  const result = runDeterministicEval(flow, fixture);

  assert.equal(result.passed, true);
  assert.equal(result.terminalBusinessStateReached, true);
  assert.equal(result.stepsCompleted, 3);
  assert.equal(result.humanHelpIncidents, 0);
  assert.equal(result.privilegedAccessViolations.length, 0);
  assert.equal(result.inventedStepIncidents, 0);
  assert.equal(result.heldOutFromCapture, true);
  assert.deepEqual(result.terminalMissingVisibleText, []);
  assert.deepEqual(result.terminalExpectedVisibleText, ["demo opportunity", "stage", "qualified", "saved"]);
  assert.equal(result.trace.every((entry) => entry.currentFrame.startsWith("evals/fixtures/")), true);
  assert.deepEqual(result.overlayConfidencePerStep.map((entry) => entry.confidence), [1, 1, 1]);
});

test("notion-like fixture eval reaches the terminal business state without privileged access", () => {
  const fixture = getDeterministicFixture("notion");
  const flow = readFixtureFlow(fixture.flowPath);
  const result = runDeterministicEval(flow, fixture);

  assert.equal(result.passed, true);
  assert.equal(result.terminalBusinessStateReached, true);
  assert.equal(result.stepsCompleted, 3);
  assert.equal(result.humanHelpIncidents, 0);
  assert.equal(result.privilegedAccessViolations.length, 0);
  assert.equal(result.inventedStepIncidents, 0);
  assert.equal(result.heldOutFromCapture, true);
  assert.deepEqual(result.terminalMissingVisibleText, []);
  assert.deepEqual(result.terminalExpectedVisibleText, ["demo task", "status", "ready for review"]);
  assert.equal(result.trace.every((entry) => entry.currentFrame.startsWith("evals/fixtures/")), true);
  assert.deepEqual(result.overlayConfidencePerStep.map((entry) => entry.confidence), [1, 1, 1]);
});

test("screen-state matcher reports below-threshold confidence from visible text only", () => {
  const fixture = getDeterministicFixture("odoo");
  const flow = readFixtureFlow(fixture.flowPath);
  const match = matchScreenState(flow.steps[0], {
    stateId: "wrong-screen",
    frame: "captures/redacted/wrong/frame-0001.png",
    visibleText: ["pipeline"],
    regions: []
  });

  assert.equal(match.confidence, 1 / 3);
  assert.deepEqual(match.missingVisibleText, ["demo opportunity", "new"]);
});

test("ambiguous fixture transitions fail instead of guessing", () => {
  const fixture = getDeterministicFixture("odoo");
  const flow = readFixtureFlow(fixture.flowPath);
  const ambiguousFixture = {
    ...fixture,
    transitions: [...fixture.transitions, fixture.transitions[0]]
  };
  const result = runDeterministicEval(flow, ambiguousFixture);

  assert.equal(result.passed, false);
  assert.equal(result.firstStuckStep, "step-001");
  assert.match(result.trace[0].failureReason, /ambiguous/);
});

test("terminal business state fails when held-out final screen misses required terminal text", () => {
  const fixture = getDeterministicFixture("odoo");
  const flow = readFixtureFlow(fixture.flowPath);
  const brokenFixture = {
    ...fixture,
    observations: fixture.observations.map((observation) =>
      observation.stateId === fixture.terminalStateId
        ? { ...observation, visibleText: observation.visibleText.filter((text) => text !== "stage") }
        : observation
    )
  };
  const result = runDeterministicEval(flow, brokenFixture);

  assert.equal(result.passed, false);
  assert.equal(result.terminalBusinessStateReached, false);
  assert.deepEqual(result.terminalMissingVisibleText, ["stage"]);
  assert.equal(result.stepsCompleted, 3);
});

test("proof audit accepts only complete held-out two-tool eval evidence", () => {
  const odooFixture = getDeterministicFixture("odoo");
  const notionFixture = getDeterministicFixture("notion");
  const odooFlow = readFixtureFlow(odooFixture.flowPath);
  const notionFlow = readFixtureFlow(notionFixture.flowPath);
  const audit = auditEvalProofResults([
    runDeterministicEval(odooFlow, odooFixture),
    runDeterministicEval(notionFlow, notionFixture)
  ]);

  assert.equal(audit.passed, true);
  assert.deepEqual(audit.requiredTools, ["odoo", "notion"]);
  assert.deepEqual(audit.toolsAudited, ["odoo", "notion"]);
  assert.equal(audit.findings.length, 0);
  assert.equal(audit.summary.toolsPassed, 2);
  assert.equal(audit.summary.stepsCompleted, 6);
});

test("proof audit fails if a required eval invariant is missing", () => {
  const fixture = getDeterministicFixture("odoo");
  const flow = readFixtureFlow(fixture.flowPath);
  const result = runDeterministicEval(flow, fixture);
  const audit = auditEvalProofResults([
    { ...result, heldOutFromCapture: false },
    runDeterministicEval(readFixtureFlow(getDeterministicFixture("notion").flowPath), getDeterministicFixture("notion"))
  ]);

  assert.equal(audit.passed, false);
  assert.equal(audit.findings.some((finding) => finding.message.includes("held out")), true);
});

test("full goal status remains unproven when only fixture proof passes", () => {
  const fixtureAudit = passingFixtureAudit();
  const status = auditCaptureTeachGoalStatus({ fixtureAudit });

  assert.equal(status.fullGoalProven, false);
  assert.equal(status.fixtureProofPassed, true);
  assert.equal(status.realToolProofPassed, false);
  assert.equal(status.summary.realToolsPassed, 0);
  assert.equal(status.findings.some((finding) => finding.tool === "odoo" && finding.message.includes("missing real target-tool")), true);
  assert.equal(status.findings.some((finding) => finding.tool === "notion" && finding.message.includes("missing native screen-plus-input")), true);
});

test("full goal status passes only with real proof for both required tools", () => {
  const status = auditCaptureTeachGoalStatus({
    fixtureAudit: passingFixtureAudit(),
    realToolProofs: [
      realToolProof("odoo"),
      realToolProof("notion")
    ]
  });

  assert.equal(status.fullGoalProven, true);
  assert.equal(status.fixtureProofPassed, true);
  assert.equal(status.realToolProofPassed, true);
  assert.equal(status.findings.length, 0);
  assert.equal(status.summary.realToolsPassed, 2);
  assert.equal(status.summary.nativeCaptureVerifiedTools, 2);
});

test("real proof evidence file parser accepts a complete real target proof contract", () => {
  const parsed = parseRealToolProofEvidenceFile(realToolProof("odoo"), "evals/reports/real-tool-proof-odoo.json");

  assert.equal(parsed.proofs.length, 1);
  assert.equal(parsed.findings.length, 0);
  assert.equal(parsed.proofs[0].tool, "odoo");
  assert.equal(parsed.proofs[0].nativeScreenPlusInputCaptureVerified, true);
});

test("real proof evidence file parser rejects malformed proof contracts", () => {
  const parsed = parseRealToolProofEvidenceFile(
    {
      tool: "odoo",
      substrate: "fixture",
      heldOutTeachingEvalPassed: true
    },
    "evals/reports/real-tool-proof-odoo.json"
  );

  assert.equal(parsed.proofs.length, 0);
  assert.equal(parsed.findings.length > 0, true);
  assert.equal(parsed.findings.some((finding) => finding.message.includes("substrate")), true);
  assert.equal(parsed.findings.some((finding) => finding.message.includes("nativeScreenPlusInputCaptureVerified")), true);
});

test("real proof evidence file parser rejects incomplete summaries and misplaced evidence paths", () => {
  const parsed = parseRealToolProofEvidenceFile(
    {
      tool: "odoo",
      substrate: "real-tool",
      heldOutTeachingEvalPassed: true,
      nativeScreenPlusInputCaptureVerified: true,
      terminalBusinessStateReached: true,
      zeroHumanHelp: true,
      noInventedSteps: true,
      noPrivilegedAccess: true,
      evidencePath: "evals/reports/odoo-run.md"
    },
    "evals/reports/real-tool-proof-odoo.json"
  );

  assert.equal(parsed.proofs.length, 0);
  assert.equal(parsed.findings.some((finding) => finding.message.includes("seniorReviewerSignoff")), true);
  assert.equal(parsed.findings.some((finding) => finding.message.includes("evals/runs/odoo")), true);
  assert.equal(parsed.findings.some((finding) => finding.message.includes("step-trace.json")), true);
});

test("real proof evidence file parser rejects a summary pointing at the wrong target tool run", () => {
  const parsed = parseRealToolProofEvidenceFile(
    {
      ...realToolProof("odoo"),
      evidencePath: "evals/runs/notion/real-proof/step-trace.json"
    },
    "evals/reports/real-tool-proof-odoo.json"
  );

  assert.equal(parsed.proofs.length, 0);
  assert.equal(parsed.findings.some((finding) => finding.message.includes("evals/runs/odoo")), true);
});

test("full goal status rejects incomplete real proof summaries without weakening fixture proof", () => {
  const status = auditCaptureTeachGoalStatus({
    fixtureAudit: passingFixtureAudit(),
    realToolProofs: [
      {
        ...realToolProof("odoo"),
        zeroHumanHelp: false,
        evidencePath: "captures/raw/odoo/step-trace.json"
      },
      realToolProof("notion")
    ]
  });

  assert.equal(status.fullGoalProven, false);
  assert.equal(status.fixtureProofPassed, true);
  assert.equal(status.realToolProofPassed, false);
  assert.equal(status.summary.realToolsPassed, 1);
  assert.equal(status.findings.some((finding) => finding.tool === "odoo" && finding.message.includes("human help")), true);
  assert.equal(status.findings.some((finding) => finding.tool === "odoo" && finding.message.includes("evals/runs")), true);
});

test("real target-tool run artifact audit accepts complete screen-plus-input evidence", () => {
  const proof = realToolProof("odoo");
  const existing = new Set([
    "evals/runs/odoo/real-proof/step-trace.json",
    "evals/runs/odoo/real-proof/final-screen.png",
    "evals/runs/odoo/real-proof/eval-recording.mp4",
    "evals/runs/odoo/real-proof/failure-log.md",
    "evals/runs/odoo/real-proof/reviewer-checklist.md",
    "evals/runs/odoo/real-proof/screen-input-evidence.json",
    "evals/runs/odoo/real-proof/redacted-frame-0001.png",
    "captures/normalized/capture-real-odoo-001/manifest.json",
    "captures/redacted/capture-real-odoo-001/frame-0001.png"
  ]);
  const audit = auditRealToolRunArtifacts(
    proof,
    (path) => existing.has(path),
    (path) => realRunArtifactContent(path, "odoo")
  );

  assert.equal(audit.passed, true);
  assert.equal(audit.runDir, "evals/runs/odoo/real-proof");
  assert.equal(audit.summary.requiredArtifacts, 6);
  assert.equal(audit.summary.missingArtifacts, 0);
  assert.equal(audit.findings.length, 0);
  assert.equal(audit.references.some((reference) => reference.path.endsWith("screen-input-evidence.json")), true);
});

test("real target-tool run artifact audit rejects missing required run artifacts", () => {
  const proof = realToolProof("notion");
  const audit = auditRealToolRunArtifacts(
    proof,
    (path) => path === "evals/runs/notion/real-proof/step-trace.json"
  );

  assert.equal(audit.passed, false);
  assert.equal(audit.summary.requiredArtifacts, 6);
  assert.equal(audit.summary.missingArtifacts, 5);
  assert.equal(audit.findings.some((finding) => finding.message.includes("final-screen.png")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("screen-input-evidence.json")), true);
});

test("real target-tool run artifact audit rejects unsafe or incomplete screen-input evidence", () => {
  const proof = realToolProof("odoo");
  const existing = new Set([
    "evals/runs/odoo/real-proof/step-trace.json",
    "evals/runs/odoo/real-proof/final-screen.png",
    "evals/runs/odoo/real-proof/eval-recording.mp4",
    "evals/runs/odoo/real-proof/failure-log.md",
    "evals/runs/odoo/real-proof/reviewer-checklist.md",
    "evals/runs/odoo/real-proof/screen-input-evidence.json"
  ]);
  const audit = auditRealToolRunArtifacts(
    proof,
    (path) => existing.has(path),
    () =>
      JSON.stringify({
        ...screenInputEvidence("odoo"),
        keyboardEventLogCaptured: false,
        rawCapturePolicy: "shareable",
        normalizedCaptureManifestPath: "captures/raw/odoo/manifest.json",
        redactedFrameEvidencePaths: ["captures/raw/odoo/frame-0001.png"]
      })
  );

  assert.equal(audit.passed, false);
  assert.equal(audit.findings.some((finding) => finding.message.includes("keyboardEventLogCaptured")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("rawCapturePolicy")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("unsafe capture evidence")), true);
});

test("real target-tool run artifact audit rejects incomplete step trace and reviewer signoff evidence", () => {
  const proof = realToolProof("notion");
  const existing = new Set([
    "evals/runs/notion/real-proof/step-trace.json",
    "evals/runs/notion/real-proof/final-screen.png",
    "evals/runs/notion/real-proof/eval-recording.mp4",
    "evals/runs/notion/real-proof/failure-log.md",
    "evals/runs/notion/real-proof/reviewer-checklist.md",
    "evals/runs/notion/real-proof/screen-input-evidence.json",
    "evals/runs/notion/real-proof/redacted-frame-0001.png",
    "captures/normalized/capture-real-notion-001/manifest.json",
    "captures/redacted/capture-real-notion-001/frame-0001.png"
  ]);
  const audit = auditRealToolRunArtifacts(
    proof,
    (path) => existing.has(path),
    (path) => {
      if (path.endsWith("step-trace.json")) {
        return JSON.stringify([
          {
            stepId: "step-001",
            success: false,
            overlayKind: "fail-closed",
            overlayMessage: "",
            overlayConfidence: 0.5,
            highlightedAnchorId: null,
            actionPrimitive: { kind: "click", manualOnly: false },
            currentFrame: "evals/runs/notion/real-proof/redacted-frame-0001.png"
          }
        ]);
      }

      if (path.endsWith("reviewer-checklist.md")) {
        return "# reviewer checklist\n\n- accepted: false\n- rejected: true\n";
      }

      return realRunArtifactContent(path, "notion");
    }
  );

  assert.equal(audit.passed, false);
  assert.equal(audit.findings.some((finding) => finding.message.includes("must be successful")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("overlayConfidence")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("manualOnly")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("accepted: true")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("rejected: true")), true);
});

test("shareable evidence path audit accepts existing allowed artifact paths", () => {
  const audit = auditShareableEvidencePaths(
    [
      { tool: "odoo", label: "flow", path: "flows/odoo/qualify-opportunity.flow.md" },
      { tool: "odoo", label: "capture frame", path: "captures/redacted/odoo-qualify-opportunity/frame-0001.png" },
      { tool: "odoo", label: "held-out frame", path: "evals/fixtures/odoo-qualify-opportunity/held-out-frame-0001.png" },
      { tool: "odoo", label: "step trace", path: "evals/runs/odoo/fixture-odoo-qualify-001/step-trace.json" }
    ],
    (path) => path.endsWith(".md") || path.endsWith(".png") || path.endsWith(".json")
  );

  assert.equal(audit.passed, true);
  assert.equal(audit.referencesAudited, 4);
  assert.equal(audit.summary.missingReferences, 0);
  assert.equal(audit.summary.unsafeReferences, 0);
  assert.equal(audit.summary.disallowedReferences, 0);
});

test("shareable evidence path audit rejects missing, unsafe, absolute, and disallowed paths", () => {
  const audit = auditShareableEvidencePaths(
    [
      { tool: "odoo", label: "missing frame", path: "captures/redacted/odoo-qualify-opportunity/missing.png" },
      { tool: "odoo", label: "raw frame", path: "captures/raw/odoo-qualify-opportunity/frame-0001.png" },
      { tool: "notion", label: "absolute frame", path: "/Users/mc/Desktop/onboardai/evals/fixtures/notion/frame.png" },
      { tool: "notion", label: "untracked note", path: "docs/proof-note.md" }
    ],
    (path) => !path.includes("missing")
  );

  assert.equal(audit.passed, false);
  assert.equal(audit.summary.missingReferences, 1);
  assert.equal(audit.summary.unsafeReferences, 1);
  assert.equal(audit.summary.disallowedReferences, 4);
  assert.equal(audit.findings.some((finding) => finding.message.includes("missing")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("unsafe")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("project-relative")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("allowed shareable evidence location")), true);
});

function readFixtureFlow(path) {
  return parseFlowMarkdown(readFileSync(new URL(path, workspaceRoot), "utf8"));
}

function passingFixtureAudit() {
  const odooFixture = getDeterministicFixture("odoo");
  const notionFixture = getDeterministicFixture("notion");

  return auditEvalProofResults([
    runDeterministicEval(readFixtureFlow(odooFixture.flowPath), odooFixture),
    runDeterministicEval(readFixtureFlow(notionFixture.flowPath), notionFixture)
  ]);
}

function realToolProof(tool) {
  return {
    tool,
    substrate: "real-tool",
    heldOutTeachingEvalPassed: true,
    nativeScreenPlusInputCaptureVerified: true,
    terminalBusinessStateReached: true,
    zeroHumanHelp: true,
    noInventedSteps: true,
    noPrivilegedAccess: true,
    seniorReviewerSignoff: true,
    evidencePath: `evals/runs/${tool}/real-proof/step-trace.json`
  };
}

function screenInputEvidence(tool) {
  return {
    schemaVersion: 1,
    tool,
    substrate: "real-tool",
    dataSource: "clean-seeded-demo-data",
    rawCapturePolicy: "unsafe-to-share-local-only-git-ignored",
    nativeScreenRecordingCaptured: true,
    keyboardEventLogCaptured: true,
    mouseEventLogCaptured: true,
    hardRedactionCompleted: true,
    noPrivilegedAccessUsed: true,
    screenRecordingEvidencePath: `evals/runs/${tool}/real-proof/eval-recording.mp4`,
    normalizedCaptureManifestPath: `captures/normalized/capture-real-${tool}-001/manifest.json`,
    redactedFrameEvidencePaths: [`captures/redacted/capture-real-${tool}-001/frame-0001.png`]
  };
}

function realRunArtifactContent(path, tool) {
  if (path.endsWith("step-trace.json")) {
    return JSON.stringify([
      {
        stepId: "step-001",
        title: "complete taught step",
        fromStateId: "state-001",
        toStateId: "state-002",
        currentFrame: `evals/runs/${tool}/real-proof/redacted-frame-0001.png`,
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
    ]);
  }

  if (path.endsWith("reviewer-checklist.md")) {
    return "# reviewer checklist\n\n- accepted: true\n- rejected: false\n";
  }

  return JSON.stringify(screenInputEvidence(tool));
}
