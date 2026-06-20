import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDeterministicFixture } from "@onboardai/fixtures";
import { parseFlowMarkdown } from "@onboardai/flow";
import { matchScreenState, runDeterministicEval } from "../dist/index.js";

test("odoo-like fixture eval reaches the terminal business state without privileged access", () => {
  const fixture = getDeterministicFixture("odoo");
  const flow = parseFlowMarkdown(readFileSync(fixture.flowPath, "utf8"));
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
  const flow = parseFlowMarkdown(readFileSync(fixture.flowPath, "utf8"));
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
  const flow = parseFlowMarkdown(readFileSync(fixture.flowPath, "utf8"));
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
  const flow = parseFlowMarkdown(readFileSync(fixture.flowPath, "utf8"));
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
  const flow = parseFlowMarkdown(readFileSync(fixture.flowPath, "utf8"));
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
