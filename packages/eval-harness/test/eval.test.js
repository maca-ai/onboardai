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
    "evals/runs/odoo/real-proof/flow-evidence.json",
    "evals/runs/odoo/real-proof/capture-readiness.json",
    "evals/runs/odoo/real-proof/screen-input-evidence.json",
    "evals/runs/odoo/real-proof/outcome-evidence.json",
    "evals/runs/odoo/real-proof/redacted-frame-0001.png",
    "evals/runs/odoo/real-proof/redacted-frame-0002.png",
    "evals/runs/odoo/real-proof/redacted-frame-0003.png",
    "flows/odoo/qualify-opportunity.flow.md",
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
  assert.equal(audit.summary.requiredArtifacts, 9);
  assert.equal(audit.summary.missingArtifacts, 0);
  assert.equal(audit.findings.length, 0);
  assert.equal(audit.references.some((reference) => reference.path.endsWith("screen-input-evidence.json")), true);
});

test("real target-tool run artifact audit rejects same-run non-frame step evidence", () => {
  const proof = realToolProof("odoo");
  const existing = new Set([
    "evals/runs/odoo/real-proof/step-trace.json",
    "evals/runs/odoo/real-proof/final-screen.png",
    "evals/runs/odoo/real-proof/eval-recording.mp4",
    "evals/runs/odoo/real-proof/failure-log.md",
    "evals/runs/odoo/real-proof/reviewer-checklist.md",
    "evals/runs/odoo/real-proof/flow-evidence.json",
    "evals/runs/odoo/real-proof/capture-readiness.json",
    "evals/runs/odoo/real-proof/screen-input-evidence.json",
    "evals/runs/odoo/real-proof/outcome-evidence.json",
    "evals/runs/odoo/real-proof/redacted-frame-0002.png",
    "evals/runs/odoo/real-proof/redacted-frame-0003.png",
    "flows/odoo/qualify-opportunity.flow.md",
    "captures/normalized/capture-real-odoo-001/manifest.json",
    "captures/redacted/capture-real-odoo-001/frame-0001.png"
  ]);
  const audit = auditRealToolRunArtifacts(
    proof,
    (path) => existing.has(path),
    (path) => {
      if (path.endsWith("step-trace.json")) {
        const trace = flowGroundedTrace("odoo");
        trace[0].currentFrame = "evals/runs/odoo/real-proof/failure-log.md";
        return JSON.stringify(trace);
      }

      return realRunArtifactContent(path, "odoo");
    }
  );

  assert.equal(audit.passed, false);
  assert.equal(audit.findings.some((finding) => finding.message.includes("currentFrame must point to a same-run redacted-frame PNG")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("currentFrame must point to a PNG frame artifact")), true);
});

test("real target-tool run artifact audit rejects missing required run artifacts", () => {
  const proof = realToolProof("notion");
  const audit = auditRealToolRunArtifacts(
    proof,
    (path) => path === "evals/runs/notion/real-proof/step-trace.json"
  );

  assert.equal(audit.passed, false);
  assert.equal(audit.summary.requiredArtifacts, 9);
  assert.equal(audit.summary.missingArtifacts, 8);
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
    "evals/runs/odoo/real-proof/flow-evidence.json",
    "evals/runs/odoo/real-proof/capture-readiness.json",
    "evals/runs/odoo/real-proof/screen-input-evidence.json",
    "evals/runs/odoo/real-proof/outcome-evidence.json"
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

test("real target-tool run artifact audit rejects empty normalized capture manifests", () => {
  const proof = realToolProof("odoo");
  const existing = new Set([
    "evals/runs/odoo/real-proof/step-trace.json",
    "evals/runs/odoo/real-proof/final-screen.png",
    "evals/runs/odoo/real-proof/eval-recording.mp4",
    "evals/runs/odoo/real-proof/failure-log.md",
    "evals/runs/odoo/real-proof/reviewer-checklist.md",
    "evals/runs/odoo/real-proof/flow-evidence.json",
    "evals/runs/odoo/real-proof/capture-readiness.json",
    "evals/runs/odoo/real-proof/screen-input-evidence.json",
    "evals/runs/odoo/real-proof/outcome-evidence.json",
    "evals/runs/odoo/real-proof/redacted-frame-0001.png",
    "evals/runs/odoo/real-proof/redacted-frame-0002.png",
    "evals/runs/odoo/real-proof/redacted-frame-0003.png",
    "flows/odoo/qualify-opportunity.flow.md",
    "captures/normalized/capture-real-odoo-001/manifest.json",
    "captures/redacted/capture-real-odoo-001/frame-0001.png"
  ]);
  const audit = auditRealToolRunArtifacts(
    proof,
    (path) => existing.has(path),
    (path) => {
      if (path.endsWith("manifest.json")) {
        return "{}";
      }

      return realRunArtifactContent(path, "odoo");
    }
  );

  assert.equal(audit.passed, false);
  assert.equal(audit.findings.some((finding) => finding.message.includes("rawCaptureSummary must be present")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("rawArtifacts must contain")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("redactedFrames must contain")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("inputEvidence must contain")), true);
});

test("real target-tool run artifact audit rejects manifests missing per-step input evidence", () => {
  const proof = realToolProof("odoo");
  const existing = new Set([
    "evals/runs/odoo/real-proof/step-trace.json",
    "evals/runs/odoo/real-proof/final-screen.png",
    "evals/runs/odoo/real-proof/eval-recording.mp4",
    "evals/runs/odoo/real-proof/failure-log.md",
    "evals/runs/odoo/real-proof/reviewer-checklist.md",
    "evals/runs/odoo/real-proof/flow-evidence.json",
    "evals/runs/odoo/real-proof/capture-readiness.json",
    "evals/runs/odoo/real-proof/screen-input-evidence.json",
    "evals/runs/odoo/real-proof/outcome-evidence.json",
    "evals/runs/odoo/real-proof/redacted-frame-0001.png",
    "evals/runs/odoo/real-proof/redacted-frame-0002.png",
    "evals/runs/odoo/real-proof/redacted-frame-0003.png",
    "flows/odoo/qualify-opportunity.flow.md",
    "captures/normalized/capture-real-odoo-001/manifest.json",
    "captures/redacted/capture-real-odoo-001/frame-0001.png"
  ]);
  const audit = auditRealToolRunArtifacts(
    proof,
    (path) => existing.has(path),
    (path) => {
      if (path.endsWith("manifest.json")) {
        return JSON.stringify({
          ...normalizedCaptureManifest("odoo"),
          inputEvidence: [
            { stepId: "step-001", inputEvents: [{ kind: "mouse", event: "click", anchorId: "opportunity-card" }] },
            { stepId: "step-002", inputEvents: [{ kind: "mouse", event: "click", anchorId: "qualified-stage" }] }
          ]
        });
      }

      return realRunArtifactContent(path, "odoo");
    }
  );

  assert.equal(audit.passed, false);
  assert.equal(audit.findings.some((finding) => finding.message.includes("inputEvidence must include real-run step step-003")), true);
});

test("real target-tool run artifact audit rejects screen-input frames not listed in the normalized manifest", () => {
  const proof = realToolProof("odoo");
  const existing = new Set([
    "evals/runs/odoo/real-proof/step-trace.json",
    "evals/runs/odoo/real-proof/final-screen.png",
    "evals/runs/odoo/real-proof/eval-recording.mp4",
    "evals/runs/odoo/real-proof/failure-log.md",
    "evals/runs/odoo/real-proof/reviewer-checklist.md",
    "evals/runs/odoo/real-proof/flow-evidence.json",
    "evals/runs/odoo/real-proof/capture-readiness.json",
    "evals/runs/odoo/real-proof/screen-input-evidence.json",
    "evals/runs/odoo/real-proof/outcome-evidence.json",
    "evals/runs/odoo/real-proof/redacted-frame-0001.png",
    "evals/runs/odoo/real-proof/redacted-frame-0002.png",
    "evals/runs/odoo/real-proof/redacted-frame-0003.png",
    "flows/odoo/qualify-opportunity.flow.md",
    "captures/normalized/capture-real-odoo-001/manifest.json",
    "captures/redacted/capture-real-odoo-001/frame-0001.png",
    "captures/redacted/capture-real-odoo-001/frame-9999.png"
  ]);
  const audit = auditRealToolRunArtifacts(
    proof,
    (path) => existing.has(path),
    (path) => {
      if (path.endsWith("screen-input-evidence.json")) {
        return JSON.stringify({
          ...screenInputEvidence("odoo"),
          redactedFrameEvidencePaths: ["captures/redacted/capture-real-odoo-001/frame-9999.png"]
        });
      }

      return realRunArtifactContent(path, "odoo");
    }
  );

  assert.equal(audit.passed, false);
  assert.equal(audit.findings.some((finding) => finding.message.includes("must be listed in captures/normalized/capture-real-odoo-001/manifest.json")), true);
});

test("real target-tool run artifact audit rejects unverified native capture readiness evidence", () => {
  const proof = realToolProof("odoo");
  const existing = new Set([
    "evals/runs/odoo/real-proof/step-trace.json",
    "evals/runs/odoo/real-proof/final-screen.png",
    "evals/runs/odoo/real-proof/eval-recording.mp4",
    "evals/runs/odoo/real-proof/failure-log.md",
    "evals/runs/odoo/real-proof/reviewer-checklist.md",
    "evals/runs/odoo/real-proof/flow-evidence.json",
    "evals/runs/odoo/real-proof/capture-readiness.json",
    "evals/runs/odoo/real-proof/screen-input-evidence.json",
    "evals/runs/odoo/real-proof/outcome-evidence.json",
    "evals/runs/odoo/real-proof/redacted-frame-0001.png",
    "evals/runs/odoo/real-proof/redacted-frame-0002.png",
    "evals/runs/odoo/real-proof/redacted-frame-0003.png",
    "flows/odoo/qualify-opportunity.flow.md",
    "captures/normalized/capture-real-odoo-001/manifest.json",
    "captures/redacted/capture-real-odoo-001/frame-0001.png"
  ]);
  const audit = auditRealToolRunArtifacts(
    proof,
    (path) => existing.has(path),
    (path) => {
      if (path.endsWith("capture-readiness.json")) {
        return JSON.stringify({
          ...captureReadinessEvidence("odoo"),
          adapterKind: "fixture",
          platform: "linux",
          docsVerified: false,
          keyboardEventLog: false,
          blockers: ["native keyboard hook official docs not verified"]
        });
      }

      return realRunArtifactContent(path, "odoo");
    }
  );

  assert.equal(audit.passed, false);
  assert.equal(audit.findings.some((finding) => finding.message.includes("adapterKind must be native")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("platform must be macos or windows")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("docsVerified must be true")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("keyboardEventLog must be true")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("blockers must be empty")), true);
});

test("real target-tool run artifact audit rejects reviewer checklists without per-step signoff", () => {
  const proof = realToolProof("odoo");
  const existing = new Set([
    "evals/runs/odoo/real-proof/step-trace.json",
    "evals/runs/odoo/real-proof/final-screen.png",
    "evals/runs/odoo/real-proof/eval-recording.mp4",
    "evals/runs/odoo/real-proof/failure-log.md",
    "evals/runs/odoo/real-proof/reviewer-checklist.md",
    "evals/runs/odoo/real-proof/flow-evidence.json",
    "evals/runs/odoo/real-proof/capture-readiness.json",
    "evals/runs/odoo/real-proof/screen-input-evidence.json",
    "evals/runs/odoo/real-proof/outcome-evidence.json",
    "evals/runs/odoo/real-proof/redacted-frame-0001.png",
    "evals/runs/odoo/real-proof/redacted-frame-0002.png",
    "evals/runs/odoo/real-proof/redacted-frame-0003.png",
    "flows/odoo/qualify-opportunity.flow.md",
    "captures/normalized/capture-real-odoo-001/manifest.json",
    "captures/redacted/capture-real-odoo-001/frame-0001.png"
  ]);
  const audit = auditRealToolRunArtifacts(
    proof,
    (path) => existing.has(path),
    (path) => {
      if (path.endsWith("reviewer-checklist.md")) {
        return "# reviewer checklist\n\n- accepted: true\n- rejected: false\n";
      }

      return realRunArtifactContent(path, "odoo");
    }
  );

  assert.equal(audit.passed, false);
  assert.equal(audit.findings.some((finding) => finding.message.includes("per-step signoff - step-001: accepted")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("per-step signoff - step-002: accepted")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("per-step signoff - step-003: accepted")), true);
});

test("real target-tool run artifact audit rejects incomplete step trace and reviewer signoff evidence", () => {
  const proof = realToolProof("notion");
  const existing = new Set([
    "evals/runs/notion/real-proof/step-trace.json",
    "evals/runs/notion/real-proof/final-screen.png",
    "evals/runs/notion/real-proof/eval-recording.mp4",
    "evals/runs/notion/real-proof/failure-log.md",
    "evals/runs/notion/real-proof/reviewer-checklist.md",
    "evals/runs/notion/real-proof/flow-evidence.json",
    "evals/runs/notion/real-proof/capture-readiness.json",
    "evals/runs/notion/real-proof/screen-input-evidence.json",
    "evals/runs/notion/real-proof/outcome-evidence.json",
    "evals/runs/notion/real-proof/redacted-frame-0001.png",
    "flows/notion/update-task-status.flow.md",
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

test("real target-tool run artifact audit rejects ungrounded flow evidence and invented trace steps", () => {
  const proof = realToolProof("odoo");
  const existing = new Set([
    "evals/runs/odoo/real-proof/step-trace.json",
    "evals/runs/odoo/real-proof/final-screen.png",
    "evals/runs/odoo/real-proof/eval-recording.mp4",
    "evals/runs/odoo/real-proof/failure-log.md",
    "evals/runs/odoo/real-proof/reviewer-checklist.md",
    "evals/runs/odoo/real-proof/flow-evidence.json",
    "evals/runs/odoo/real-proof/capture-readiness.json",
    "evals/runs/odoo/real-proof/screen-input-evidence.json",
    "evals/runs/odoo/real-proof/outcome-evidence.json",
    "evals/runs/odoo/real-proof/redacted-frame-0001.png",
    "evals/runs/odoo/real-proof/redacted-frame-0002.png",
    "evals/runs/odoo/real-proof/redacted-frame-0003.png",
    "flows/odoo/qualify-opportunity.flow.md",
    "captures/normalized/capture-real-odoo-001/manifest.json",
    "captures/redacted/capture-real-odoo-001/frame-0001.png"
  ]);
  const audit = auditRealToolRunArtifacts(
    proof,
    (path) => existing.has(path),
    (path) => {
      if (path.endsWith("step-trace.json")) {
        const trace = flowGroundedTrace("odoo");
        return JSON.stringify([
          {
            ...trace[0],
            overlayMessage: "invented instruction not present in flow",
            highlightedAnchorId: "invented-anchor",
            actionPrimitive: { kind: "click", targetAnchorId: "invented-anchor", manualOnly: true }
          },
          trace[1]
        ]);
      }

      return realRunArtifactContent(path, "odoo");
    }
  );

  assert.equal(audit.passed, false);
  assert.equal(audit.findings.some((finding) => finding.message.includes("must contain exactly the referenced flow steps")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("overlayMessage must be grounded")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("highlightedAnchorId must match flow")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("action target anchor must match flow")), true);
});

test("real target-tool run artifact audit rejects failed outcome evidence", () => {
  const proof = realToolProof("odoo");
  const existing = new Set([
    "evals/runs/odoo/real-proof/step-trace.json",
    "evals/runs/odoo/real-proof/final-screen.png",
    "evals/runs/odoo/real-proof/eval-recording.mp4",
    "evals/runs/odoo/real-proof/failure-log.md",
    "evals/runs/odoo/real-proof/reviewer-checklist.md",
    "evals/runs/odoo/real-proof/flow-evidence.json",
    "evals/runs/odoo/real-proof/capture-readiness.json",
    "evals/runs/odoo/real-proof/screen-input-evidence.json",
    "evals/runs/odoo/real-proof/outcome-evidence.json",
    "evals/runs/odoo/real-proof/redacted-frame-0001.png",
    "evals/runs/odoo/real-proof/redacted-frame-0002.png",
    "evals/runs/odoo/real-proof/redacted-frame-0003.png",
    "flows/odoo/qualify-opportunity.flow.md",
    "captures/normalized/capture-real-odoo-001/manifest.json",
    "captures/redacted/capture-real-odoo-001/frame-0001.png"
  ]);
  const audit = auditRealToolRunArtifacts(
    proof,
    (path) => existing.has(path),
    (path) => {
      if (path.endsWith("outcome-evidence.json")) {
        return JSON.stringify({
          ...outcomeEvidence("odoo"),
          tool: "jira",
          terminalBusinessStateReached: false,
          zeroHumanHelp: false,
          noInventedSteps: false,
          noPrivilegedAccess: false,
          heldOutFromCapture: false,
          seniorReviewerSignoff: false,
          completionRate: 0.5,
          stepsCompleted: 1,
          belowThresholdEvents: 1,
          humanHelpIncidents: 1,
          inventedStepIncidents: 1,
          terminalMissingVisibleText: ["qualified"],
          privilegedAccessViolations: ["api-access"],
          overlayMisreads: ["guessed step"],
          finalScreenEvidencePath: "captures/raw/odoo/final-screen.png",
          stepTraceEvidencePath: "/tmp/step-trace.json"
        });
      }

      return realRunArtifactContent(path, "odoo");
    }
  );

  assert.equal(audit.passed, false);
  assert.equal(audit.findings.some((finding) => finding.message.includes("tool must be odoo or notion")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("tool must match odoo")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("terminalBusinessStateReached")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("zeroHumanHelp")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("completionRate")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("terminalMissingVisibleText")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("privilegedAccessViolations")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("overlayMisreads")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("unsafe capture evidence")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("project-relative")), true);
  assert.equal(audit.findings.some((finding) => finding.message.includes("evals/runs/odoo/real-proof/step-trace.json")), true);
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
    captureReadinessEvidencePath: `evals/runs/${tool}/real-proof/capture-readiness.json`,
    screenRecordingEvidencePath: `evals/runs/${tool}/real-proof/eval-recording.mp4`,
    normalizedCaptureManifestPath: `captures/normalized/capture-real-${tool}-001/manifest.json`,
    redactedFrameEvidencePaths: [`captures/redacted/capture-real-${tool}-001/frame-0001.png`]
  };
}

function captureReadinessEvidence(tool) {
  return {
    schemaVersion: 1,
    tool,
    substrate: "real-tool",
    adapterKind: "native",
    platform: "macos",
    docsVerified: true,
    screenRecording: true,
    keyboardEventLog: true,
    mouseEventLog: true,
    redactedFrameOutput: true,
    rawArtifactsIgnored: true,
    blockers: []
  };
}

function realRunArtifactContent(path, tool) {
  if (path.endsWith("step-trace.json")) {
    return JSON.stringify(flowGroundedTrace(tool));
  }

  if (path.endsWith("reviewer-checklist.md")) {
    return [
      "# reviewer checklist",
      "",
      "- step-001: accepted",
      "- step-002: accepted",
      "- step-003: accepted",
      "- accepted: true",
      "- rejected: false",
      ""
    ].join("\n");
  }

  if (path.endsWith("flow-evidence.json")) {
    return JSON.stringify(flowEvidence(tool));
  }

  if (path.endsWith("capture-readiness.json")) {
    return JSON.stringify(captureReadinessEvidence(tool));
  }

  if (path.endsWith("outcome-evidence.json")) {
    return JSON.stringify(outcomeEvidence(tool));
  }

  if (path.endsWith("manifest.json")) {
    return JSON.stringify(normalizedCaptureManifest(tool));
  }

  if (path.endsWith(".flow.md")) {
    return readFileSync(new URL(path, workspaceRoot), "utf8");
  }

  return JSON.stringify(screenInputEvidence(tool));
}

function flowGroundedTrace(tool) {
  const steps = flowStepDefinitions(tool);
  return steps.map((step, index) => ({
    stepId: step.stepId,
    title: step.title,
    fromStateId: `state-00${index + 1}`,
    toStateId: `state-00${index + 2}`,
    currentFrame: `evals/runs/${tool}/real-proof/redacted-frame-000${index + 1}.png`,
    expectedVisibleText: step.expectedVisibleText,
    matchedVisibleText: step.expectedVisibleText,
    missingVisibleText: [],
    overlayConfidence: 0.9,
    overlayKind: "instruction",
    overlayMessage: step.overlayMessage,
    highlightedAnchorId: step.anchorId,
    actionPrimitive: {
      kind: "click",
      targetAnchorId: step.anchorId,
      manualOnly: true
    },
    success: true
  }));
}

function flowStepDefinitions(tool) {
  if (tool === "odoo") {
    return [
      {
        stepId: "step-001",
        title: "open the opportunity",
        expectedVisibleText: ["pipeline", "demo opportunity", "new"],
        overlayMessage: "select the opportunity card named demo opportunity.",
        anchorId: "opportunity-card"
      },
      {
        stepId: "step-002",
        title: "choose qualified stage",
        expectedVisibleText: ["demo opportunity", "stage", "new", "qualified"],
        overlayMessage: "select the qualified stage.",
        anchorId: "qualified-stage"
      },
      {
        stepId: "step-003",
        title: "save the qualified stage",
        expectedVisibleText: ["demo opportunity", "stage", "qualified", "unsaved changes"],
        overlayMessage: "save the opportunity so the qualified stage remains visible.",
        anchorId: "save-button"
      }
    ];
  }

  return [
    {
      stepId: "step-001",
      title: "open the task row",
      expectedVisibleText: ["demo tasks", "demo task", "not started"],
      overlayMessage: "select the row for demo task.",
      anchorId: "demo-task-row"
    },
    {
      stepId: "step-002",
      title: "open status property",
      expectedVisibleText: ["demo task", "status", "not started"],
      overlayMessage: "open the status property.",
      anchorId: "status-property"
    },
    {
      stepId: "step-003",
      title: "choose ready for review",
      expectedVisibleText: ["demo task", "ready for review"],
      overlayMessage: "select ready for review.",
      anchorId: "ready-for-review-option"
    }
  ];
}

function flowEvidence(tool) {
  return {
    schemaVersion: 1,
    tool,
    substrate: "real-tool",
    flowPath: `flows/${tool}/${tool === "odoo" ? "qualify-opportunity" : "update-task-status"}.flow.md`,
    flowId: tool === "odoo" ? "odoo-qualify-opportunity" : "notion-update-task-status",
    terminalBusinessState:
      tool === "odoo" ? "demo opportunity visible with stage qualified" : "demo task visible with status ready for review",
    stepIds: ["step-001", "step-002", "step-003"]
  };
}

function normalizedCaptureManifest(tool) {
  return {
    schemaVersion: 1,
    captureId: `capture-real-${tool}-001`,
    flowId: tool === "odoo" ? "odoo-qualify-opportunity" : "notion-update-task-status",
    flowPath: `flows/${tool}/${tool === "odoo" ? "qualify-opportunity" : "update-task-status"}.flow.md`,
    tool,
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
        path: `captures/redacted/capture-real-${tool}-001/frame-0001.png`,
        visibleText: ["demo"]
      }
    ],
    anchors: [],
    inputEvidence: flowStepDefinitions(tool).map((step) => ({
      stepId: step.stepId,
      inputEvents: [{ kind: "mouse", event: "click", anchorId: step.anchorId }]
    })),
    redaction: {
      replacements: [],
      businessSensitiveTags: []
    }
  };
}

function outcomeEvidence(tool) {
  return {
    schemaVersion: 1,
    tool,
    substrate: "real-tool",
    completionRate: 1,
    stepCount: 3,
    stepsCompleted: 3,
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
    finalScreenEvidencePath: `evals/runs/${tool}/real-proof/final-screen.png`,
    stepTraceEvidencePath: `evals/runs/${tool}/real-proof/step-trace.json`
  };
}
