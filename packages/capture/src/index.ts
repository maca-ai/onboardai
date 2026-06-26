import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { containsForbiddenPersistedSecret, redactShareableText } from "@onboardai/redaction";

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
  readonly runId?: string;
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
    readonly captureId: string;
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

export interface LocalRawCaptureInputDirectories {
  readonly raw: string;
  readonly unsafe: string;
  readonly tmp: string;
}

export interface NormalizedRunCaptureManifestOptions {
  readonly tool: SeniorDemonstration["tool"];
  readonly runId: string;
}

export interface NormalizedRunCaptureManifestValidationOptions {
  readonly tool: SeniorDemonstration["tool"];
  readonly runId: string;
  readonly flowId?: string;
  readonly flowPath?: string;
}

export interface NormalizedRunCaptureManifestValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
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
export type CaptureAdapterBehavior =
  | "screen-recording"
  | "keyboard-event-log"
  | "mouse-event-log"
  | "redacted-frame-output"
  | "raw-artifacts-ignored";

export interface CaptureAdapterDocReference {
  readonly sourceType: "official-docs" | "context7";
  readonly reference: string;
  readonly appliesToAdapterVersion: string;
  readonly behaviors: readonly CaptureAdapterBehavior[];
}

export interface CaptureAdapterReadiness {
  readonly adapterKind: CaptureAdapterKind;
  readonly adapterName: string;
  readonly adapterVersion: string;
  readonly platform: CaptureAdapterPlatform;
  readonly docsVerified: boolean;
  readonly verifiedDocReferences: readonly CaptureAdapterDocReference[];
  readonly screenRecording: boolean;
  readonly keyboardEventLog: boolean;
  readonly mouseEventLog: boolean;
  readonly redactedFrameOutput: boolean;
  readonly rawArtifactsIgnored: boolean;
  readonly blockers: readonly string[];
}

export interface NativeCaptureReadinessValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export const belowConfidenceMessage = "screen state not recognized. ask a human or restart this step.";

export function fixtureCaptureReadiness(): CaptureAdapterReadiness {
  return {
    adapterKind: "fixture",
    adapterName: "onboardai-fixture-capture",
    adapterVersion: "0.0.0-local",
    platform: "fixture",
    docsVerified: true,
    verifiedDocReferences: [],
    screenRecording: true,
    keyboardEventLog: true,
    mouseEventLog: true,
    redactedFrameOutput: true,
    rawArtifactsIgnored: true,
    blockers: []
  };
}

export function assertNativeCaptureReady(readiness: CaptureAdapterReadiness): void {
  const validation = validateNativeCaptureReadiness(readiness);
  if (!validation.valid) {
    throw new Error(`native capture adapter is not ready: ${validation.errors.join(", ")}`);
  }
}

export function validateNativeCaptureReadiness(input: unknown): NativeCaptureReadinessValidationResult {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { valid: false, errors: ["native capture readiness must be an object"] };
  }

  const adapterName = typeof input.adapterName === "string" ? input.adapterName : "";
  const adapterVersion = typeof input.adapterVersion === "string" ? input.adapterVersion : "";

  if (input.adapterKind !== "native") {
    errors.push("native adapter kind");
  }

  if (adapterName.length === 0) errors.push("native adapter name");
  if (adapterVersion.length === 0) errors.push("native adapter version");
  if (input.platform !== "macos" && input.platform !== "windows") errors.push("native adapter platform");
  if (input.docsVerified !== true) errors.push("verified official documentation");
  if (input.screenRecording !== true) errors.push("screen recording");
  if (input.keyboardEventLog !== true) errors.push("keyboard event log");
  if (input.mouseEventLog !== true) errors.push("mouse event log");
  if (input.redactedFrameOutput !== true) errors.push("redacted frame output");
  if (input.rawArtifactsIgnored !== true) errors.push("raw artifact git ignore");

  if (!Array.isArray(input.blockers)) {
    errors.push("blockers list");
  } else if (input.blockers.length > 0) {
    errors.push(...input.blockers.map((blocker) => (typeof blocker === "string" && blocker.length > 0 ? blocker : "native capture blocker")));
  }

  errors.push(...nativeCaptureDocReferenceFindings(input.verifiedDocReferences, adapterVersion));

  return { valid: errors.length === 0, errors };
}

function nativeCaptureDocReferenceFindings(references: unknown, adapterVersion: string): string[] {
  const requiredBehaviors: readonly CaptureAdapterBehavior[] = [
    "screen-recording",
    "keyboard-event-log",
    "mouse-event-log",
    "redacted-frame-output",
    "raw-artifacts-ignored"
  ];

  if (!Array.isArray(references) || references.length === 0) {
    return ["verified documentation references"];
  }

  const findings: string[] = [];
  const coveredBehaviors = new Set<CaptureAdapterBehavior>();

  references.forEach((reference, index) => {
    if (!isRecord(reference)) {
      findings.push(`verifiedDocReferences[${index}] object`);
      return;
    }

    const referenceValue = typeof reference.reference === "string" ? reference.reference : "";
    let validReference = true;

    if (reference.sourceType !== "official-docs" && reference.sourceType !== "context7") {
      findings.push(`verifiedDocReferences[${index}] source type`);
      validReference = false;
    }

    if (reference.sourceType === "official-docs" && !/^https?:\/\//.test(referenceValue)) {
      findings.push(`verifiedDocReferences[${index}] official docs URL`);
      validReference = false;
    }

    if (reference.sourceType === "context7" && !referenceValue.startsWith("/")) {
      findings.push(`verifiedDocReferences[${index}] context7 library id`);
      validReference = false;
    }

    if (referenceValue.length === 0) {
      findings.push(`verifiedDocReferences[${index}] reference`);
      validReference = false;
    }

    if (reference.appliesToAdapterVersion !== adapterVersion) {
      findings.push(`verifiedDocReferences[${index}] adapter version attribution`);
      validReference = false;
    }

    const behaviors = Array.isArray(reference.behaviors) ? reference.behaviors : [];
    if (behaviors.length === 0) {
      findings.push(`verifiedDocReferences[${index}] capture behavior coverage`);
      validReference = false;
    }

    if (validReference) {
      for (const behavior of behaviors) {
        if (typeof behavior === "string" && requiredBehaviors.includes(behavior as CaptureAdapterBehavior)) {
          coveredBehaviors.add(behavior as CaptureAdapterBehavior);
        } else {
          findings.push(`verifiedDocReferences[${index}] unsupported behavior ${behavior}`);
        }
      }
    }
  });

  for (const behavior of requiredBehaviors) {
    if (!coveredBehaviors.has(behavior)) {
      findings.push(`verified documentation for ${behavior}`);
    }
  }

  return findings;
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
      captureId: artifact.captureId,
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

export function localRawCaptureInputDirectories(captureId: string): LocalRawCaptureInputDirectories {
  assertSafeId(captureId, "capture id");

  return {
    raw: `captures/raw/${captureId}`,
    unsafe: `captures/unsafe/${captureId}`,
    tmp: `captures/tmp/${captureId}`
  };
}

export function createNormalizedRunCaptureManifest(
  demonstration: SeniorDemonstration,
  flowArtifact: NormalizedFlowArtifact,
  options: NormalizedRunCaptureManifestOptions
): NormalizedCaptureManifestArtifact {
  if (options.tool !== demonstration.tool) {
    throw new Error(`normalized run capture manifest tool must match demonstration tool ${demonstration.tool}`);
  }

  assertSafeId(options.runId, "run id");
  assertNoUnredactedShareableText(demonstration);

  const manifestPath = `evals/runs/${options.tool}/${options.runId}/capture-manifest.json`;
  const artifact = createNormalizedCaptureManifest(demonstration, flowArtifact, manifestPath);
  const manifest = {
    ...artifact.manifest,
    runId: options.runId
  };
  const validation = validateNormalizedRunCaptureManifest(manifest, {
    tool: options.tool,
    runId: options.runId,
    flowId: demonstration.flowId,
    flowPath: flowArtifact.path
  });

  if (!validation.valid) {
    throw new Error(`normalized run capture manifest invalid: ${validation.errors.join("; ")}`);
  }

  return {
    path: artifact.path,
    manifest,
    json: `${JSON.stringify(manifest, null, 2)}\n`
  };
}

export function validateNormalizedRunCaptureManifest(
  input: unknown,
  options: NormalizedRunCaptureManifestValidationOptions
): NormalizedRunCaptureManifestValidationResult {
  const errors: string[] = [];
  assertSafeId(options.runId, "run id");
  const runDir = `evals/runs/${options.tool}/${options.runId}`;

  if (!isRecord(input)) {
    return { valid: false, errors: ["normalized run capture manifest must contain an object"] };
  }

  if (input.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1");
  }

  if (input.tool !== options.tool) {
    errors.push(`tool must match ${options.tool}`);
  }

  if (input.runId !== options.runId) {
    errors.push(`runId must match ${options.runId}`);
  }

  if (options.flowId && input.flowId !== options.flowId) {
    errors.push(`flowId must match ${options.flowId}`);
  }

  if (options.flowPath && input.flowPath !== options.flowPath) {
    errors.push(`flowPath must match ${options.flowPath}`);
  }

  if (input.rawCapturePolicy !== "unsafe-to-share-local-only") {
    errors.push("rawCapturePolicy must be unsafe-to-share-local-only");
  }

  if (input.redactionPolicy !== "hard-secret-redaction-v0") {
    errors.push("redactionPolicy must be hard-secret-redaction-v0");
  }

  validateNoForbiddenManifestValues(input, "$", errors);
  validateBusinessSensitiveTags(input, errors);
  validateRawArtifactSummaries(input.rawArtifacts, input.captureId, errors);

  if (!Array.isArray(input.redactedFrames) || input.redactedFrames.length === 0) {
    errors.push("redactedFrames must contain at least one same-run redacted frame");
  } else {
    input.redactedFrames.forEach((frame, index) => {
      if (!isRecord(frame)) {
        errors.push(`redactedFrames[${index}] must be an object`);
        return;
      }

      if (typeof frame.path !== "string" || !isSameRunRedactedFramePath(frame.path, runDir)) {
        errors.push(`redactedFrames[${index}].path must point under ${runDir}/redacted-frame-*.png`);
      }
    });
  }

  if (!Array.isArray(input.inputEvidence) || input.inputEvidence.length === 0) {
    errors.push("inputEvidence must contain per-step input evidence");
  }

  return { valid: errors.length === 0, errors };
}

function validateDemonstration(demonstration: SeniorDemonstration): void {
  const rawKinds = new Set(demonstration.rawArtifacts.map((artifact) => artifact.kind));
  for (const required of ["screen-recording", "keyboard-event-log", "mouse-event-log"] as const) {
    if (!rawKinds.has(required)) {
      throw new Error(`senior demonstration missing raw capture input: ${required}`);
    }
  }

  for (const artifact of demonstration.rawArtifacts) {
    if (artifact.captureId !== demonstration.captureId) {
      throw new Error(`raw capture artifact ${artifact.kind} must belong to capture ${demonstration.captureId}`);
    }

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
      "forbidden-guidance": ["click", "type", "submit", "approve", "delete", "automate"]
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

function assertSafeId(value: string, label: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error(`${label} must be lowercase kebab-case`);
  }
}

function assertNoUnredactedShareableText(demonstration: SeniorDemonstration): void {
  const shareableTexts = [
    demonstration.flowId,
    demonstration.toolSurface,
    demonstration.terminalBusinessState,
    ...demonstration.frames.flatMap((frame) => [frame.frameId, frame.redactedFramePath, ...frame.visibleText]),
    ...demonstration.anchors.flatMap((anchor) => [anchor.anchorId, anchor.frameId]),
    ...demonstration.steps.flatMap((step) => [
      step.stepId,
      step.title,
      step.instructionText,
      step.expectedFrameId,
      step.highlightAnchorId,
      step.userAction.targetAnchorId ?? "",
      ...step.expectedVisibleText,
      ...step.successVisibleText,
      ...step.inputEvents.flatMap((event) => [event.event, event.anchorId ?? "", event.key ?? "", event.text ?? ""])
    ])
  ];

  for (const text of shareableTexts) {
    if (containsForbiddenPersistedSecret(text)) {
      throw new Error("normalized run capture manifest cannot include unredacted email or secret-like text");
    }
  }
}

function validateNoForbiddenManifestValues(input: unknown, location: string, errors: string[]): void {
  if (typeof input === "string") {
    if (containsForbiddenPersistedSecret(input)) {
      errors.push(`${location} contains unredacted email or secret-like text`);
    }

    if (isAbsolutePath(input)) {
      errors.push(`${location} must not contain absolute local paths`);
    }

    if (input.startsWith("file://")) {
      errors.push(`${location} must not contain file:// paths`);
    }

    if (hasTraversal(input)) {
      errors.push(`${location} must not contain traversal paths`);
    }

    if (isUnsafeCaptureReference(input) || hasUnsafePathSegment(input)) {
      errors.push(`${location} must not contain raw, unsafe, or tmp capture references`);
    }

    return;
  }

  if (Array.isArray(input)) {
    input.forEach((item, index) => validateNoForbiddenManifestValues(item, `${location}[${index}]`, errors));
    return;
  }

  if (!isRecord(input)) {
    return;
  }

  for (const [field, value] of Object.entries(input)) {
    if (typeof value === "string" && field.toLowerCase().includes("path") && !isAllowedShareablePathValue(value)) {
      errors.push(`${location}.${field} must use a project-relative shareable artifact path`);
    }

    validateNoForbiddenManifestValues(value, `${location}.${field}`, errors);
  }
}

function validateBusinessSensitiveTags(input: Record<string, unknown>, errors: string[]): void {
  const tags = isRecord(input.redaction) && Array.isArray(input.redaction.businessSensitiveTags) ? input.redaction.businessSensitiveTags : [];
  const tagKeys = new Set(
    tags.flatMap((tag) => (isRecord(tag) && typeof tag.kind === "string" && typeof tag.value === "string" ? [`${tag.kind}:${tag.value}`] : []))
  );
  const serialized = JSON.stringify({ ...input, redaction: undefined });
  const detected = redactShareableText(serialized).businessSensitiveTags;

  for (const tag of detected) {
    if (!tagKeys.has(`${tag.kind}:${tag.value}`)) {
      errors.push(`business-sensitive value must be tagged: ${tag.kind}`);
    }
  }
}

function validateRawArtifactSummaries(rawArtifacts: unknown, captureId: unknown, errors: string[]): void {
  if (!Array.isArray(rawArtifacts) || rawArtifacts.length === 0) {
    errors.push("rawArtifacts must contain sanitized raw artifact summaries");
    return;
  }

  rawArtifacts.forEach((artifact, index) => {
    if (!isRecord(artifact)) {
      errors.push(`rawArtifacts[${index}] must be an object`);
      return;
    }

    for (const field of Object.keys(artifact)) {
      if (field.toLowerCase().includes("path")) {
        errors.push(`rawArtifacts[${index}] must not include raw artifact path field ${field}`);
      }
    }

    if (artifact.captureId !== captureId) {
      errors.push(`rawArtifacts[${index}].captureId must match manifest captureId`);
    }

    if (artifact.safety !== "unsafe-to-share-local-only") {
      errors.push(`rawArtifacts[${index}].safety must be unsafe-to-share-local-only`);
    }

    if (artifact.gitPolicy !== "excluded-from-git") {
      errors.push(`rawArtifacts[${index}].gitPolicy must be excluded-from-git`);
    }
  });
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function isAllowedShareablePathValue(value: string): boolean {
  return value.startsWith("flows/") || value.startsWith("captures/redacted/") || value.startsWith("evals/runs/");
}

function isSameRunRedactedFramePath(path: string, runDir: string): boolean {
  return path.startsWith(`${runDir}/redacted-frame-`) && path.endsWith(".png") && !path.slice(runDir.length + 1).includes("/");
}

function isUnsafeCaptureReference(path: string): boolean {
  return path.startsWith("captures/raw/") || path.startsWith("captures/unsafe/") || path.startsWith("captures/tmp/");
}

function hasUnsafePathSegment(path: string): boolean {
  return path.split("/").some((segment) => segment === "raw" || segment === "unsafe" || segment === "tmp");
}

function hasTraversal(path: string): boolean {
  return path === ".." || path.startsWith("../") || path.includes("/../") || path.endsWith("/..");
}

function isAbsolutePath(path: string): boolean {
  return path.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(path);
}
