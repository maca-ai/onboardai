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

export const belowConfidenceMessage = "screen state not recognized. ask a human or restart this step.";

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
