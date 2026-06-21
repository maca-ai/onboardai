import type { DeterministicFixture, FixtureTransition, ScreenObservation } from "@onboardai/fixtures";
import { validateFlowMarkdown, type FlowDocument, type FlowStep } from "@onboardai/flow";
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

export interface RealToolProofEvidence {
  readonly tool: string;
  readonly substrate: "real-tool";
  readonly heldOutTeachingEvalPassed: boolean;
  readonly nativeScreenPlusInputCaptureVerified: boolean;
  readonly terminalBusinessStateReached: boolean;
  readonly zeroHumanHelp: boolean;
  readonly noInventedSteps: boolean;
  readonly noPrivilegedAccess: boolean;
  readonly seniorReviewerSignoff: boolean;
  readonly evidencePath: string;
}

export interface CaptureTeachGoalStatusFinding {
  readonly tool: string;
  readonly message: string;
}

export interface CaptureTeachGoalStatusResult {
  readonly fullGoalProven: boolean;
  readonly fixtureProofPassed: boolean;
  readonly realToolProofPassed: boolean;
  readonly requiredTools: readonly string[];
  readonly findings: readonly CaptureTeachGoalStatusFinding[];
  readonly realToolProofs: readonly RealToolProofEvidence[];
  readonly summary: {
    readonly fixtureToolsPassed: number;
    readonly fixtureToolsRequired: number;
    readonly realToolsPassed: number;
    readonly realToolsRequired: number;
    readonly nativeCaptureVerifiedTools: number;
    readonly missingRealToolProofs: number;
  };
}

export interface RealToolProofEvidenceParseResult {
  readonly proofs: readonly RealToolProofEvidence[];
  readonly findings: readonly CaptureTeachGoalStatusFinding[];
}

export interface RealToolRunArtifactAuditResult {
  readonly passed: boolean;
  readonly runDir: string | null;
  readonly references: readonly ShareableEvidencePathReference[];
  readonly findings: readonly CaptureTeachGoalStatusFinding[];
  readonly summary: {
    readonly requiredArtifacts: number;
    readonly missingArtifacts: number;
    readonly invalidArtifacts: number;
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

export function auditCaptureTeachGoalStatus(input: {
  readonly fixtureAudit: EvalProofAuditResult;
  readonly realToolProofs?: readonly RealToolProofEvidence[];
  readonly realToolProofFindings?: readonly CaptureTeachGoalStatusFinding[];
  readonly requiredTools?: readonly string[];
}): CaptureTeachGoalStatusResult {
  const requiredTools = input.requiredTools ?? ["odoo", "notion"];
  const realToolProofs = input.realToolProofs ?? [];
  const findings: CaptureTeachGoalStatusFinding[] = [...(input.realToolProofFindings ?? [])];
  const realProofsByTool = new Map<string, RealToolProofEvidence[]>();

  if (!input.fixtureAudit.passed) {
    findings.push({ tool: "fixture", message: "fixture proof audit did not pass" });
  }

  for (const proof of realToolProofs) {
    const existing = realProofsByTool.get(proof.tool) ?? [];
    realProofsByTool.set(proof.tool, [...existing, proof]);
  }

  for (const requiredTool of requiredTools) {
    const toolProofs = realProofsByTool.get(requiredTool) ?? [];

    if (toolProofs.length === 0) {
      findings.push({ tool: requiredTool, message: "missing real target-tool held-out teaching eval evidence" });
      findings.push({ tool: requiredTool, message: "missing native screen-plus-input capture evidence" });
      continue;
    }

    if (toolProofs.length > 1) {
      findings.push({ tool: requiredTool, message: "duplicate real target-tool proof evidence" });
    }

    auditSingleRealToolProof(toolProofs[0], findings);
  }

  for (const proof of realToolProofs) {
    if (!requiredTools.includes(proof.tool)) {
      findings.push({ tool: proof.tool, message: "unexpected real target-tool proof evidence" });
    }
  }

  const requiredRealProofs = requiredTools.flatMap((tool) => realProofsByTool.get(tool)?.slice(0, 1) ?? []);
  const realToolsPassed = requiredRealProofs.filter(isPassingRealToolProof).length;
  const realToolProofPassed = realToolsPassed === requiredTools.length;

  return {
    fullGoalProven: input.fixtureAudit.passed && realToolProofPassed && findings.length === 0,
    fixtureProofPassed: input.fixtureAudit.passed,
    realToolProofPassed,
    requiredTools,
    findings,
    realToolProofs,
    summary: {
      fixtureToolsPassed: input.fixtureAudit.summary.toolsPassed,
      fixtureToolsRequired: input.fixtureAudit.summary.toolsRequired,
      realToolsPassed,
      realToolsRequired: requiredTools.length,
      nativeCaptureVerifiedTools: requiredRealProofs.filter((proof) => proof.nativeScreenPlusInputCaptureVerified).length,
      missingRealToolProofs: requiredTools.length - requiredRealProofs.length
    }
  };
}

export function parseRealToolProofEvidenceFile(input: unknown, sourcePath: string): RealToolProofEvidenceParseResult {
  if (!isRecord(input)) {
    return {
      proofs: [],
      findings: [{ tool: "unknown", message: `${sourcePath} must contain a real target-tool proof object` }]
    };
  }

  const tool = typeof input.tool === "string" ? input.tool : "unknown";
  const findings: CaptureTeachGoalStatusFinding[] = [];

  if (input.substrate !== "real-tool") {
    findings.push({ tool, message: `${sourcePath} substrate must be real-tool` });
  }

  for (const field of [
    "heldOutTeachingEvalPassed",
    "nativeScreenPlusInputCaptureVerified",
    "terminalBusinessStateReached",
    "zeroHumanHelp",
    "noInventedSteps",
    "noPrivilegedAccess",
    "seniorReviewerSignoff"
  ] as const) {
    if (typeof input[field] !== "boolean") {
      findings.push({ tool, message: `${sourcePath} ${field} must be boolean` });
    }
  }

  if (typeof input.tool !== "string" || input.tool.length === 0) {
    findings.push({ tool, message: `${sourcePath} tool must be a non-empty string` });
  } else if (input.tool !== "odoo" && input.tool !== "notion") {
    findings.push({ tool, message: `${sourcePath} tool must be odoo or notion` });
  }

  if (typeof input.evidencePath !== "string" || input.evidencePath.length === 0) {
    findings.push({ tool, message: `${sourcePath} evidencePath must be a non-empty string` });
  } else {
    if (isAbsolutePath(input.evidencePath) || input.evidencePath.includes("..")) {
      findings.push({ tool, message: `${sourcePath} evidencePath must be project-relative and must not traverse directories` });
    }

    if (!input.evidencePath.startsWith(`evals/runs/${tool}/`)) {
      findings.push({ tool, message: `${sourcePath} evidencePath must live under evals/runs/${tool}/` });
    }

    if (!input.evidencePath.endsWith("/step-trace.json")) {
      findings.push({ tool, message: `${sourcePath} evidencePath must point to a step-trace.json artifact` });
    }
  }

  if (findings.length > 0) {
    return { proofs: [], findings };
  }

  const proof = input as {
    readonly tool: string;
    readonly heldOutTeachingEvalPassed: boolean;
    readonly nativeScreenPlusInputCaptureVerified: boolean;
    readonly terminalBusinessStateReached: boolean;
    readonly zeroHumanHelp: boolean;
    readonly noInventedSteps: boolean;
    readonly noPrivilegedAccess: boolean;
    readonly seniorReviewerSignoff: boolean;
    readonly evidencePath: string;
  };

  return {
    proofs: [
      {
        tool: proof.tool,
        substrate: "real-tool",
        heldOutTeachingEvalPassed: proof.heldOutTeachingEvalPassed,
        nativeScreenPlusInputCaptureVerified: proof.nativeScreenPlusInputCaptureVerified,
        terminalBusinessStateReached: proof.terminalBusinessStateReached,
        zeroHumanHelp: proof.zeroHumanHelp,
        noInventedSteps: proof.noInventedSteps,
        noPrivilegedAccess: proof.noPrivilegedAccess,
        seniorReviewerSignoff: proof.seniorReviewerSignoff,
        evidencePath: proof.evidencePath
      }
    ],
    findings: []
  };
}

export function auditRealToolRunArtifacts(
  proof: RealToolProofEvidence,
  existsPath: (path: string) => boolean = () => true,
  readText?: (path: string) => string
): RealToolRunArtifactAuditResult {
  const findings: CaptureTeachGoalStatusFinding[] = [];
  const references: ShareableEvidencePathReference[] = [];
  const runDir = getRealToolRunDir(proof);

  if (!runDir) {
    findings.push({ tool: proof.tool, message: `${proof.evidencePath} must point to evals/runs/${proof.tool}/<run-id>/step-trace.json` });
    return artifactAuditResult(null, references, findings, 0);
  }

  const requiredArtifacts = [
    { label: "step trace", path: `${runDir}/step-trace.json` },
    { label: "final screen", path: `${runDir}/final-screen.png` },
    { label: "eval recording", path: `${runDir}/eval-recording.mp4` },
    { label: "failure log", path: `${runDir}/failure-log.md` },
    { label: "reviewer checklist", path: `${runDir}/reviewer-checklist.md` },
    { label: "flow evidence", path: `${runDir}/flow-evidence.json` },
    { label: "capture readiness evidence", path: `${runDir}/capture-readiness.json` },
    { label: "screen input evidence", path: `${runDir}/screen-input-evidence.json` },
    { label: "outcome evidence", path: `${runDir}/outcome-evidence.json` }
  ] as const;

  for (const artifact of requiredArtifacts) {
    references.push({ tool: proof.tool, label: artifact.label, path: artifact.path });

    if (isAbsolutePath(artifact.path) || artifact.path.includes("..")) {
      findings.push({ tool: proof.tool, message: `${artifact.label} path must be project-relative and must not traverse directories` });
    }

    if (isUnsafeEvidencePath(artifact.path)) {
      findings.push({ tool: proof.tool, message: `${artifact.label} path points to unsafe capture evidence` });
    }

    if (!existsPath(artifact.path)) {
      findings.push({ tool: proof.tool, message: `${artifact.path} required real run artifact is missing on disk` });
    }
  }

  const screenInputEvidencePath = `${runDir}/screen-input-evidence.json`;
  if (existsPath(screenInputEvidencePath)) {
    if (!readText) {
      findings.push({ tool: proof.tool, message: `${screenInputEvidencePath} cannot be validated without file contents` });
    } else {
      auditScreenInputEvidence(proof, runDir, screenInputEvidencePath, readText(screenInputEvidencePath), existsPath, readText, references, findings);
    }
  }

  const captureReadinessPath = `${runDir}/capture-readiness.json`;
  if (existsPath(captureReadinessPath)) {
    if (!readText) {
      findings.push({ tool: proof.tool, message: `${captureReadinessPath} cannot be validated without file contents` });
    } else {
      auditCaptureReadinessEvidence(proof, captureReadinessPath, readText(captureReadinessPath), findings);
    }
  }

  const stepTracePath = `${runDir}/step-trace.json`;
  if (existsPath(stepTracePath)) {
    if (!readText) {
      findings.push({ tool: proof.tool, message: `${stepTracePath} cannot be validated without file contents` });
    } else {
      auditRealStepTrace(proof, runDir, stepTracePath, readText(stepTracePath), existsPath, references, findings);
    }
  }

  const flowEvidencePath = `${runDir}/flow-evidence.json`;
  if (existsPath(flowEvidencePath)) {
    if (!readText) {
      findings.push({ tool: proof.tool, message: `${flowEvidencePath} cannot be validated without file contents` });
    } else {
      auditFlowEvidence(proof, runDir, flowEvidencePath, readText(flowEvidencePath), existsPath, readText, references, findings);
    }
  }

  const reviewerChecklistPath = `${runDir}/reviewer-checklist.md`;
  if (existsPath(reviewerChecklistPath)) {
    if (!readText) {
      findings.push({ tool: proof.tool, message: `${reviewerChecklistPath} cannot be validated without file contents` });
    } else {
      auditReviewerChecklist(proof, reviewerChecklistPath, readText(reviewerChecklistPath), findings);
      const stepTracePath = `${runDir}/step-trace.json`;
      if (existsPath(stepTracePath)) {
        auditReviewerStepSignoff(proof, reviewerChecklistPath, readText(reviewerChecklistPath), stepTracePath, readText(stepTracePath), findings);
      }
    }
  }

  const outcomeEvidencePath = `${runDir}/outcome-evidence.json`;
  if (existsPath(outcomeEvidencePath)) {
    if (!readText) {
      findings.push({ tool: proof.tool, message: `${outcomeEvidencePath} cannot be validated without file contents` });
    } else {
      auditOutcomeEvidence(proof, runDir, outcomeEvidencePath, readText(outcomeEvidencePath), existsPath, references, findings);
    }
  }

  return artifactAuditResult(runDir, references, findings, requiredArtifacts.length);
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

function auditSingleRealToolProof(proof: RealToolProofEvidence, findings: CaptureTeachGoalStatusFinding[]): void {
  if (proof.substrate !== "real-tool") findings.push({ tool: proof.tool, message: "proof substrate was not real-tool" });
  if (!proof.heldOutTeachingEvalPassed) findings.push({ tool: proof.tool, message: "real target-tool held-out teaching eval did not pass" });
  if (!proof.nativeScreenPlusInputCaptureVerified) findings.push({ tool: proof.tool, message: "native screen-plus-input capture was not verified" });
  if (!proof.terminalBusinessStateReached) findings.push({ tool: proof.tool, message: "terminal business state was not reached" });
  if (!proof.zeroHumanHelp) findings.push({ tool: proof.tool, message: "human help was used during real target-tool eval" });
  if (!proof.noInventedSteps) findings.push({ tool: proof.tool, message: "overlay invented steps during real target-tool eval" });
  if (!proof.noPrivilegedAccess) findings.push({ tool: proof.tool, message: "privileged access was used during real target-tool eval" });
  if (!proof.seniorReviewerSignoff) findings.push({ tool: proof.tool, message: "senior reviewer did not sign off real target-tool steps" });
  if (!proof.evidencePath.startsWith("evals/runs/")) findings.push({ tool: proof.tool, message: "real target-tool evidence path must live under evals/runs" });
}

function isPassingRealToolProof(proof: RealToolProofEvidence): boolean {
  return (
    proof.substrate === "real-tool" &&
    proof.heldOutTeachingEvalPassed &&
    proof.nativeScreenPlusInputCaptureVerified &&
    proof.terminalBusinessStateReached &&
    proof.zeroHumanHelp &&
    proof.noInventedSteps &&
    proof.noPrivilegedAccess &&
    proof.seniorReviewerSignoff &&
    proof.evidencePath.startsWith("evals/runs/")
  );
}

function auditScreenInputEvidence(
  proof: RealToolProofEvidence,
  runDir: string,
  path: string,
  content: string,
  existsPath: (path: string) => boolean,
  readText: (path: string) => string,
  references: ShareableEvidencePathReference[],
  findings: CaptureTeachGoalStatusFinding[]
): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    findings.push({ tool: proof.tool, message: `${path} must be valid JSON` });
    return;
  }

  if (!isRecord(parsed)) {
    findings.push({ tool: proof.tool, message: `${path} must contain an object` });
    return;
  }

  if (parsed.substrate !== "real-tool") {
    findings.push({ tool: proof.tool, message: `${path} substrate must be real-tool` });
  }

  if (parsed.tool !== "odoo" && parsed.tool !== "notion") {
    findings.push({ tool: proof.tool, message: `${path} tool must be odoo or notion` });
  }

  if (parsed.tool !== proof.tool) {
    findings.push({ tool: proof.tool, message: `${path} tool must match ${proof.tool}` });
  }

  if (parsed.dataSource !== "clean-seeded-demo-data") {
    findings.push({ tool: proof.tool, message: `${path} dataSource must be clean-seeded-demo-data` });
  }

  if (parsed.rawCapturePolicy !== "unsafe-to-share-local-only-git-ignored") {
    findings.push({ tool: proof.tool, message: `${path} rawCapturePolicy must be unsafe-to-share-local-only-git-ignored` });
  }

  auditEvidencePathField(
    proof.tool,
    path,
    "captureReadinessEvidencePath",
    parsed.captureReadinessEvidencePath,
    `${runDir}/capture-readiness.json`,
    existsPath,
    references,
    findings
  );

  for (const field of [
    "nativeScreenRecordingCaptured",
    "keyboardEventLogCaptured",
    "mouseEventLogCaptured",
    "hardRedactionCompleted",
    "noPrivilegedAccessUsed"
  ] as const) {
    if (parsed[field] !== true) {
      findings.push({ tool: proof.tool, message: `${path} ${field} must be true` });
    }
  }

  auditEvidencePathField(
    proof.tool,
    path,
    "screenRecordingEvidencePath",
    parsed.screenRecordingEvidencePath,
    `${runDir}/eval-recording.mp4`,
    existsPath,
    references,
    findings
  );
  auditEvidencePathField(
    proof.tool,
    path,
    "normalizedCaptureManifestPath",
    parsed.normalizedCaptureManifestPath,
    "captures/normalized/",
    existsPath,
    references,
    findings
  );
  if (typeof parsed.normalizedCaptureManifestPath === "string" && existsPath(parsed.normalizedCaptureManifestPath)) {
    auditNormalizedCaptureManifest(
      proof,
      path,
      parsed.normalizedCaptureManifestPath,
      existsPath,
      readText,
      references,
      findings
    );
  }

  if (!Array.isArray(parsed.redactedFrameEvidencePaths) || parsed.redactedFrameEvidencePaths.length === 0) {
    findings.push({ tool: proof.tool, message: `${path} redactedFrameEvidencePaths must contain at least one redacted frame path` });
  } else {
    parsed.redactedFrameEvidencePaths.forEach((framePath, index) => {
      auditEvidencePathField(
        proof.tool,
        path,
        `redactedFrameEvidencePaths[${index}]`,
        framePath,
        "captures/redacted/",
        existsPath,
        references,
        findings
      );
    });
  }
}

function auditNormalizedCaptureManifest(
  proof: RealToolProofEvidence,
  sourcePath: string,
  manifestPath: string,
  existsPath: (path: string) => boolean,
  readText: (path: string) => string,
  references: ShareableEvidencePathReference[],
  findings: CaptureTeachGoalStatusFinding[]
): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readText(manifestPath));
  } catch {
    findings.push({ tool: proof.tool, message: `${manifestPath} referenced by ${sourcePath} must be valid JSON` });
    return;
  }

  if (!isRecord(parsed)) {
    findings.push({ tool: proof.tool, message: `${manifestPath} referenced by ${sourcePath} must contain an object` });
    return;
  }

  if (parsed.schemaVersion !== 1) {
    findings.push({ tool: proof.tool, message: `${manifestPath} schemaVersion must be 1` });
  }

  if (parsed.tool !== proof.tool) {
    findings.push({ tool: proof.tool, message: `${manifestPath} tool must match ${proof.tool}` });
  }

  if (parsed.rawCapturePolicy !== "unsafe-to-share-local-only") {
    findings.push({ tool: proof.tool, message: `${manifestPath} rawCapturePolicy must be unsafe-to-share-local-only` });
  }

  if (parsed.redactionPolicy !== "hard-secret-redaction-v0") {
    findings.push({ tool: proof.tool, message: `${manifestPath} redactionPolicy must be hard-secret-redaction-v0` });
  }

  if (!isRecord(parsed.rawCaptureSummary)) {
    findings.push({ tool: proof.tool, message: `${manifestPath} rawCaptureSummary must be present` });
  } else {
    for (const field of ["screenRecordingCaptured", "keyboardEventLogCaptured", "mouseEventLogCaptured"] as const) {
      if (parsed.rawCaptureSummary[field] !== true) {
        findings.push({ tool: proof.tool, message: `${manifestPath} rawCaptureSummary.${field} must be true` });
      }
    }
  }

  if (!Array.isArray(parsed.rawArtifacts) || parsed.rawArtifacts.length === 0) {
    findings.push({ tool: proof.tool, message: `${manifestPath} rawArtifacts must contain sanitized raw artifact summaries` });
  } else {
    const artifactKinds = new Set<string>();
    parsed.rawArtifacts.forEach((artifact, index) => {
      if (!isRecord(artifact)) {
        findings.push({ tool: proof.tool, message: `${manifestPath} rawArtifacts[${index}] must be an object` });
        return;
      }

      if (typeof artifact.path === "string") {
        findings.push({ tool: proof.tool, message: `${manifestPath} rawArtifacts[${index}] must not include raw artifact paths` });
      }

      if (typeof artifact.kind === "string") {
        artifactKinds.add(artifact.kind);
      }

      if (artifact.safety !== "unsafe-to-share-local-only") {
        findings.push({ tool: proof.tool, message: `${manifestPath} rawArtifacts[${index}].safety must be unsafe-to-share-local-only` });
      }

      if (artifact.gitPolicy !== "excluded-from-git") {
        findings.push({ tool: proof.tool, message: `${manifestPath} rawArtifacts[${index}].gitPolicy must be excluded-from-git` });
      }
    });

    for (const required of ["screen-recording", "keyboard-event-log", "mouse-event-log"] as const) {
      if (!artifactKinds.has(required)) {
        findings.push({ tool: proof.tool, message: `${manifestPath} rawArtifacts must include ${required}` });
      }
    }
  }

  if (!Array.isArray(parsed.redactedFrames) || parsed.redactedFrames.length === 0) {
    findings.push({ tool: proof.tool, message: `${manifestPath} redactedFrames must contain at least one redacted frame` });
  } else {
    parsed.redactedFrames.forEach((frame, index) => {
      if (!isRecord(frame)) {
        findings.push({ tool: proof.tool, message: `${manifestPath} redactedFrames[${index}] must be an object` });
        return;
      }

      auditEvidencePathField(
        proof.tool,
        manifestPath,
        `redactedFrames[${index}].path`,
        frame.path,
        "captures/redacted/",
        existsPath,
        references,
        findings
      );
    });
  }

  if (!Array.isArray(parsed.inputEvidence) || parsed.inputEvidence.length === 0) {
    findings.push({ tool: proof.tool, message: `${manifestPath} inputEvidence must contain per-step input evidence` });
  }
}

function auditCaptureReadinessEvidence(
  proof: RealToolProofEvidence,
  path: string,
  content: string,
  findings: CaptureTeachGoalStatusFinding[]
): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    findings.push({ tool: proof.tool, message: `${path} must be valid JSON` });
    return;
  }

  if (!isRecord(parsed)) {
    findings.push({ tool: proof.tool, message: `${path} must contain an object` });
    return;
  }

  if (parsed.substrate !== "real-tool") {
    findings.push({ tool: proof.tool, message: `${path} substrate must be real-tool` });
  }

  if (parsed.tool !== "odoo" && parsed.tool !== "notion") {
    findings.push({ tool: proof.tool, message: `${path} tool must be odoo or notion` });
  }

  if (parsed.tool !== proof.tool) {
    findings.push({ tool: proof.tool, message: `${path} tool must match ${proof.tool}` });
  }

  if (parsed.adapterKind !== "native") {
    findings.push({ tool: proof.tool, message: `${path} adapterKind must be native` });
  }

  if (parsed.platform !== "macos" && parsed.platform !== "windows") {
    findings.push({ tool: proof.tool, message: `${path} platform must be macos or windows` });
  }

  for (const field of [
    "docsVerified",
    "screenRecording",
    "keyboardEventLog",
    "mouseEventLog",
    "redactedFrameOutput",
    "rawArtifactsIgnored"
  ] as const) {
    if (parsed[field] !== true) {
      findings.push({ tool: proof.tool, message: `${path} ${field} must be true` });
    }
  }

  if (!Array.isArray(parsed.blockers) || parsed.blockers.length !== 0) {
    findings.push({ tool: proof.tool, message: `${path} blockers must be empty` });
  }
}

function auditRealStepTrace(
  proof: RealToolProofEvidence,
  runDir: string,
  path: string,
  content: string,
  existsPath: (path: string) => boolean,
  references: ShareableEvidencePathReference[],
  findings: CaptureTeachGoalStatusFinding[]
): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    findings.push({ tool: proof.tool, message: `${path} must be valid JSON` });
    return;
  }

  if (!Array.isArray(parsed)) {
    findings.push({ tool: proof.tool, message: `${path} must contain a step trace array` });
    return;
  }

  if (parsed.length === 0) {
    findings.push({ tool: proof.tool, message: `${path} must contain at least one taught step` });
    return;
  }

  parsed.forEach((entry, index) => {
    const stepLabel = traceStepLabel(entry, index);
    if (!isRecord(entry)) {
      findings.push({ tool: proof.tool, message: `${path} ${stepLabel} must be an object` });
      return;
    }

    if (typeof entry.stepId !== "string" || entry.stepId.length === 0) {
      findings.push({ tool: proof.tool, message: `${path} ${stepLabel} stepId must be a non-empty string` });
    }

    if (entry.success !== true) {
      findings.push({ tool: proof.tool, message: `${path} ${stepLabel} must be successful` });
    }

    if (entry.overlayKind !== "instruction") {
      findings.push({ tool: proof.tool, message: `${path} ${stepLabel} overlayKind must be instruction` });
    }

    if (typeof entry.overlayMessage !== "string" || entry.overlayMessage.length === 0) {
      findings.push({ tool: proof.tool, message: `${path} ${stepLabel} overlayMessage must be a non-empty flow-grounded instruction` });
    }

    if (typeof entry.overlayConfidence !== "number" || entry.overlayConfidence < 0.75) {
      findings.push({ tool: proof.tool, message: `${path} ${stepLabel} overlayConfidence must be at least 0.75` });
    }

    if (typeof entry.highlightedAnchorId !== "string" || entry.highlightedAnchorId.length === 0) {
      findings.push({ tool: proof.tool, message: `${path} ${stepLabel} highlightedAnchorId must be present` });
    }

    if (!isRecord(entry.actionPrimitive) || entry.actionPrimitive.manualOnly !== true) {
      findings.push({ tool: proof.tool, message: `${path} ${stepLabel} actionPrimitive.manualOnly must be true` });
    }

    auditEvidencePathField(
      proof.tool,
      path,
      `${stepLabel} currentFrame`,
      entry.currentFrame,
      `${runDir}/`,
      existsPath,
      references,
      findings
    );
  });
}

function auditFlowEvidence(
  proof: RealToolProofEvidence,
  runDir: string,
  path: string,
  content: string,
  existsPath: (path: string) => boolean,
  readText: (path: string) => string,
  references: ShareableEvidencePathReference[],
  findings: CaptureTeachGoalStatusFinding[]
): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    findings.push({ tool: proof.tool, message: `${path} must be valid JSON` });
    return;
  }

  if (!isRecord(parsed)) {
    findings.push({ tool: proof.tool, message: `${path} must contain an object` });
    return;
  }

  if (parsed.substrate !== "real-tool") {
    findings.push({ tool: proof.tool, message: `${path} substrate must be real-tool` });
  }

  if (parsed.tool !== proof.tool) {
    findings.push({ tool: proof.tool, message: `${path} tool must match ${proof.tool}` });
  }

  auditEvidencePathField(proof.tool, path, "flowPath", parsed.flowPath, "flows/", existsPath, references, findings);

  if (typeof parsed.flowPath !== "string" || !existsPath(parsed.flowPath)) {
    return;
  }

  const validation = validateFlowMarkdown(readText(parsed.flowPath));
  if (!validation.valid || !validation.document) {
    findings.push({ tool: proof.tool, message: `${parsed.flowPath} referenced by ${path} must be a valid flow.md` });
    return;
  }

  const flow = validation.document;
  if (flow.frontmatter.tool !== proof.tool) {
    findings.push({ tool: proof.tool, message: `${parsed.flowPath} tool must match ${proof.tool}` });
  }

  if (typeof parsed.flowId !== "string" || parsed.flowId !== flow.frontmatter["flow-id"]) {
    findings.push({ tool: proof.tool, message: `${path} flowId must match ${String(flow.frontmatter["flow-id"])}` });
  }

  if (typeof parsed.terminalBusinessState !== "string" || parsed.terminalBusinessState !== flow.frontmatter["terminal-business-state"]) {
    findings.push({
      tool: proof.tool,
      message: `${path} terminalBusinessState must match ${String(flow.frontmatter["terminal-business-state"])}`
    });
  }

  const flowStepIds = flow.steps.map((step) => step["step-id"]);
  if (!arrayEquals(parsed.stepIds, flowStepIds)) {
    findings.push({ tool: proof.tool, message: `${path} stepIds must match the referenced flow step ids` });
  }

  auditStepTraceGrounding(proof, runDir, path, flow, readText, findings);
}

function auditStepTraceGrounding(
  proof: RealToolProofEvidence,
  runDir: string,
  flowEvidencePath: string,
  flow: FlowDocument,
  readText: (path: string) => string,
  findings: CaptureTeachGoalStatusFinding[]
): void {
  const stepTracePath = `${runDir}/step-trace.json`;
  let parsedTrace: unknown;
  try {
    parsedTrace = JSON.parse(readText(stepTracePath));
  } catch {
    findings.push({ tool: proof.tool, message: `${stepTracePath} must be valid JSON for flow grounding` });
    return;
  }

  if (!Array.isArray(parsedTrace)) {
    findings.push({ tool: proof.tool, message: `${stepTracePath} must contain an array for flow grounding` });
    return;
  }

  if (parsedTrace.length !== flow.steps.length) {
    findings.push({ tool: proof.tool, message: `${stepTracePath} must contain exactly the referenced flow steps` });
  }

  flow.steps.forEach((step, index) => {
    const entry = parsedTrace[index];
    const stepLabel = step["step-id"];
    if (!isRecord(entry)) {
      findings.push({ tool: proof.tool, message: `${stepTracePath} ${stepLabel} must be present for flow grounding` });
      return;
    }

    if (entry.stepId !== step["step-id"]) {
      findings.push({ tool: proof.tool, message: `${stepTracePath} ${stepLabel} stepId must match ${step["step-id"]}` });
    }

    if (entry.overlayMessage !== step.instruction.text) {
      findings.push({ tool: proof.tool, message: `${stepTracePath} ${stepLabel} overlayMessage must be grounded in ${flowEvidencePath}` });
    }

    if (entry.highlightedAnchorId !== step.instruction["highlight-anchor-id"]) {
      findings.push({ tool: proof.tool, message: `${stepTracePath} ${stepLabel} highlightedAnchorId must match flow highlight anchor` });
    }

    if (!isRecord(entry.actionPrimitive)) {
      findings.push({ tool: proof.tool, message: `${stepTracePath} ${stepLabel} actionPrimitive must be present for flow grounding` });
      return;
    }

    if (entry.actionPrimitive.kind !== step["user-action"].kind) {
      findings.push({ tool: proof.tool, message: `${stepTracePath} ${stepLabel} action kind must match flow user action` });
    }

    if (entry.actionPrimitive.targetAnchorId !== step["user-action"]["target-anchor-id"]) {
      findings.push({ tool: proof.tool, message: `${stepTracePath} ${stepLabel} action target anchor must match flow user action` });
    }

    if (entry.actionPrimitive.manualOnly !== true || step["user-action"]["manual-only"] !== true) {
      findings.push({ tool: proof.tool, message: `${stepTracePath} ${stepLabel} action must remain manual-only` });
    }
  });
}

function auditReviewerChecklist(
  proof: RealToolProofEvidence,
  path: string,
  content: string,
  findings: CaptureTeachGoalStatusFinding[]
): void {
  if (!content.includes("- accepted: true")) {
    findings.push({ tool: proof.tool, message: `${path} reviewer checklist must contain accepted: true` });
  }

  if (content.includes("- rejected: true")) {
    findings.push({ tool: proof.tool, message: `${path} reviewer checklist must not contain rejected: true` });
  }
}

function auditReviewerStepSignoff(
  proof: RealToolProofEvidence,
  checklistPath: string,
  checklistContent: string,
  stepTracePath: string,
  stepTraceContent: string,
  findings: CaptureTeachGoalStatusFinding[]
): void {
  let parsedTrace: unknown;
  try {
    parsedTrace = JSON.parse(stepTraceContent);
  } catch {
    findings.push({ tool: proof.tool, message: `${stepTracePath} must be valid JSON for reviewer step signoff` });
    return;
  }

  if (!Array.isArray(parsedTrace)) {
    findings.push({ tool: proof.tool, message: `${stepTracePath} must contain an array for reviewer step signoff` });
    return;
  }

  const acceptedLines = new Set(checklistContent.split(/\r?\n/).map((line) => line.trim()));
  for (const entry of parsedTrace) {
    if (!isRecord(entry) || typeof entry.stepId !== "string" || entry.stepId.length === 0) {
      continue;
    }

    const requiredLine = `- ${entry.stepId}: accepted`;
    if (!acceptedLines.has(requiredLine)) {
      findings.push({ tool: proof.tool, message: `${checklistPath} reviewer checklist must contain per-step signoff ${requiredLine}` });
    }
  }
}

function auditOutcomeEvidence(
  proof: RealToolProofEvidence,
  runDir: string,
  path: string,
  content: string,
  existsPath: (path: string) => boolean,
  references: ShareableEvidencePathReference[],
  findings: CaptureTeachGoalStatusFinding[]
): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    findings.push({ tool: proof.tool, message: `${path} must be valid JSON` });
    return;
  }

  if (!isRecord(parsed)) {
    findings.push({ tool: proof.tool, message: `${path} must contain an object` });
    return;
  }

  if (parsed.substrate !== "real-tool") {
    findings.push({ tool: proof.tool, message: `${path} substrate must be real-tool` });
  }

  if (parsed.tool !== "odoo" && parsed.tool !== "notion") {
    findings.push({ tool: proof.tool, message: `${path} tool must be odoo or notion` });
  }

  if (parsed.tool !== proof.tool) {
    findings.push({ tool: proof.tool, message: `${path} tool must match ${proof.tool}` });
  }

  for (const field of [
    "terminalBusinessStateReached",
    "zeroHumanHelp",
    "noInventedSteps",
    "noPrivilegedAccess",
    "heldOutFromCapture",
    "seniorReviewerSignoff"
  ] as const) {
    if (parsed[field] !== true) {
      findings.push({ tool: proof.tool, message: `${path} ${field} must be true` });
    }
  }

  for (const field of ["belowThresholdEvents", "humanHelpIncidents", "inventedStepIncidents"] as const) {
    if (parsed[field] !== 0) {
      findings.push({ tool: proof.tool, message: `${path} ${field} must be 0` });
    }
  }

  if (parsed.completionRate !== 1) {
    findings.push({ tool: proof.tool, message: `${path} completionRate must be 1` });
  }

  if (typeof parsed.stepCount !== "number" || parsed.stepCount <= 0) {
    findings.push({ tool: proof.tool, message: `${path} stepCount must be greater than 0` });
  }

  if (typeof parsed.stepsCompleted !== "number" || parsed.stepsCompleted !== parsed.stepCount) {
    findings.push({ tool: proof.tool, message: `${path} stepsCompleted must equal stepCount` });
  }

  if (!Array.isArray(parsed.terminalMissingVisibleText) || parsed.terminalMissingVisibleText.length !== 0) {
    findings.push({ tool: proof.tool, message: `${path} terminalMissingVisibleText must be empty` });
  }

  if (!Array.isArray(parsed.privilegedAccessViolations) || parsed.privilegedAccessViolations.length !== 0) {
    findings.push({ tool: proof.tool, message: `${path} privilegedAccessViolations must be empty` });
  }

  if (!Array.isArray(parsed.overlayMisreads) || parsed.overlayMisreads.length !== 0) {
    findings.push({ tool: proof.tool, message: `${path} overlayMisreads must be empty` });
  }

  auditEvidencePathField(
    proof.tool,
    path,
    "finalScreenEvidencePath",
    parsed.finalScreenEvidencePath,
    `${runDir}/final-screen.png`,
    existsPath,
    references,
    findings
  );
  auditEvidencePathField(
    proof.tool,
    path,
    "stepTraceEvidencePath",
    parsed.stepTraceEvidencePath,
    `${runDir}/step-trace.json`,
    existsPath,
    references,
    findings
  );
}

function traceStepLabel(entry: unknown, index: number): string {
  if (isRecord(entry) && typeof entry.stepId === "string" && entry.stepId.length > 0) {
    return entry.stepId;
  }

  return `step-${index + 1}`;
}

function auditEvidencePathField(
  tool: string,
  sourcePath: string,
  field: string,
  value: unknown,
  expectedPrefixOrExactPath: string,
  existsPath: (path: string) => boolean,
  references: ShareableEvidencePathReference[],
  findings: CaptureTeachGoalStatusFinding[]
): void {
  if (typeof value !== "string" || value.length === 0) {
    findings.push({ tool, message: `${sourcePath} ${field} must be a non-empty string` });
    return;
  }

  references.push({ tool, label: field, path: value });

  if (isAbsolutePath(value) || value.includes("..")) {
    findings.push({ tool, message: `${sourcePath} ${field} must be project-relative and must not traverse directories` });
  }

  if (isUnsafeEvidencePath(value)) {
    findings.push({ tool, message: `${sourcePath} ${field} points to unsafe capture evidence` });
  }

  const matchesExpected =
    expectedPrefixOrExactPath.endsWith("/") ? value.startsWith(expectedPrefixOrExactPath) : value === expectedPrefixOrExactPath;
  if (!matchesExpected) {
    findings.push({ tool, message: `${sourcePath} ${field} must point to ${expectedPrefixOrExactPath}` });
  }

  if (!isAllowedShareableEvidencePath(value)) {
    findings.push({ tool, message: `${sourcePath} ${field} is outside allowed shareable evidence locations` });
  }

  if (!existsPath(value)) {
    findings.push({ tool, message: `${value} referenced by ${sourcePath} ${field} is missing on disk` });
  }
}

function getRealToolRunDir(proof: RealToolProofEvidence): string | null {
  const expectedPrefix = `evals/runs/${proof.tool}/`;
  if (!proof.evidencePath.startsWith(expectedPrefix) || !proof.evidencePath.endsWith("/step-trace.json")) {
    return null;
  }

  return proof.evidencePath.slice(0, -"/step-trace.json".length);
}

function artifactAuditResult(
  runDir: string | null,
  references: readonly ShareableEvidencePathReference[],
  findings: readonly CaptureTeachGoalStatusFinding[],
  requiredArtifacts: number
): RealToolRunArtifactAuditResult {
  return {
    passed: findings.length === 0,
    runDir,
    references,
    findings,
    summary: {
      requiredArtifacts,
      missingArtifacts: findings.filter((finding) => finding.message.includes("missing")).length,
      invalidArtifacts: findings.filter((finding) => !finding.message.includes("missing")).length
    }
  };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function arrayEquals(input: unknown, expected: readonly string[]): boolean {
  return Array.isArray(input) && input.length === expected.length && input.every((value, index) => value === expected[index]);
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
