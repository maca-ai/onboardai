import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDeterministicFixture } from "@onboardai/fixtures";
import { parseFlowMarkdown } from "@onboardai/flow";
import {
  auditCaptureTeachGoalStatus,
  auditEvalProofResults,
  auditShareableEvidencePaths,
  matchScreenState,
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
