import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createNormalizedCaptureManifest,
  createRawCaptureArtifact,
  normalizeDemonstrationToFlowMarkdown,
  writeLocalCaptureBundle
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

test("normalized capture manifest records redacted evidence without raw paths", () => {
  const flow = normalizeDemonstrationToFlowMarkdown(demonstration, "flows/odoo/qualify-opportunity.flow.md");
  const manifest = createNormalizedCaptureManifest(
    demonstration,
    flow,
    "captures/normalized/capture-test-001/manifest.json"
  );

  assert.equal(manifest.manifest.rawCaptureSummary.screenRecordingCaptured, true);
  assert.equal(manifest.manifest.rawCaptureSummary.keyboardEventLogCaptured, true);
  assert.equal(manifest.manifest.rawCaptureSummary.mouseEventLogCaptured, true);
  assert.equal(manifest.manifest.redactedFrames[0].path, "captures/redacted/test/frame-0001.png");
  assert.equal(manifest.json.includes("captures/raw/"), false);
  assert.equal(manifest.json.includes("senior@example.com"), false);
  assert.equal(manifest.json.includes("hunter2"), false);
  assert.equal(manifest.json.includes("screen-recording"), true);
  assert.equal(manifest.json.includes("keyboard-event-log"), true);
  assert.equal(manifest.json.includes("mouse-event-log"), true);
  assert.doesNotThrow(() => JSON.parse(manifest.json));
});

test("normalized capture manifest tags business-sensitive frame paths", () => {
  const sensitiveFrameDemonstration = {
    ...demonstration,
    frames: [
      {
        ...demonstration.frames[0],
        redactedFramePath: "/Users/demo/internal/customer-work/opp-123/frame-0001.png"
      }
    ]
  };
  const flow = normalizeDemonstrationToFlowMarkdown(sensitiveFrameDemonstration, "flows/odoo/qualify-opportunity.flow.md");
  const manifest = createNormalizedCaptureManifest(
    sensitiveFrameDemonstration,
    flow,
    "captures/normalized/capture-test-001/manifest.json"
  );

  assert.equal(manifest.manifest.redactedFrames[0].path, "/Users/demo/internal/customer-work/opp-123/frame-0001.png");
  assert.equal(manifest.manifest.redaction.businessSensitiveTags.some((tag) => tag.kind === "file-path"), true);
  assert.equal(manifest.manifest.redaction.businessSensitiveTags.some((tag) => tag.kind === "business-record-id"), true);
});

test("local capture adapter writes unsafe raw screen and input artifacts under raw capture paths", () => {
  const root = mkdtempSync(join(tmpdir(), "onboardai-capture-"));

  try {
    const bundle = writeLocalCaptureBundle(demonstration, root);

    assert.equal(bundle.captureId, "capture-test-001");
    assert.equal(bundle.rawArtifacts.every((artifact) => artifact.safety === "unsafe-to-share-local-only"), true);
    assert.equal(bundle.rawArtifacts.every((artifact) => artifact.gitPolicy === "excluded-from-git"), true);

    for (const artifact of bundle.rawArtifacts) {
      const absolutePath = join(root, artifact.path);
      assert.equal(existsSync(absolutePath), true);
      assert.match(artifact.path, /^captures\/raw\//);
    }

    const screenRecording = readFileSync(join(root, "captures/raw/test/recording.mov"), "utf8");
    const mouseLog = readFileSync(join(root, "captures/raw/test/mouse-events.jsonl"), "utf8");

    assert.match(screenRecording, /fixture screen recording marker/);
    assert.match(screenRecording, /unsafe-to-share=true/);
    assert.match(mouseLog, /opportunity-card/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
