import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createRawCaptureArtifact,
  normalizeDemonstrationToFlowMarkdown
} from "../dist/index.js";

const demonstration = {
  flowId: "odoo-qualify-opportunity",
  flowVersion: 1,
  tool: "odoo",
  toolSurface: "browser-or-pwa",
  captureId: "capture-test-001",
  createdAt: "2026-06-20t00:00:00z",
  createdByRole: "senior-demonstrator",
  terminalBusinessState: "demo opportunity visible with stage qualified",
  dataClass: "clean-demo",
  rawArtifacts: [
    createRawCaptureArtifact("capture-test-001", "screen-recording", "captures/raw/test/recording.mov"),
    createRawCaptureArtifact("capture-test-001", "keyboard-event-log", "captures/raw/test/keyboard-events.jsonl"),
    createRawCaptureArtifact("capture-test-001", "mouse-event-log", "captures/raw/test/mouse-events.jsonl")
  ],
  frames: [
    {
      frameId: "start",
      redactedFramePath: "captures/redacted/test/frame-0001.png",
      visibleText: ["pipeline", "demo opportunity", "new"]
    }
  ],
  anchors: [{ anchorId: "opportunity-card", frameId: "start", x: 1, y: 2, width: 3, height: 4 }],
  steps: [
    {
      stepId: "step-001",
      title: "open opportunity",
      instructionText: "select demo opportunity.",
      expectedFrameId: "start",
      expectedVisibleText: ["pipeline", "demo opportunity", "new"],
      highlightAnchorId: "opportunity-card",
      userAction: { kind: "click", targetAnchorId: "opportunity-card", manualOnly: true },
      inputEvents: [{ kind: "mouse", event: "click", anchorId: "opportunity-card" }],
      successVisibleText: ["demo opportunity"],
      terminal: true
    }
  ],
  humanNotes: "senior note includes email senior@example.com and password=hunter2"
};

test("senior demonstration normalizes to shareable flow.md with hard redaction", () => {
  const artifact = normalizeDemonstrationToFlowMarkdown(demonstration, "flows/odoo/qualify-opportunity.flow.md");

  assert.equal(artifact.path, "flows/odoo/qualify-opportunity.flow.md");
  assert.match(artifact.markdown, /^---\nflow-id: odoo-qualify-opportunity/m);
  assert.equal(artifact.markdown.includes("senior@example.com"), false);
  assert.equal(artifact.markdown.includes("hunter2"), false);
  assert.equal(artifact.markdown.includes("captures/raw/test/recording.mov"), false);
  assert.equal(artifact.markdown.includes("captures/redacted/test/frame-0001.png"), true);
  assert.equal(artifact.replacements.includes("email"), true);
  assert.equal(artifact.replacements.includes("password"), true);
});

test("normalization requires screen recording, keyboard log, and mouse log raw artifacts", () => {
  const incomplete = {
    ...demonstration,
    rawArtifacts: demonstration.rawArtifacts.filter((artifact) => artifact.kind !== "keyboard-event-log")
  };

  assert.throws(() => normalizeDemonstrationToFlowMarkdown(incomplete, "flows/odoo/qualify-opportunity.flow.md"), /keyboard-event-log/);
});

test("normalization rejects unsafe frame references in shareable flow.md", () => {
  const unsafe = {
    ...demonstration,
    frames: [{ ...demonstration.frames[0], redactedFramePath: "captures/raw/test/frame-0001.png" }]
  };

  assert.throws(() => normalizeDemonstrationToFlowMarkdown(unsafe, "flows/odoo/qualify-opportunity.flow.md"), /unsafe frame/);
});
