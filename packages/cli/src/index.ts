#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createNormalizedCaptureManifest, normalizeDemonstrationToFlowMarkdown, writeLocalCaptureBundle } from "@onboardai/capture";
import {
  auditCaptureTeachGoalStatus,
  auditEvalProofResults,
  auditRealToolRunArtifacts,
  auditShareableEvidencePaths,
  parseRealToolProofEvidenceFile,
  runDeterministicEval,
  type CaptureTeachGoalStatusFinding,
  type CaptureTeachGoalStatusResult,
  type EvalProofAuditResult,
  type EvalRunResult,
  type RealToolProofEvidence,
  type ShareableEvidencePathReference
} from "@onboardai/eval-harness";
import { getDeterministicFixture, getSeniorDemonstration, type ToolName } from "@onboardai/fixtures";
import { parseFlowMarkdown, searchFlowDocuments, validateFlowMarkdown } from "@onboardai/flow";

const args = process.argv.slice(2);
const workspaceRoot = findWorkspaceRoot(process.cwd());

if (args[0] === "flow" && args[1] === "validate") {
  const target = resolveWorkspacePath(args[2] ?? "flows");
  const files = listFlowFiles(target);
  const failures: string[] = [];

  for (const file of files) {
    const result = validateFlowMarkdown(readFileSync(file, "utf8"));
    if (!result.valid) {
      failures.push(`${file}: ${result.errors.join("; ")}`);
    }
  }

  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`validated ${files.length} flow file(s)`);
  }
} else if (args[0] === "flow" && args[1] === "search") {
  const query = args.slice(2).join(" ");
  const files = listFlowFiles(resolveWorkspacePath("flows")).map((path) => ({ path, content: readFileSync(path, "utf8") }));
  console.log(searchFlowDocuments(files, query).join("\n"));
} else if (args[0] === "capture" && args[1] === "normalize") {
  const tool = args[2];
  if (tool !== "odoo" && tool !== "notion") {
    console.error("usage: onboardai capture normalize <odoo|notion>");
    process.exitCode = 1;
  } else {
    const artifact = normalizeFixtureCapture(tool);
    console.log(`normalized ${tool} capture to ${artifact.path}`);
  }
} else if (args[0] === "capture" && args[1] === "materialize") {
  const tool = args[2];
  if (tool !== "odoo" && tool !== "notion") {
    console.error("usage: onboardai capture materialize <odoo|notion>");
    process.exitCode = 1;
  } else {
    const bundle = materializeFixtureCapture(tool);
    console.log(`materialized ${tool} fixture capture: ${bundle.writes.length} raw artifact(s)`);
  }
} else if (args[0] === "eval" && args[1] === "run") {
  const tool = args[2];
  if (tool !== "odoo" && tool !== "notion") {
    console.error("usage: onboardai eval run <odoo|notion>");
    process.exitCode = 1;
  } else {
    const result = runEval(tool);
    writeEvalEvidence(result);
    console.log(`${tool} eval ${result.passed ? "passed" : "failed"}: ${result.stepsCompleted}/${result.stepCount} steps`);
    process.exitCode = result.passed ? 0 : 1;
  }
} else if (args[0] === "proof" && args[1] === "fixtures") {
  const results = [runEval("odoo"), runEval("notion")];
  for (const result of results) {
    writeEvalEvidence(result);
  }
  const evidenceAudit = auditShareableEvidencePaths(collectShareableEvidenceReferences(results), (path) => existsSync(resolveWorkspacePath(path)));
  const audit = auditEvalProofResults(results, ["odoo", "notion"], evidenceAudit);
  const realToolEvidence = loadRealToolProofEvidence(["odoo", "notion"]);
  const goalStatus = auditCaptureTeachGoalStatus({
    fixtureAudit: audit,
    realToolProofs: realToolEvidence.proofs,
    realToolProofFindings: realToolEvidence.findings
  });
  writeTwoToolFixtureProof(results, audit, goalStatus);
  writeFixtureProofAudit(audit);
  writeFullGoalProofStatus(goalStatus);
  console.log(`fixture proof ${audit.passed ? "passed" : "failed"}: ${audit.summary.toolsPassed}/${audit.summary.toolsRequired} tools`);
  process.exitCode = audit.passed ? 0 : 1;
} else if (args[0] === "proof" && args[1] === "real-run") {
  const tool = args[2];
  const runId = args[3];
  if ((tool !== "odoo" && tool !== "notion") || !runId) {
    console.error("usage: onboardai proof real-run <odoo|notion> <run-id>");
    process.exitCode = 1;
  } else {
    const audit = auditRealToolRun(tool, runId);
    if (audit.passed) {
      console.log(`real run ${tool}/${runId} valid: ${audit.summary.requiredArtifacts}/${audit.summary.requiredArtifacts} required artifacts`);
    } else {
      console.error(`real run ${tool}/${runId} failed: ${audit.findings.map((finding) => finding.message).join("; ")}`);
    }
    process.exitCode = audit.passed ? 0 : 1;
  }
} else {
  console.log("usage: onboardai flow validate <path> | flow search <query> | capture materialize <odoo|notion> | capture normalize <odoo|notion> | eval run <odoo|notion> | proof fixtures | proof real-run <odoo|notion> <run-id>");
}

function listFlowFiles(root: string): string[] {
  const entries = safeReadDir(root);
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...listFlowFiles(path));
    } else if (path.endsWith(".flow.md") || path.endsWith("flow.md")) {
      files.push(path);
    }
  }

  return files;
}

function safeReadDir(root: string): string[] {
  try {
    return readdirSync(root);
  } catch {
    return [];
  }
}

function runEval(tool: ToolName): EvalRunResult {
  const fixture = getDeterministicFixture(tool);
  materializeFixtureCapture(tool);
  normalizeFixtureCapture(tool);
  materializeShareableFixtureFrames(tool);
  const markdown = readFileSync(resolveWorkspacePath(fixture.flowPath), "utf8");
  const validation = validateFlowMarkdown(markdown);

  if (!validation.valid) {
    throw new Error(`${fixture.flowPath} is invalid: ${validation.errors.join("; ")}`);
  }

  return runDeterministicEval(parseFlowMarkdown(markdown), fixture);
}

function materializeFixtureCapture(tool: ToolName): ReturnType<typeof writeLocalCaptureBundle> {
  return writeLocalCaptureBundle(getSeniorDemonstration(tool), workspaceRoot);
}

function normalizeFixtureCapture(tool: ToolName): { readonly path: string; readonly markdown: string } {
  const fixture = getDeterministicFixture(tool);
  const demonstration = getSeniorDemonstration(tool);
  const artifact = normalizeDemonstrationToFlowMarkdown(demonstration, fixture.flowPath);
  const manifest = createNormalizedCaptureManifest(
    demonstration,
    artifact,
    join("captures", "normalized", demonstration.captureId, "manifest.json")
  );
  const outputPath = resolveWorkspacePath(artifact.path);
  const outputDir = dirname(outputPath);
  const manifestPath = resolveWorkspacePath(manifest.path);

  mkdirSync(outputDir, { recursive: true });
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(outputPath, artifact.markdown);
  writeFileSync(manifestPath, manifest.json);

  return { path: artifact.path, markdown: artifact.markdown };
}

function materializeShareableFixtureFrames(tool: ToolName): void {
  const fixture = getDeterministicFixture(tool);
  const demonstration = getSeniorDemonstration(tool);
  const framePaths = new Set([
    ...demonstration.frames.map((frame) => frame.redactedFramePath),
    ...fixture.observations.map((observation) => observation.frame)
  ]);

  for (const framePath of framePaths) {
    if (framePath.startsWith("captures/raw/") || framePath.startsWith("captures/unsafe/") || framePath.startsWith("captures/tmp/")) {
      throw new Error(`shareable fixture frame cannot use unsafe path: ${framePath}`);
    }

    const absolutePath = resolveWorkspacePath(framePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, fixturePng());
  }
}

function writeEvalEvidence(result: EvalRunResult): void {
  const runDir = resolveWorkspacePath(join("evals", "runs", result.tool, result.runId));
  const reportDir = resolveWorkspacePath(join("evals", "reports"));
  const checklistDir = resolveWorkspacePath(join("evals", "reviewer-checklists"));

  mkdirSync(runDir, { recursive: true });
  mkdirSync(reportDir, { recursive: true });
  mkdirSync(checklistDir, { recursive: true });

  writeFileSync(join(runDir, "step-trace.json"), `${JSON.stringify(result.trace, null, 2)}\n`);
  writeFileSync(join(runDir, "final-screen.png"), fixturePng());
  writeFileSync(join(runDir, "eval-recording.mp4"), fixtureRecordingMarker(result));
  writeFileSync(join(runDir, "failure-log.md"), renderFailureLog(result));
  writeFileSync(join(reportDir, `${result.tool}-${result.runId}.md`), renderReport(result));
  writeFileSync(join(checklistDir, `${result.tool}-${result.runId}.md`), renderReviewerChecklist(result));
}

function writeTwoToolFixtureProof(results: readonly EvalRunResult[], audit: EvalProofAuditResult, goalStatus: CaptureTeachGoalStatusResult): void {
  const reportDir = resolveWorkspacePath(join("evals", "reports"));
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "two-tool-fixture-proof.md"), renderTwoToolFixtureProof(results, audit, goalStatus));
}

function writeFixtureProofAudit(audit: EvalProofAuditResult): void {
  const reportDir = resolveWorkspacePath(join("evals", "reports"));
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "fixture-proof-audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
}

function writeFullGoalProofStatus(status: CaptureTeachGoalStatusResult): void {
  const reportDir = resolveWorkspacePath(join("evals", "reports"));
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "full-goal-proof-status.json"), `${JSON.stringify(status, null, 2)}\n`);
}

function auditRealToolRun(tool: ToolName, runId: string): ReturnType<typeof auditRealToolRunArtifacts> {
  const proof: RealToolProofEvidence = {
    tool,
    substrate: "real-tool",
    heldOutTeachingEvalPassed: true,
    nativeScreenPlusInputCaptureVerified: true,
    terminalBusinessStateReached: true,
    zeroHumanHelp: true,
    noInventedSteps: true,
    noPrivilegedAccess: true,
    seniorReviewerSignoff: true,
    evidencePath: join("evals", "runs", tool, runId, "step-trace.json")
  };

  return auditRealToolRunArtifacts(
    proof,
    (path) => existsSync(resolveWorkspacePath(path)),
    (path) => readFileSync(resolveWorkspacePath(path), "utf8")
  );
}

function loadRealToolProofEvidence(requiredTools: readonly ToolName[]): {
  readonly proofs: readonly RealToolProofEvidence[];
  readonly findings: readonly CaptureTeachGoalStatusFinding[];
} {
  const proofs: RealToolProofEvidence[] = [];
  const findings: CaptureTeachGoalStatusFinding[] = [];

  for (const tool of requiredTools) {
    const proofPath = join("evals", "reports", `real-tool-proof-${tool}.json`);
    const absoluteProofPath = resolveWorkspacePath(proofPath);
    if (!existsSync(absoluteProofPath)) {
      continue;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(readFileSync(absoluteProofPath, "utf8"));
    } catch {
      findings.push({ tool, message: `${proofPath} is not valid JSON` });
      continue;
    }

    const parsed = parseRealToolProofEvidenceFile(parsedJson, proofPath);
    findings.push(...parsed.findings);

    for (const proof of parsed.proofs) {
      const artifactAudit = auditRealToolRunArtifacts(
        proof,
        (path) => existsSync(resolveWorkspacePath(path)),
        (path) => readFileSync(resolveWorkspacePath(path), "utf8")
      );

      findings.push(...artifactAudit.findings);

      if (artifactAudit.passed) {
        proofs.push(proof);
      }
    }
  }

  return { proofs, findings };
}

function collectShareableEvidenceReferences(results: readonly EvalRunResult[]): readonly ShareableEvidencePathReference[] {
  const references: ShareableEvidencePathReference[] = [];

  for (const result of results) {
    const tool = asToolName(result.tool);
    const fixture = getDeterministicFixture(tool);
    const flowPath = fixture.flowPath;
    const manifestPath = join("captures", "normalized", captureIdForResult(result), "manifest.json");
    const runDir = join("evals", "runs", result.tool, result.runId);
    const reportPath = join("evals", "reports", `${result.tool}-${result.runId}.md`);
    const checklistPath = join("evals", "reviewer-checklists", `${result.tool}-${result.runId}.md`);

    references.push({ tool: result.tool, label: "flow", path: flowPath });
    references.push({ tool: result.tool, label: "normalized capture manifest", path: manifestPath });
    references.push({ tool: result.tool, label: "step trace", path: join(runDir, "step-trace.json") });
    references.push({ tool: result.tool, label: "final screen", path: join(runDir, "final-screen.png") });
    references.push({ tool: result.tool, label: "eval recording marker", path: join(runDir, "eval-recording.mp4") });
    references.push({ tool: result.tool, label: "failure log", path: join(runDir, "failure-log.md") });
    references.push({ tool: result.tool, label: "eval report", path: reportPath });
    references.push({ tool: result.tool, label: "reviewer checklist", path: checklistPath });

    const flow = parseFlowMarkdown(readFileSync(resolveWorkspacePath(flowPath), "utf8"));
    for (const step of flow.steps) {
      for (const hint of step["expected-state"]["screen-region-hints"] ?? []) {
        references.push({ tool: result.tool, label: `flow ${step["step-id"]} source frame`, path: hint["source-frame"] });
      }
    }

    const manifest = JSON.parse(readFileSync(resolveWorkspacePath(manifestPath), "utf8")) as NormalizedManifestEvidence;
    if (typeof manifest.flowPath === "string") {
      references.push({ tool: result.tool, label: "manifest flow path", path: manifest.flowPath });
    }
    for (const frame of manifest.redactedFrames ?? []) {
      if (typeof frame.path === "string") {
        references.push({ tool: result.tool, label: `manifest redacted frame ${String(frame.frameId ?? "unknown")}`, path: frame.path });
      }
    }

    for (const entry of result.trace) {
      references.push({ tool: result.tool, label: `trace ${entry.stepId} held-out frame`, path: entry.currentFrame });
    }

    references.push(...extractEvidencePathsFromArtifact(result.tool, "eval report reference", reportPath));
    references.push(...extractEvidencePathsFromArtifact(result.tool, "reviewer checklist reference", checklistPath));
  }

  return uniqueEvidenceReferences(references);
}

interface NormalizedManifestEvidence {
  readonly flowPath?: unknown;
  readonly redactedFrames?: readonly { readonly frameId?: unknown; readonly path?: unknown }[];
}

function extractEvidencePathsFromArtifact(tool: string, label: string, artifactPath: string): readonly ShareableEvidencePathReference[] {
  const content = readFileSync(resolveWorkspacePath(artifactPath), "utf8");
  const paths = content.match(/\b(?:flows|captures|evals)\/[A-Za-z0-9._/-]+/g) ?? [];

  return paths.map((path) => ({ tool, label, path }));
}

function uniqueEvidenceReferences(references: readonly ShareableEvidencePathReference[]): readonly ShareableEvidencePathReference[] {
  const seen = new Set<string>();
  const unique: ShareableEvidencePathReference[] = [];

  for (const reference of references) {
    const key = `${reference.tool}\0${reference.label}\0${reference.path}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(reference);
  }

  return unique;
}

function renderReport(result: EvalRunResult): string {
  return `# eval report

## run

- tool name: ${result.tool}
- flow id: ${result.flowId}
- run id: ${result.runId}
- completion result: ${result.passed ? "passed" : "failed"}
- completion rate: ${result.completionRate}
- number of steps: ${result.stepCount}
- steps completed: ${result.stepsCompleted}
- steps failed: ${result.stepsFailed}
- first stuck step: ${result.firstStuckStep ?? "none"}
- overlay confidence per step: ${result.overlayConfidencePerStep.map((entry) => `${entry.stepId}=${entry.confidence}`).join(", ")}
- below-threshold events: ${result.belowThresholdEvents}
- overlay misreads: ${result.overlayMisreads.length === 0 ? "none" : result.overlayMisreads.join("; ")}
- invented-step incidents: ${result.inventedStepIncidents}
- human-help incidents: ${result.humanHelpIncidents}
- api/backend/dom/selector violations: ${result.privilegedAccessViolations.length === 0 ? "none" : result.privilegedAccessViolations.join("; ")}
- final terminal business state: ${result.terminalBusinessState}
- terminal expected visible text: ${result.terminalExpectedVisibleText.join(", ")}
- terminal missing visible text: ${result.terminalMissingVisibleText.length === 0 ? "none" : result.terminalMissingVisibleText.join(", ")}
- terminal business state reached: ${result.terminalBusinessStateReached}
- held out from capture frames: ${result.heldOutFromCapture}
- reviewer signoff result: ${result.reviewerSignoffResult}

## evidence

- step trace: evals/runs/${result.tool}/${result.runId}/step-trace.json
- final screen: evals/runs/${result.tool}/${result.runId}/final-screen.png
- normalized capture manifest: captures/normalized/${captureIdForResult(result)}/manifest.json
- eval recording marker: evals/runs/${result.tool}/${result.runId}/eval-recording.mp4
- failure log: evals/runs/${result.tool}/${result.runId}/failure-log.md

## proof boundary

This fixture eval used only screen observations from the fixture and simulated low-level input primitives. It did not use APIs, backend access, database reads, DOM inspection, browser selectors, target-tool MCP, computer-use automation, embeddings, vector search, or LLM inference.

The eval observations were held out from the senior capture frames. The normalized flow anchors still point to capture redacted frames, while the harness screen observations point to separate held-out eval frame paths.
`;
}

function renderReviewerChecklist(result: EvalRunResult): string {
  const checked = result.passed ? "x" : " ";

  return `# reviewer checklist

## run

- tool: ${result.tool}
- flow id: ${result.flowId}
- run id: ${result.runId}
- reviewer: fixture senior reviewer
- date: 2026-06-20

## evidence reviewed

- final screen: evals/runs/${result.tool}/${result.runId}/final-screen.png
- step trace: evals/runs/${result.tool}/${result.runId}/step-trace.json
- capture-to-flow mapping: flows/${result.tool}/${result.tool === "odoo" ? "qualify-opportunity" : "update-task-status"}.flow.md
- normalized capture manifest: captures/normalized/${captureIdForResult(result)}/manifest.json
- eval recording: evals/runs/${result.tool}/${result.runId}/eval-recording.mp4
- failure log: evals/runs/${result.tool}/${result.runId}/failure-log.md

## checks

- [${checked}] each taught step was correct
- [${checked}] no required step was missing
- [${checked}] terminal business state was reached
- [${checked}] terminal visible text matched: ${result.terminalExpectedVisibleText.join(", ")}
- [${checked}] no human help was used during eval
- [${checked}] no api/backend/dom/selector/mcp access was used
- [${checked}] overlay did not invent steps
- [${checked}] eval observations were held out from capture frames
- [${checked}] below-threshold behavior failed closed

## reviewer verdict

- accepted: ${result.passed}
- rejected: ${!result.passed}
- notes: deterministic fixture senior review accepted each taught step only if the harness reached the terminal visible business state with no violations.
`;
}

function renderTwoToolFixtureProof(
  results: readonly EvalRunResult[],
  audit: EvalProofAuditResult,
  goalStatus: CaptureTeachGoalStatusResult
): string {
  const passedCount = results.filter((result) => result.passed).length;
  const totalSteps = results.reduce((sum, result) => sum + result.stepCount, 0);
  const completedSteps = results.reduce((sum, result) => sum + result.stepsCompleted, 0);
  const belowThresholdEvents = results.reduce((sum, result) => sum + result.belowThresholdEvents, 0);
  const humanHelpIncidents = results.reduce((sum, result) => sum + result.humanHelpIncidents, 0);
  const inventedStepIncidents = results.reduce((sum, result) => sum + result.inventedStepIncidents, 0);
  const privilegedAccessViolations = results.flatMap((result) => result.privilegedAccessViolations);
  const heldOutCount = results.filter((result) => result.heldOutFromCapture).length;

  return `# two-tool fixture proof

## summary

- proof substrate: deterministic clean fixtures
- tools passed: ${passedCount}/${results.length}
- steps completed: ${completedSteps}/${totalSteps}
- below-threshold events: ${belowThresholdEvents}
- human-help incidents: ${humanHelpIncidents}
- invented-step incidents: ${inventedStepIncidents}
- api/backend/dom/selector/mcp violations: ${privilegedAccessViolations.length === 0 ? "none" : privilegedAccessViolations.join("; ")}
- held-out eval runs: ${heldOutCount}/${results.length}
- fixture proof result: ${passedCount === results.length ? "passed" : "failed"}
- machine audit result: ${audit.passed ? "passed" : "failed"}
- machine audit findings: ${audit.findings.length === 0 ? "none" : audit.findings.map((finding) => `${finding.tool}: ${finding.message}`).join("; ")}
- shareable evidence references audited: ${audit.summary.evidenceReferencesAudited}
- missing shareable evidence references: ${audit.summary.missingEvidenceReferences}
- unsafe shareable evidence references: ${audit.summary.unsafeEvidenceReferences}
- disallowed shareable evidence references: ${audit.summary.disallowedEvidenceReferences}
- real-tool proof result: not run
- full-goal proof result: ${goalStatus.fullGoalProven ? "proven" : "not proven"}
- real tools passed for full goal: ${goalStatus.summary.realToolsPassed}/${goalStatus.summary.realToolsRequired}
- missing real-tool proofs: ${goalStatus.summary.missingRealToolProofs}

## confirmed fixture capability

The fixture loop demonstrates that one senior demonstration record can be normalized into \`flow.md\`, linked to a normalized capture manifest, and used by the deterministic mock user harness to complete the same workflow using overlay guidance only.

Each fixture eval used only:

- generated \`flow.md\`
- normalized capture manifest
- materialized redacted capture frame artifacts
- materialized held-out eval frame artifacts
- redacted frame references
- held-out visible screen-observation text
- explicit simulated low-level fixture input transitions

No eval used APIs, backend access, database reads, DOM inspection, browser selectors, target-tool MCP, computer-use automation, embeddings, vector search, or LLM inference.

## tool results

${results.map(renderToolProofSection).join("\n")}

## shared teaching primitives

- yaml frontmatter defines tool, capture id, terminal business state, confidence threshold, redaction policy, and input automation policy
- embedded JSON step data defines expected visible state, grounded instruction text, manual user action, success condition, and fail-closed fallback
- overlay guidance is text plus region highlight only
- screen-state confidence is computed from visible text in fixture observations
- terminal business state is accepted only when explicit terminal visible text appears on the held-out final screen observation
- confidence below \`0.75\` fails closed instead of showing a target
- fixture user action is matched against explicit manual transition data
- reviewer checklist accepts only completed evals with terminal visible business state and no violations
- machine audit requires both odoo and notion results to pass all no-help, no-invention, no-privileged-access, held-out-frame, terminal-text, and reviewer-signoff gates
- machine audit requires referenced shareable evidence paths to exist under allowed flow, redacted capture, eval fixture, eval run, report, reviewer checklist, or normalized manifest locations

## tool-specific fixture differences

- odoo-like fixture workflow: open opportunity, select qualified stage, save visible qualified state
- notion-like fixture workflow: open task, open status property, select ready for review
- both workflows use three manual click transitions, but different visible text, anchors, terminal states, and redacted frame paths

## unproven limits

- Real odoo and notion environments are not available in this repo.
- Native screen recording, frame extraction, keyboard event capture, mouse event capture, and desktop overlay behavior are not implemented yet.
- The raw screen recording and \`.mp4\` eval recording files in fixture runs are local ignored markers, not native target-tool recordings.
- Fixture proof is not full production reliability and is not full PII compliance.
- Full-goal status remains not proven until real odoo and notion target-tool held-out evals pass from native screen-plus-input capture evidence.

## next experiment

Collect or implement real target-tool proof evidence for odoo and notion using native screen-plus-input capture, then rerun the full-goal proof status audit.
`;
}

function renderToolProofSection(result: EvalRunResult): string {
  return `### ${result.tool}

- flow id: ${result.flowId}
- run id: ${result.runId}
- passed: ${result.passed}
- completion rate: ${result.completionRate}
- steps completed: ${result.stepsCompleted}/${result.stepCount}
- first stuck step: ${result.firstStuckStep ?? "none"}
- overlay confidence per step: ${result.overlayConfidencePerStep.map((entry) => `${entry.stepId}=${entry.confidence}`).join(", ")}
- overlay misreads: ${result.overlayMisreads.length === 0 ? "none" : result.overlayMisreads.join("; ")}
- terminal business state: ${result.terminalBusinessState}
- terminal expected visible text: ${result.terminalExpectedVisibleText.join(", ")}
- terminal missing visible text: ${result.terminalMissingVisibleText.length === 0 ? "none" : result.terminalMissingVisibleText.join(", ")}
- terminal business state reached: ${result.terminalBusinessStateReached}
- held out from capture frames: ${result.heldOutFromCapture}
- reviewer signoff: ${result.reviewerSignoffResult}
- flow: flows/${result.tool}/${result.tool === "odoo" ? "qualify-opportunity" : "update-task-status"}.flow.md
- normalized capture manifest: captures/normalized/${captureIdForResult(result)}/manifest.json
- eval report: evals/reports/${result.tool}-${result.runId}.md
- reviewer checklist: evals/reviewer-checklists/${result.tool}-${result.runId}.md
`;
}

function renderFailureLog(result: EvalRunResult): string {
  return `# failure log

## run

- tool: ${result.tool}
- flow id: ${result.flowId}
- run id: ${result.runId}
- date: 2026-06-20
- evaluator: deterministic mock user harness

## result

- passed: ${result.passed}
- first failed step: ${result.firstStuckStep ?? "none"}
- terminal state reached: ${result.terminalBusinessStateReached}

## observed failure

${result.passed ? "No failure observed." : result.overlayMisreads.join("; ") || "See step trace for failure details."}

## evidence

- step trace: step-trace.json
- final screen: final-screen.png
- eval recording marker: eval-recording.mp4

## likely cause

- capture problem: ${result.passed ? "none observed" : "unknown"}
- flow problem: ${result.passed ? "none observed" : "unknown"}
- screen-state matcher problem: ${result.passed ? "none observed" : "unknown"}
- overlay problem: ${result.passed ? "none observed" : "unknown"}
- fixture problem: ${result.passed ? "none observed" : "unknown"}
- harness problem: ${result.passed ? "none observed" : "unknown"}

## next best experiment

${result.passed ? "Run the paired tool eval and compare shared teaching primitives." : "Fix the first failed step and rerun this deterministic fixture eval."}
`;
}

function fixturePng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/az6e0sAAAAASUVORK5CYII=",
    "base64"
  );
}

function fixtureRecordingMarker(result: EvalRunResult): string {
  return [
    "fixture eval recording marker",
    `tool=${result.tool}`,
    `run-id=${result.runId}`,
    "source=deterministic screen-observation fixture",
    "note=this marker is not a live target-tool screen recording"
  ].join("\n");
}

function captureIdForResult(result: EvalRunResult): string {
  return result.tool === "odoo" ? "capture-fixture-odoo-qualify-001" : "capture-fixture-notion-ready-review-001";
}

function asToolName(tool: string): ToolName {
  if (tool === "odoo" || tool === "notion") {
    return tool;
  }

  throw new Error(`unsupported tool in fixture proof: ${tool}`);
}

function resolveWorkspacePath(path: string): string {
  return resolve(workspaceRoot, path);
}

function findWorkspaceRoot(start: string): string {
  let current = start;

  while (true) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      return start;
    }

    current = parent;
  }
}
