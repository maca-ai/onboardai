import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { redactShareableText } from "@onboardai/redaction";

export type CaptureInputKind = "screen-recording" | "keyboard-event-log" | "mouse-event-log" | "human-context-notes";

export interface RawCaptureArtifact {
  readonly captureId: string;
  readonly kind: CaptureInputKind;
  readonly path: string;
  readonly safety: "unsafe-to-share-local-only";
  readonly gitPolicy: "excluded-from-git";
}

export function createRawCaptureArtifact(captureId: string, kind: CaptureInputKind, path: string): RawCaptureArtifact {
  if (!path.startsWith("captures/raw/") && !path.startsWith("captures/unsafe/") && !path.startsWith("captures/tmp/")) {
    throw new Error("raw capture artifacts must stay under ignored raw, unsafe, or tmp capture paths");
  }

  return {
    captureId,
    kind,
    path,
    safety: "unsafe-to-share-local-only",
    gitPolicy: "excluded-from-git"
  };
}

export interface DemonstrationFrame {
  readonly frameId: string;
  readonly redactedFramePath: string;
  readonly visibleText: readonly string[];
}

export interface DemonstrationAnchor {
  readonly anchorId: string;
  readonly frameId: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface DemonstrationInputEvent {
  readonly kind: "mouse" | "keyboard";
  readonly event: "click" | "type" | "press-key" | "move";
  readonly anchorId?: string;
  readonly key?: string;
  readonly text?: string;
}

export interface DemonstrationStep {
  readonly stepId: string;
  readonly title: string;
  readonly instructionText: string;
  readonly expectedFrameId: string;
  readonly expectedVisibleText: readonly string[];
  readonly highlightAnchorId: string;
  readonly userAction: {
    readonly kind: "click" | "type" | "press-key" | "wait";
    readonly targetAnchorId?: string;
    readonly manualOnly: true;
  };
  readonly inputEvents: readonly DemonstrationInputEvent[];
  readonly successVisibleText: readonly string[];
  readonly terminal: boolean;
}

export interface SeniorDemonstration {
  readonly flowId: string;
  readonly flowVersion: 1;
  readonly tool: "odoo" | "notion";
  readonly toolSurface: string;
  readonly captureId: string;
  readonly createdAt: string;
  readonly createdByRole: "senior-demonstrator";
  readonly terminalBusinessState: string;
  readonly dataClass: "clean-demo" | "sanitized-duplicate";
  readonly rawArtifacts: readonly RawCaptureArtifact[];
  readonly frames: readonly DemonstrationFrame[];
  readonly anchors: readonly DemonstrationAnchor[];
  readonly steps: readonly DemonstrationStep[];
  readonly humanNotes?: string;
}

export interface NormalizedFlowArtifact {
  readonly path: string;
  readonly markdown: string;
  readonly replacements: readonly string[];
  readonly businessSensitiveTags: readonly { readonly kind: string; readonly value: string }[];
}

export interface NormalizedCaptureManifest {
  readonly schemaVersion: 1;
  readonly captureId: string;
  readonly flowId: string;
  readonly flowPath: string;
  readonly tool: SeniorDemonstration["tool"];
  readonly generatedAt: string;
  readonly dataClass: SeniorDemonstration["dataClass"];
  readonly rawCapturePolicy: "unsafe-to-share-local-only";
  readonly redactionPolicy: "hard-secret-redaction-v0";
  readonly rawCaptureSummary: {
    readonly screenRecordingCaptured: boolean;
    readonly keyboardEventLogCaptured: boolean;
    readonly mouseEventLogCaptured: boolean;
    readonly humanNotesCaptured: boolean;
  };
  readonly rawArtifacts: readonly {
    readonly kind: CaptureInputKind;
    readonly safety: RawCaptureArtifact["safety"];
    readonly gitPolicy: RawCaptureArtifact["gitPolicy"];
  }[];
  readonly redactedFrames: readonly {
    readonly frameId: string;
    readonly path: string;
    readonly visibleText: readonly string[];
  }[];
  readonly anchors: readonly DemonstrationAnchor[];
  readonly inputEvidence: readonly {
    readonly stepId: string;
    readonly inputEvents: readonly DemonstrationInputEvent[];
  }[];
  readonly redaction: {
    readonly replacements: readonly string[];
    readonly businessSensitiveTags: readonly { readonly kind: string; readonly value: string }[];
  };
}

export interface NormalizedCaptureManifestArtifact {
  readonly path: string;
  readonly manifest: NormalizedCaptureManifest;
  readonly json: string;
}

export interface LocalCaptureWrite {
  readonly path: string;
  readonly content: string;
}

export interface LocalCaptureBundle {
  readonly captureId: string;
  readonly rawArtifacts: readonly RawCaptureArtifact[];
  readonly writes: readonly LocalCaptureWrite[];
}

export type CaptureAdapterKind = "fixture" | "native";
export type CaptureAdapterPlatform = "fixture" | "macos" | "windows";

export interface CaptureAdapterReadiness {
  readonly adapterKind: CaptureAdapterKind;
  readonly platform: CaptureAdapterPlatform;
  readonly docsVerified: boolean;
  readonly screenRecording: boolean;
  readonly keyboardEventLog: boolean;
  readonly mouseEventLog: boolean;
  readonly redactedFrameOutput: boolean;
  readonly rawArtifactsIgnored: boolean;
  readonly blockers: readonly string[];
}

export const belowConfidenceMessage = "screen state not recognized. ask a human or restart this step.";

export function fixtureCaptureReadiness(): CaptureAdapterReadiness {
  return {
    adapterKind: "fixture",
    platform: "fixture",
    docsVerified: true,
    screenRecording: true,
    keyboardEventLog: true,
    mouseEventLog: true,
    redactedFrameOutput: true,
    rawArtifactsIgnored: true,
    blockers: []
  };
}

export function assertNativeCaptureReady(readiness: CaptureAdapterReadiness): void {
  if (readiness.adapterKind !== "native") {
    throw new Error("native capture readiness requires a native adapter");
  }

  const missing: string[] = [];
  if (!readiness.docsVerified) missing.push("verified official documentation");
  if (!readiness.screenRecording) missing.push("screen recording");
  if (!readiness.keyboardEventLog) missing.push("keyboard event log");
  if (!readiness.mouseEventLog) missing.push("mouse event log");
  if (!readiness.redactedFrameOutput) missing.push("redacted frame output");
  if (!readiness.rawArtifactsIgnored) missing.push("raw artifact git ignore");
  missing.push(...readiness.blockers);

  if (missing.length > 0) {
    throw new Error(`native capture adapter is not ready: ${missing.join(", ")}`);
  }
}

export function createLocalCaptureBundle(demonstration: SeniorDemonstration): LocalCaptureBundle {
  validateDemonstration(demonstration);

  return {
    captureId: demonstration.captureId,
    rawArtifacts: demonstration.rawArtifacts,
    writes: demonstration.rawArtifacts.map((artifact) => ({
      path: artifact.path,
      content: rawArtifactContent(demonstration, artifact)
    }))
  };
}

export function writeLocalCaptureBundle(demonstration: SeniorDemonstration, rootDir: string): LocalCaptureBundle {
  const bundle = createLocalCaptureBundle(demonstration);

  for (const write of bundle.writes) {
    const absolutePath = resolve(rootDir, write.path);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, write.content);
  }

  return bundle;
}

export function normalizeDemonstrationToFlowMarkdown(demonstration: SeniorDemonstration, outputPath: string): NormalizedFlowArtifact {
  validateDemonstration(demonstration);

  const markdown = renderFlowMarkdown(demonstration);
  const redacted = redactShareableText(markdown);

  return {
    path: outputPath,
    markdown: redacted.text,
    replacements: redacted.replacements,
    businessSensitiveTags: redacted.businessSensitiveTags
  };
}

export function createNormalizedCaptureManifest(
  demonstration: SeniorDemonstration,
  flowArtifact: NormalizedFlowArtifact,
  manifestPath: string
): NormalizedCaptureManifestArtifact {
  validateDemonstration(demonstration);

  const replacements = [...flowArtifact.replacements];
  const businessSensitiveTags = [...flowArtifact.businessSensitiveTags];
  const redactedFrames = demonstration.frames.map((frame) => ({
    frameId: frame.frameId,
    path: redactManifestString(frame.redactedFramePath, replacements, businessSensitiveTags),
    visibleText: frame.visibleText.map((text) => redactManifestString(text, replacements, businessSensitiveTags))
  }));
  const anchors = demonstration.anchors.map((anchor) => ({
    ...anchor,
    frameId: redactManifestString(anchor.frameId, replacements, businessSensitiveTags)
  }));
  const inputEvidence = demonstration.steps.map((step) => ({
    stepId: step.stepId,
    inputEvents: step.inputEvents.map((event) => redactInputEvent(event, replacements, businessSensitiveTags))
  }));
  const rawKinds = new Set(demonstration.rawArtifacts.map((artifact) => artifact.kind));
  const manifest: NormalizedCaptureManifest = {
    schemaVersion: 1,
    captureId: demonstration.captureId,
    flowId: demonstration.flowId,
    flowPath: flowArtifact.path,
    tool: demonstration.tool,
    generatedAt: demonstration.createdAt,
    dataClass: demonstration.dataClass,
    rawCapturePolicy: "unsafe-to-share-local-only",
    redactionPolicy: "hard-secret-redaction-v0",
    rawCaptureSummary: {
      screenRecordingCaptured: rawKinds.has("screen-recording"),
      keyboardEventLogCaptured: rawKinds.has("keyboard-event-log"),
      mouseEventLogCaptured: rawKinds.has("mouse-event-log"),
      humanNotesCaptured: rawKinds.has("human-context-notes")
    },
    rawArtifacts: demonstration.rawArtifacts.map((artifact) => ({
      kind: artifact.kind,
      safety: artifact.safety,
      gitPolicy: artifact.gitPolicy
    })),
    redactedFrames,
    anchors,
    inputEvidence,
    redaction: {
      replacements,
      businessSensitiveTags
    }
  };
  const json = `${JSON.stringify(manifest, null, 2)}\n`;

  if (json.includes("captures/raw/") || json.includes("captures/unsafe/") || json.includes("captures/tmp/")) {
    throw new Error("normalized capture manifest cannot include raw or unsafe capture paths");
  }

  return {
    path: manifestPath,
    manifest,
    json
  };
}

function validateDemonstration(demonstration: SeniorDemonstration): void {
  const rawKinds = new Set(demonstration.rawArtifacts.map((artifact) => artifact.kind));
  for (const required of ["screen-recording", "keyboard-event-log", "mouse-event-log"] as const) {
    if (!rawKinds.has(required)) {
      throw new Error(`senior demonstration missing raw capture input: ${required}`);
    }
  }

  for (const artifact of demonstration.rawArtifacts) {
    createRawCaptureArtifact(artifact.captureId, artifact.kind, artifact.path);
  }

  for (const frame of demonstration.frames) {
    if (frame.redactedFramePath.startsWith("captures/raw/") || frame.redactedFramePath.startsWith("captures/unsafe/")) {
      throw new Error(`shareable flow cannot reference unsafe frame: ${frame.redactedFramePath}`);
    }
  }

  for (const step of demonstration.steps) {
    if (step.userAction.manualOnly !== true) {
      throw new Error(`step ${step.stepId} must be manual-only`);
    }

    if (step.inputEvents.length === 0) {
      throw new Error(`step ${step.stepId} has no screen-plus-input evidence`);
    }
  }
}

function renderFlowMarkdown(demonstration: SeniorDemonstration): string {
  const frontmatter = [
    "---",
    `flow-id: ${demonstration.flowId}`,
    `flow-version: ${demonstration.flowVersion}`,
    `tool: ${demonstration.tool}`,
    `tool-surface: ${demonstration.toolSurface}`,
    `capture-id: ${demonstration.captureId}`,
    `created-at: "${demonstration.createdAt}"`,
    `created-by-role: ${demonstration.createdByRole}`,
    `terminal-business-state: ${demonstration.terminalBusinessState}`,
    "confidence-threshold: 0.75",
    `data-class: ${demonstration.dataClass}`,
    "raw-capture-policy: unsafe-to-share-local-only",
    "redaction-policy: hard-secret-redaction-v0",
    "supports-overlay-highlights: true",
    "input-automation-allowed: false",
    "---"
  ].join("\n");

  const stepBlocks = demonstration.steps.map((step, index) => renderStep(demonstration, step, index + 1)).join("\n\n");
  const optionalNotes = demonstration.humanNotes ? `\n\n## senior notes\n\n${demonstration.humanNotes}` : "";

  return `${frontmatter}

# ${titleFromFlowId(demonstration.flowId)}

This normalized flow was generated from one senior demonstration using screen recording, keyboard and mouse event logs, and optional senior notes. Raw capture artifacts are unsafe-to-share and excluded from git; anchors reference redacted frame paths only.

${stepBlocks}
${optionalNotes}

## evidence

- raw capture: local unsafe artifacts under ignored capture paths
- redacted frames: ${firstRedactedFrameDirectory(demonstration)}
- input logs: keyboard and mouse event logs captured in raw artifacts

## safety

- raw capture policy: unsafe-to-share local only
- input automation allowed: false
- proof access: screen observations and simulated low-level fixture input only
`;
}

function renderStep(demonstration: SeniorDemonstration, step: DemonstrationStep, stepNumber: number): string {
  const frame = findFrame(demonstration, step.expectedFrameId);
  const anchors = demonstration.anchors.filter((anchor) => anchor.frameId === step.expectedFrameId);
  const regionHints = anchors.map((anchor) => ({
    "anchor-id": anchor.anchorId,
    x: anchor.x,
    y: anchor.y,
    width: anchor.width,
    height: anchor.height,
    "source-frame": frame.redactedFramePath
  }));
  const stepJson = {
    "step-id": step.stepId,
    title: step.title,
    "expected-state": {
      "visible-text": step.expectedVisibleText,
      "forbidden-visible-secrets": true,
      "screen-region-hints": regionHints
    },
    instruction: {
      text: step.instructionText,
      "highlight-anchor-id": step.highlightAnchorId,
      "allowed-guidance": ["text", "highlight"],
      "forbidden-guidance": ["click", "type", "submit", "automate"]
    },
    "user-action": {
      kind: step.userAction.kind,
      "target-anchor-id": step.userAction.targetAnchorId,
      "manual-only": step.userAction.manualOnly
    },
    "success-condition": {
      "visible-text": step.successVisibleText,
      terminal: step.terminal
    },
    fallback: {
      "below-confidence-message": belowConfidenceMessage,
      "restart-from-step": step.stepId
    }
  };

  return `## step ${stepNumber}

${step.instructionText}

\`\`\`json
${JSON.stringify(stepJson, null, 2)}
\`\`\``;
}

function findFrame(demonstration: SeniorDemonstration, frameId: string): DemonstrationFrame {
  const frame = demonstration.frames.find((candidate) => candidate.frameId === frameId);
  if (!frame) {
    throw new Error(`missing demonstration frame: ${frameId}`);
  }

  return frame;
}

function titleFromFlowId(flowId: string): string {
  return flowId.replace(/-/g, " ");
}

function firstRedactedFrameDirectory(demonstration: SeniorDemonstration): string {
  const firstFrame = demonstration.frames[0]?.redactedFramePath;
  if (!firstFrame) {
    return "none";
  }

  return firstFrame.slice(0, firstFrame.lastIndexOf("/"));
}

function redactInputEvent(
  event: DemonstrationInputEvent,
  replacements: string[],
  businessSensitiveTags: { kind: string; value: string }[]
): DemonstrationInputEvent {
  return {
    ...event,
    text: event.text ? redactManifestString(event.text, replacements, businessSensitiveTags) : undefined
  };
}

function redactManifestString(
  value: string,
  replacements: string[],
  businessSensitiveTags: { kind: string; value: string }[]
): string {
  const redacted = redactShareableText(value);
  replacements.push(...redacted.replacements);
  businessSensitiveTags.push(...redacted.businessSensitiveTags);
  return redacted.text;
}

function rawArtifactContent(demonstration: SeniorDemonstration, artifact: RawCaptureArtifact): string {
  if (artifact.kind === "screen-recording") {
    return [
      "fixture screen recording marker",
      `capture-id=${demonstration.captureId}`,
      `flow-id=${demonstration.flowId}`,
      "unsafe-to-share=true",
      "note=this marker is not a native OS screen recording"
    ].join("\n");
  }

  if (artifact.kind === "keyboard-event-log") {
    return `${demonstration.steps
      .flatMap((step) => step.inputEvents.filter((event) => event.kind === "keyboard").map((event) => ({ stepId: step.stepId, ...event })))
      .map((event) => JSON.stringify(event))
      .join("\n")}\n`;
  }

  if (artifact.kind === "mouse-event-log") {
    return `${demonstration.steps
      .flatMap((step) => step.inputEvents.filter((event) => event.kind === "mouse").map((event) => ({ stepId: step.stepId, ...event })))
      .map((event) => JSON.stringify(event))
      .join("\n")}\n`;
  }

  return demonstration.humanNotes ? `${demonstration.humanNotes}\n` : "";
}
