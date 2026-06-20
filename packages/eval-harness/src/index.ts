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
