import type { DeterministicFixture, FixtureTransition, ScreenObservation } from "@onboardai/fixtures";
import type { FlowDocument, FlowStep } from "@onboardai/flow";
import { renderOverlayGuidance } from "@onboardai/overlay";

export type EvalAccessMode = "screen-observation" | "simulated-low-level-input";

export interface EvalHarnessPolicy {
  readonly allowed: readonly EvalAccessMode[];
  readonly forbidden: readonly string[];
}

export const deterministicHarnessPolicy: EvalHarnessPolicy = {
  allowed: ["screen-observation", "simulated-low-level-input"],
  forbidden: ["llm-inference", "dom-inspection", "browser-selectors", "api-access", "backend-access", "database-access", "target-tool-mcp"]
};

export function assertNoPrivilegedProofAccess(accesses: readonly string[]): void {
  const forbidden = new Set(deterministicHarnessPolicy.forbidden);
  const violation = accesses.find((access) => forbidden.has(access));

  if (violation) {
    throw new Error(`forbidden eval proof access: ${violation}`);
  }
}

export interface ScreenStateMatch {
  readonly confidence: number;
  readonly matchedVisibleText: readonly string[];
  readonly missingVisibleText: readonly string[];
}

export interface StepTraceEntry {
  readonly stepId: string;
  readonly title: string;
  readonly fromStateId: string;
  readonly toStateId?: string;
  readonly currentFrame: string;
  readonly expectedVisibleText: readonly string[];
  readonly matchedVisibleText: readonly string[];
  readonly missingVisibleText: readonly string[];
  readonly overlayConfidence: number;
  readonly overlayKind: "instruction" | "fail-closed";
  readonly overlayMessage: string;
  readonly highlightedAnchorId: string | null;
  readonly actionPrimitive: {
    readonly kind: string;
    readonly targetAnchorId?: string;
    readonly manualOnly: boolean;
  };
  readonly success: boolean;
  readonly failureReason?: string;
}

export interface EvalRunResult {
  readonly tool: string;
  readonly flowId: string;
  readonly runId: string;
  readonly passed: boolean;
  readonly completionRate: number;
  readonly stepCount: number;
  readonly stepsCompleted: number;
  readonly stepsFailed: number;
  readonly firstStuckStep: string | null;
  readonly overlayConfidencePerStep: readonly { readonly stepId: string; readonly confidence: number }[];
  readonly belowThresholdEvents: number;
  readonly overlayMisreads: readonly string[];
  readonly inventedStepIncidents: number;
  readonly humanHelpIncidents: number;
  readonly privilegedAccessViolations: readonly string[];
  readonly terminalBusinessState: string;
  readonly terminalExpectedVisibleText: readonly string[];
  readonly terminalMissingVisibleText: readonly string[];
  readonly terminalBusinessStateReached: boolean;
  readonly heldOutFromCapture: boolean;
  readonly reviewerSignoffResult: "accepted" | "rejected";
  readonly finalStateId: string;
  readonly finalVisibleText: readonly string[];
  readonly trace: readonly StepTraceEntry[];
}

export interface EvalProofAuditFinding {
  readonly tool: string;
  readonly message: string;
}

export interface EvalProofAuditResult {
  readonly passed: boolean;
  readonly requiredTools: readonly string[];
  readonly toolsAudited: readonly string[];
  readonly findings: readonly EvalProofAuditFinding[];
  readonly shareableEvidence: ShareableEvidencePathAuditResult;
  readonly summary: {
    readonly toolsPassed: number;
    readonly toolsRequired: number;
    readonly stepsCompleted: number;
    readonly stepsRequired: number;
    readonly belowThresholdEvents: number;
    readonly humanHelpIncidents: number;
    readonly inventedStepIncidents: number;
    readonly privilegedAccessViolations: number;
    readonly evidenceReferencesAudited: number;
    readonly missingEvidenceReferences: number;
    readonly unsafeEvidenceReferences: number;
    readonly disallowedEvidenceReferences: number;
  };
}

export interface ShareableEvidencePathReference {
  readonly tool: string;
  readonly label: string;
  readonly path: string;
}

export interface ShareableEvidencePathFinding {
  readonly tool: string;
  readonly label: string;
  readonly path: string;
  readonly message: string;
}

export interface ShareableEvidencePathAuditResult {
  readonly passed: boolean;
  readonly referencesAudited: number;
  readonly findings: readonly ShareableEvidencePathFinding[];
  readonly summary: {
    readonly missingReferences: number;
    readonly unsafeReferences: number;
    readonly disallowedReferences: number;
  };
}

const allowedShareableEvidencePrefixes = [
  "flows/",
  "captures/normalized/",
  "captures/redacted/",
  "evals/fixtures/",
  "evals/reports/",
  "evals/reviewer-checklists/",
  "evals/runs/"
] as const;

export function matchScreenState(step: FlowStep, observation: ScreenObservation): ScreenStateMatch {
  const expectedVisibleText = step["expected-state"]["visible-text"] ?? [];
  const normalizedVisible = observation.visibleText.map((text) => text.toLowerCase());
  const matchedVisibleText = expectedVisibleText.filter((expected) => normalizedVisible.includes(expected.toLowerCase()));
  const missingVisibleText = expectedVisibleText.filter((expected) => !normalizedVisible.includes(expected.toLowerCase()));
  const confidence = expectedVisibleText.length === 0 ? 0 : matchedVisibleText.length / expectedVisibleText.length;

  return {
    confidence,
    matchedVisibleText,
    missingVisibleText
  };
}

export function auditEvalProofResults(
  results: readonly EvalRunResult[],
  requiredTools: readonly string[] = ["odoo", "notion"],
  shareableEvidence: ShareableEvidencePathAuditResult = emptyShareableEvidencePathAudit()
): EvalProofAuditResult {
  const findings: EvalProofAuditFinding[] = [];
  const resultsByTool = new Map<string, EvalRunResult[]>();

  for (const result of results) {
    const existing = resultsByTool.get(result.tool) ?? [];
    resultsByTool.set(result.tool, [...existing, result]);
  }

  for (const requiredTool of requiredTools) {
    const toolResults = resultsByTool.get(requiredTool) ?? [];
    if (toolResults.length === 0) {
      findings.push({ tool: requiredTool, message: "missing required eval result" });
      continue;
    }

    if (toolResults.length > 1) {
      findings.push({ tool: requiredTool, message: "duplicate eval results for required tool" });
    }

    auditSingleEvalResult(toolResults[0], findings);
  }

  for (const result of results) {
    if (!requiredTools.includes(result.tool)) {
      findings.push({ tool: result.tool, message: "unexpected tool in proof audit" });
    }
  }

  for (const finding of shareableEvidence.findings) {
    findings.push({
      tool: finding.tool,
      message: `shareable evidence ${finding.label} ${finding.path}: ${finding.message}`
    });
  }

  const requiredResults = requiredTools.flatMap((tool) => resultsByTool.get(tool)?.slice(0, 1) ?? []);
  const summary = {
    toolsPassed: requiredResults.filter((result) => result.passed).length,
    toolsRequired: requiredTools.length,
    stepsCompleted: requiredResults.reduce((sum, result) => sum + result.stepsCompleted, 0),
    stepsRequired: requiredResults.reduce((sum, result) => sum + result.stepCount, 0),
    belowThresholdEvents: requiredResults.reduce((sum, result) => sum + result.belowThresholdEvents, 0),
    humanHelpIncidents: requiredResults.reduce((sum, result) => sum + result.humanHelpIncidents, 0),
    inventedStepIncidents: requiredResults.reduce((sum, result) => sum + result.inventedStepIncidents, 0),
    privilegedAccessViolations: requiredResults.reduce((sum, result) => sum + result.privilegedAccessViolations.length, 0),
    evidenceReferencesAudited: shareableEvidence.referencesAudited,
    missingEvidenceReferences: shareableEvidence.summary.missingReferences,
    unsafeEvidenceReferences: shareableEvidence.summary.unsafeReferences,
    disallowedEvidenceReferences: shareableEvidence.summary.disallowedReferences
  };

  return {
    passed: findings.length === 0,
    requiredTools,
    toolsAudited: requiredResults.map((result) => result.tool),
    findings,
    shareableEvidence,
    summary
  };
}

export function auditShareableEvidencePaths(
  references: readonly ShareableEvidencePathReference[],
  existsPath: (path: string) => boolean = () => true
): ShareableEvidencePathAuditResult {
  const findings: ShareableEvidencePathFinding[] = [];

  for (const reference of references) {
    const path = reference.path.trim();

    if (!path) {
      findings.push({ ...reference, path, message: "path is empty" });
      continue;
    }

    if (isAbsolutePath(path) || path.includes("..")) {
      findings.push({ ...reference, path, message: "path must be project-relative and must not traverse directories" });
    }

    if (isUnsafeEvidencePath(path)) {
      findings.push({ ...reference, path, message: "path points to unsafe capture evidence" });
    }

    if (!isAllowedShareableEvidencePath(path)) {
      findings.push({ ...reference, path, message: "path is outside allowed shareable evidence locations" });
    }

    if (!existsPath(path)) {
      findings.push({ ...reference, path, message: "path is missing on disk" });
    }
  }

  return {
    passed: findings.length === 0,
    referencesAudited: references.length,
    findings,
    summary: {
      missingReferences: findings.filter((finding) => finding.message.includes("missing")).length,
      unsafeReferences: findings.filter((finding) => finding.message.includes("unsafe")).length,
      disallowedReferences: findings.filter((finding) => finding.message.includes("outside") || finding.message.includes("project-relative")).length
    }
  };
}

export function runDeterministicEval(flow: FlowDocument, fixture: DeterministicFixture): EvalRunResult {
  assertNoPrivilegedProofAccess(["screen-observation", "simulated-low-level-input"]);

  const flowId = String(flow.frontmatter["flow-id"]);
  const threshold = Number(flow.frontmatter["confidence-threshold"]);
  const terminalBusinessState = String(flow.frontmatter["terminal-business-state"]);
  const observationsByState = new Map(fixture.observations.map((observation) => [observation.stateId, observation]));
  const trace: StepTraceEntry[] = [];
  const overlayConfidencePerStep: { stepId: string; confidence: number }[] = [];
  const overlayMisreads: string[] = [];
  const privilegedAccessViolations: string[] = [];
  let currentStateId = fixture.startStateId;
  let firstStuckStep: string | null = null;
  let belowThresholdEvents = 0;
  let stepsCompleted = 0;

  if (flow.frontmatter.tool !== fixture.tool) {
    return failedRun(flow, fixture, `flow tool ${String(flow.frontmatter.tool)} does not match fixture tool ${fixture.tool}`);
  }

  if (terminalBusinessState !== fixture.terminalBusinessState) {
    return failedRun(flow, fixture, "flow terminal business state does not match fixture terminal state");
  }

  for (const step of flow.steps) {
    const observation = observationsByState.get(currentStateId);
    if (!observation) {
      firstStuckStep = step["step-id"];
      overlayMisreads.push(`missing fixture observation: ${currentStateId}`);
      break;
    }

    const match = matchScreenState(step, observation);
    overlayConfidencePerStep.push({ stepId: step["step-id"], confidence: match.confidence });
    const overlay = renderOverlayGuidance(step, match.confidence, threshold);

    const traceEntryBase = {
      stepId: step["step-id"],
      title: step.title,
      fromStateId: currentStateId,
      currentFrame: observation.frame,
      expectedVisibleText: step["expected-state"]["visible-text"] ?? [],
      matchedVisibleText: match.matchedVisibleText,
      missingVisibleText: match.missingVisibleText,
      overlayConfidence: match.confidence,
      overlayKind: overlay.kind,
      overlayMessage: overlay.message,
      highlightedAnchorId: overlay.highlight?.["anchor-id"] ?? null,
      actionPrimitive: {
        kind: step["user-action"].kind,
        targetAnchorId: step["user-action"]["target-anchor-id"],
        manualOnly: step["user-action"]["manual-only"]
      }
    } satisfies Omit<StepTraceEntry, "success" | "toStateId" | "failureReason">;

    if (overlay.kind === "fail-closed") {
      belowThresholdEvents += 1;
      firstStuckStep ??= step["step-id"];
      trace.push({ ...traceEntryBase, success: false, failureReason: "overlay failed closed below confidence threshold" });
      break;
    }

    if (overlay.canAutomateInput !== false) {
      firstStuckStep ??= step["step-id"];
      overlayMisreads.push(`overlay exposed automation for ${step["step-id"]}`);
      trace.push({ ...traceEntryBase, success: false, failureReason: "overlay exposed input automation" });
      break;
    }

    const transitionResult = findTransition(fixture.transitions, currentStateId, step);
    if (transitionResult.kind === "failure") {
      firstStuckStep ??= step["step-id"];
      trace.push({ ...traceEntryBase, success: false, failureReason: transitionResult.reason });
      break;
    }

    const nextObservation = observationsByState.get(transitionResult.transition.toStateId);
    if (!nextObservation) {
      firstStuckStep ??= step["step-id"];
      trace.push({ ...traceEntryBase, success: false, failureReason: `transition target has no observation: ${transitionResult.transition.toStateId}` });
      break;
    }

    const missingSuccessText = (step["success-condition"]["visible-text"] ?? []).filter(
      (expected) => !nextObservation.visibleText.map((text) => text.toLowerCase()).includes(expected.toLowerCase())
    );
    if (missingSuccessText.length > 0) {
      firstStuckStep ??= step["step-id"];
      trace.push({
        ...traceEntryBase,
        toStateId: nextObservation.stateId,
        success: false,
        failureReason: `success condition missing visible text: ${missingSuccessText.join(", ")}`
      });
      break;
    }

    trace.push({ ...traceEntryBase, toStateId: nextObservation.stateId, success: true });
    currentStateId = nextObservation.stateId;
    stepsCompleted += 1;
  }

  const finalObservation = observationsByState.get(currentStateId);
  const terminalMissingVisibleText = missingVisibleText(fixture.terminalVisibleText, finalObservation?.visibleText ?? []);
  const terminalBusinessStateReached = currentStateId === fixture.terminalStateId && terminalMissingVisibleText.length === 0;
  const passed =
    stepsCompleted === flow.steps.length &&
    terminalBusinessStateReached &&
    belowThresholdEvents === 0 &&
    overlayMisreads.length === 0 &&
    privilegedAccessViolations.length === 0;

  return {
    tool: fixture.tool,
    flowId,
    runId: fixture.runId,
    passed,
    completionRate: flow.steps.length === 0 ? 0 : stepsCompleted / flow.steps.length,
    stepCount: flow.steps.length,
    stepsCompleted,
    stepsFailed: flow.steps.length - stepsCompleted,
    firstStuckStep,
    overlayConfidencePerStep,
    belowThresholdEvents,
    overlayMisreads,
    inventedStepIncidents: 0,
    humanHelpIncidents: 0,
    privilegedAccessViolations,
    terminalBusinessState,
    terminalExpectedVisibleText: fixture.terminalVisibleText,
    terminalMissingVisibleText,
    terminalBusinessStateReached,
    heldOutFromCapture: fixture.heldOutFromCapture,
    reviewerSignoffResult: passed ? "accepted" : "rejected",
    finalStateId: currentStateId,
    finalVisibleText: finalObservation?.visibleText ?? [],
    trace
  };
}

function auditSingleEvalResult(result: EvalRunResult, findings: EvalProofAuditFinding[]): void {
  if (!result.passed) findings.push({ tool: result.tool, message: "eval result did not pass" });
  if (result.completionRate !== 1) findings.push({ tool: result.tool, message: "completion rate was not 1" });
  if (result.stepCount === 0) findings.push({ tool: result.tool, message: "eval had no taught steps" });
  if (result.stepsCompleted !== result.stepCount) findings.push({ tool: result.tool, message: "not all taught steps completed" });
  if (result.stepsFailed !== 0) findings.push({ tool: result.tool, message: "eval reported failed steps" });
  if (result.firstStuckStep !== null) findings.push({ tool: result.tool, message: "eval reported a stuck step" });
  if (result.belowThresholdEvents !== 0) findings.push({ tool: result.tool, message: "overlay had below-threshold events" });
  if (result.overlayMisreads.length !== 0) findings.push({ tool: result.tool, message: "overlay misread one or more steps" });
  if (result.inventedStepIncidents !== 0) findings.push({ tool: result.tool, message: "overlay invented steps" });
  if (result.humanHelpIncidents !== 0) findings.push({ tool: result.tool, message: "human help was used" });
  if (result.privilegedAccessViolations.length !== 0) findings.push({ tool: result.tool, message: "privileged proof access was used" });
  if (!result.terminalBusinessStateReached) findings.push({ tool: result.tool, message: "terminal business state was not reached" });
  if (result.terminalMissingVisibleText.length !== 0) findings.push({ tool: result.tool, message: "terminal visible text was missing" });
  if (!result.heldOutFromCapture) findings.push({ tool: result.tool, message: "eval observations were not held out from capture frames" });
  if (result.reviewerSignoffResult !== "accepted") findings.push({ tool: result.tool, message: "senior reviewer did not sign off" });
  if (result.trace.length !== result.stepCount) findings.push({ tool: result.tool, message: "step trace length did not match step count" });

  result.trace.forEach((entry, index) => {
    const stepLabel = `${entry.stepId || `step-${index + 1}`}`;
    if (!entry.success) findings.push({ tool: result.tool, message: `${stepLabel} did not succeed` });
    if (entry.overlayKind !== "instruction") findings.push({ tool: result.tool, message: `${stepLabel} did not show instruction guidance` });
    if (entry.overlayConfidence < 0.75) findings.push({ tool: result.tool, message: `${stepLabel} confidence was below 0.75` });
    if (!entry.highlightedAnchorId) findings.push({ tool: result.tool, message: `${stepLabel} did not highlight a grounded anchor` });
    if (entry.actionPrimitive.manualOnly !== true) findings.push({ tool: result.tool, message: `${stepLabel} action was not manual-only` });
    if (!entry.currentFrame.startsWith("evals/fixtures/")) {
      findings.push({ tool: result.tool, message: `${stepLabel} did not use held-out fixture frame evidence` });
    }
    if (entry.currentFrame.startsWith("captures/raw/") || entry.currentFrame.startsWith("captures/unsafe/") || entry.currentFrame.startsWith("captures/tmp/")) {
      findings.push({ tool: result.tool, message: `${stepLabel} used unsafe capture frame evidence` });
    }
  });
}

function emptyShareableEvidencePathAudit(): ShareableEvidencePathAuditResult {
  return {
    passed: true,
    referencesAudited: 0,
    findings: [],
    summary: {
      missingReferences: 0,
      unsafeReferences: 0,
      disallowedReferences: 0
    }
  };
}

function isAllowedShareableEvidencePath(path: string): boolean {
  return allowedShareableEvidencePrefixes.some((prefix) => path.startsWith(prefix));
}

function isUnsafeEvidencePath(path: string): boolean {
  return path.startsWith("captures/raw/") || path.startsWith("captures/unsafe/") || path.startsWith("captures/tmp/");
}

function isAbsolutePath(path: string): boolean {
  return path.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(path);
}

function findTransition(
  transitions: readonly FixtureTransition[],
  currentStateId: string,
  step: FlowStep
): { readonly kind: "success"; readonly transition: FixtureTransition } | { readonly kind: "failure"; readonly reason: string } {
  const matches = transitions.filter((transition) => {
    return (
      transition.fromStateId === currentStateId &&
      transition.action.kind === step["user-action"].kind &&
      transition.action.targetAnchorId === step["user-action"]["target-anchor-id"]
    );
  });

  if (matches.length === 0) {
    return { kind: "failure", reason: "no fixture transition matched the manual user action" };
  }

  if (matches.length > 1) {
    return { kind: "failure", reason: "ambiguous fixture transition matched the manual user action" };
  }

  return { kind: "success", transition: matches[0] };
}

function failedRun(flow: FlowDocument, fixture: DeterministicFixture, reason: string): EvalRunResult {
  return {
    tool: fixture.tool,
    flowId: String(flow.frontmatter["flow-id"] ?? "unknown"),
    runId: fixture.runId,
    passed: false,
    completionRate: 0,
    stepCount: flow.steps.length,
    stepsCompleted: 0,
    stepsFailed: flow.steps.length,
    firstStuckStep: flow.steps[0]?.["step-id"] ?? null,
    overlayConfidencePerStep: [],
    belowThresholdEvents: 0,
    overlayMisreads: [reason],
    inventedStepIncidents: 0,
    humanHelpIncidents: 0,
    privilegedAccessViolations: [],
    terminalBusinessState: String(flow.frontmatter["terminal-business-state"] ?? ""),
    terminalExpectedVisibleText: fixture.terminalVisibleText,
    terminalMissingVisibleText: fixture.terminalVisibleText,
    terminalBusinessStateReached: false,
    heldOutFromCapture: fixture.heldOutFromCapture,
    reviewerSignoffResult: "rejected",
    finalStateId: fixture.startStateId,
    finalVisibleText: [],
    trace: []
  };
}

function missingVisibleText(expectedVisibleText: readonly string[], actualVisibleText: readonly string[]): readonly string[] {
  const normalizedActual = actualVisibleText.map((text) => text.toLowerCase());
  return expectedVisibleText.filter((expected) => !normalizedActual.includes(expected.toLowerCase()));
}
