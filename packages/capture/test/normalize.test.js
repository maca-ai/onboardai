import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createNormalizedCaptureManifest,
  createNormalizedRunCaptureManifest,
  createRawCaptureArtifact,
  localRawCaptureInputDirectories,
  normalizeDemonstrationToFlowMarkdown,
  validateNormalizedRunCaptureManifest,
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
  assert.equal(manifest.manifest.rawArtifacts.every((artifact) => artifact.captureId === "capture-test-001"), true);
  assert.equal(manifest.manifest.redactedFrames[0].path, "captures/redacted/test/frame-0001.png");
  assert.equal(manifest.json.includes("captures/raw/"), false);
  assert.equal(manifest.json.includes("senior@example.com"), false);
  assert.equal(manifest.json.includes("hunter2"), false);
  assert.equal(manifest.json.includes("screen-recording"), true);
  assert.equal(manifest.json.includes("keyboard-event-log"), true);
  assert.equal(manifest.json.includes("mouse-event-log"), true);
  assert.doesNotThrow(() => JSON.parse(manifest.json));
});

test("normalization rejects raw artifacts from mixed capture sessions", () => {
  const mixedCapture = {
    ...demonstration,
    rawArtifacts: [
      demonstration.rawArtifacts[0],
      createRawCaptureArtifact("capture-other-001", "keyboard-event-log", "captures/raw/other/keyboard-events.jsonl"),
      demonstration.rawArtifacts[2]
    ]
  };

  assert.throws(() => normalizeDemonstrationToFlowMarkdown(mixedCapture, "flows/odoo/qualify-opportunity.flow.md"), /capture-test-001/);
});

test("raw capture input directories are local unsafe and git-ignored by policy", () => {
  assert.deepEqual(localRawCaptureInputDirectories("capture-real-odoo-001"), {
    raw: "captures/raw/capture-real-odoo-001",
    unsafe: "captures/unsafe/capture-real-odoo-001",
    tmp: "captures/tmp/capture-real-odoo-001"
  });
  assert.throws(() => localRawCaptureInputDirectories("Capture_001"), /lowercase kebab-case/);
});

test("run-local normalized capture manifest accepts same-run redacted frame references", () => {
  const runDemonstration = runLocalDemonstration();
  const flow = normalizeDemonstrationToFlowMarkdown(runDemonstration, "flows/odoo/qualify-opportunity.flow.md");
  const manifest = createNormalizedRunCaptureManifest(runDemonstration, flow, {
    tool: "odoo",
    runId: "real-odoo-qualify-001"
  });

  assert.equal(manifest.path, "evals/runs/odoo/real-odoo-qualify-001/capture-manifest.json");
  assert.equal(manifest.manifest.schemaVersion, 1);
  assert.equal(manifest.manifest.redactedFrames[0].path, "evals/runs/odoo/real-odoo-qualify-001/redacted-frame-0001.png");
  assert.equal(manifest.json.includes("captures/raw/"), false);
  assert.equal(manifest.json.includes("file://"), false);
  assert.doesNotThrow(() => JSON.parse(manifest.json));
});

test("run-local normalized capture manifest rejects raw, unsafe, tmp, absolute, file, and traversal frame references", () => {
  const cases = [
    ["raw path", "captures/raw/test/frame-0001.png", /unsafe frame|raw, unsafe, or tmp|under evals\/runs/],
    ["absolute path", "/Users/demo/captures/redacted/frame-0001.png", /absolute local paths|under evals\/runs/],
    ["file url", "file:///Users/demo/frame-0001.png", /file:\/\/ paths|under evals\/runs/],
    ["traversal path", "evals/runs/odoo/real-odoo-qualify-001/../redacted-frame-0001.png", /traversal|under evals\/runs/],
    ["unsafe path", "captures/unsafe/test/frame-0001.png", /unsafe frame|raw, unsafe, or tmp|under evals\/runs/],
    ["tmp path", "captures/tmp/test/frame-0001.png", /raw or unsafe capture paths|raw, unsafe, or tmp|under evals\/runs/]
  ];

  for (const [, framePath, expectedError] of cases) {
    const runDemonstration = runLocalDemonstration(framePath);

    assert.throws(
      () => {
        const flow = normalizeDemonstrationToFlowMarkdown(runDemonstration, "flows/odoo/qualify-opportunity.flow.md");
        createNormalizedRunCaptureManifest(runDemonstration, flow, {
          tool: "odoo",
          runId: "real-odoo-qualify-001"
        });
      },
      expectedError
    );
  }
});

test("run-local normalized capture manifest rejects unredacted emails and secret-like strings", () => {
  for (const visibleText of ["operator reviewer@example.com", "token=abc123def456ghi789", "api_key=abc123def456ghi789"]) {
    const runDemonstration = runLocalDemonstration("evals/runs/odoo/real-odoo-qualify-001/redacted-frame-0001.png", [visibleText]);
    const flow = normalizeDemonstrationToFlowMarkdown(runDemonstration, "flows/odoo/qualify-opportunity.flow.md");

    assert.throws(
      () =>
        createNormalizedRunCaptureManifest(runDemonstration, flow, {
          tool: "odoo",
          runId: "real-odoo-qualify-001"
        }),
      /unredacted email or secret-like text/
    );
  }
});

test("run-local normalized capture manifest validation rejects missing schemaVersion", () => {
  const manifest = {
    tool: "odoo",
    captureId: "capture-real-odoo-001",
    flowId: "odoo-qualify-opportunity",
    flowPath: "flows/odoo/qualify-opportunity.flow.md",
    rawCapturePolicy: "unsafe-to-share-local-only",
    redactionPolicy: "hard-secret-redaction-v0",
    rawArtifacts: [
      { captureId: "capture-real-odoo-001", kind: "screen-recording", safety: "unsafe-to-share-local-only", gitPolicy: "excluded-from-git" },
      { captureId: "capture-real-odoo-001", kind: "keyboard-event-log", safety: "unsafe-to-share-local-only", gitPolicy: "excluded-from-git" },
      { captureId: "capture-real-odoo-001", kind: "mouse-event-log", safety: "unsafe-to-share-local-only", gitPolicy: "excluded-from-git" }
    ],
    redactedFrames: [{ frameId: "start", path: "evals/runs/odoo/real-odoo-qualify-001/redacted-frame-0001.png", visibleText: ["demo"] }],
    inputEvidence: [{ stepId: "step-001", inputEvents: [{ kind: "mouse", event: "click", anchorId: "opportunity-card" }] }],
    redaction: { replacements: [], businessSensitiveTags: [] }
  };
  const validation = validateNormalizedRunCaptureManifest(manifest, {
    tool: "odoo",
    runId: "real-odoo-qualify-001",
    flowId: "odoo-qualify-opportunity",
    flowPath: "flows/odoo/qualify-opportunity.flow.md"
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.errors.some((error) => error.includes("schemaVersion must be 1")), true);
});

test("run-local normalized capture manifest validation rejects mixed raw artifact capture ids", () => {
  const runDemonstration = runLocalDemonstration();
  const flow = normalizeDemonstrationToFlowMarkdown(runDemonstration, "flows/odoo/qualify-opportunity.flow.md");
  const manifest = createNormalizedRunCaptureManifest(runDemonstration, flow, {
    tool: "odoo",
    runId: "real-odoo-qualify-001"
  });
  const validation = validateNormalizedRunCaptureManifest(
    {
      ...manifest.manifest,
      rawArtifacts: [
        manifest.manifest.rawArtifacts[0],
        { ...manifest.manifest.rawArtifacts[1], captureId: "capture-other-001" },
        manifest.manifest.rawArtifacts[2]
      ]
    },
    {
      tool: "odoo",
      runId: "real-odoo-qualify-001",
      flowId: "odoo-qualify-opportunity",
      flowPath: "flows/odoo/qualify-opportunity.flow.md"
    }
  );

  assert.equal(validation.valid, false);
  assert.equal(validation.errors.some((error) => error.includes("rawArtifacts[1].captureId must match manifest captureId")), true);
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

function runLocalDemonstration(
  framePath = "evals/runs/odoo/real-odoo-qualify-001/redacted-frame-0001.png",
  visibleText = ["pipeline", "demo opportunity", "new"]
) {
  return {
    ...demonstration,
    captureId: "capture-real-odoo-001",
    rawArtifacts: [
      createRawCaptureArtifact("capture-real-odoo-001", "screen-recording", "captures/raw/real-odoo-001/recording.mov"),
      createRawCaptureArtifact("capture-real-odoo-001", "keyboard-event-log", "captures/raw/real-odoo-001/keyboard-events.jsonl"),
      createRawCaptureArtifact("capture-real-odoo-001", "mouse-event-log", "captures/raw/real-odoo-001/mouse-events.jsonl")
    ],
    frames: [
      {
        ...demonstration.frames[0],
        redactedFramePath: framePath,
        visibleText
      }
    ]
  };
}
