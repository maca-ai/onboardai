#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createNormalizedCaptureManifest, normalizeDemonstrationToFlowMarkdown } from "@onboardai/capture";
import { runDeterministicEval, type EvalRunResult } from "@onboardai/eval-harness";
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
  writeTwoToolFixtureProof(results);
  const passed = results.every((result) => result.passed);
  console.log(`fixture proof ${passed ? "passed" : "failed"}: ${results.filter((result) => result.passed).length}/${results.length} tools`);
  process.exitCode = passed ? 0 : 1;
} else {
  console.log("usage: onboardai flow validate <path> | flow search <query> | capture normalize <odoo|notion> | eval run <odoo|notion> | proof fixtures");
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
  normalizeFixtureCapture(tool);
  const markdown = readFileSync(resolveWorkspacePath(fixture.flowPath), "utf8");
  const validation = validateFlowMarkdown(markdown);

  if (!validation.valid) {
    throw new Error(`${fixture.flowPath} is invalid: ${validation.errors.join("; ")}`);
  }

  return runDeterministicEval(parseFlowMarkdown(markdown), fixture);
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

function writeTwoToolFixtureProof(results: readonly EvalRunResult[]): void {
  const reportDir = resolveWorkspacePath(join("evals", "reports"));
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "two-tool-fixture-proof.md"), renderTwoToolFixtureProof(results));
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
- terminal business state reached: ${result.terminalBusinessStateReached}
- reviewer signoff result: ${result.reviewerSignoffResult}

## evidence

- step trace: evals/runs/${result.tool}/${result.runId}/step-trace.json
- final screen: evals/runs/${result.tool}/${result.runId}/final-screen.png
- normalized capture manifest: captures/normalized/${captureIdForResult(result)}/manifest.json
- eval recording marker: evals/runs/${result.tool}/${result.runId}/eval-recording.mp4
- failure log: evals/runs/${result.tool}/${result.runId}/failure-log.md

## proof boundary

This fixture eval used only screen observations from the fixture and simulated low-level input primitives. It did not use APIs, backend access, database reads, DOM inspection, browser selectors, target-tool MCP, computer-use automation, embeddings, vector search, or LLM inference.
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
- [${checked}] no human help was used during eval
- [${checked}] no api/backend/dom/selector/mcp access was used
- [${checked}] overlay did not invent steps
- [${checked}] below-threshold behavior failed closed

## reviewer verdict

- accepted: ${result.passed}
- rejected: ${!result.passed}
- notes: deterministic fixture senior review accepted each taught step only if the harness reached the terminal visible business state with no violations.
`;
}

function renderTwoToolFixtureProof(results: readonly EvalRunResult[]): string {
  const passedCount = results.filter((result) => result.passed).length;
  const totalSteps = results.reduce((sum, result) => sum + result.stepCount, 0);
  const completedSteps = results.reduce((sum, result) => sum + result.stepsCompleted, 0);
  const belowThresholdEvents = results.reduce((sum, result) => sum + result.belowThresholdEvents, 0);
  const humanHelpIncidents = results.reduce((sum, result) => sum + result.humanHelpIncidents, 0);
  const inventedStepIncidents = results.reduce((sum, result) => sum + result.inventedStepIncidents, 0);
  const privilegedAccessViolations = results.flatMap((result) => result.privilegedAccessViolations);

  return `# two-tool fixture proof

## summary

- proof substrate: deterministic clean fixtures
- tools passed: ${passedCount}/${results.length}
- steps completed: ${completedSteps}/${totalSteps}
- below-threshold events: ${belowThresholdEvents}
- human-help incidents: ${humanHelpIncidents}
- invented-step incidents: ${inventedStepIncidents}
- api/backend/dom/selector/mcp violations: ${privilegedAccessViolations.length === 0 ? "none" : privilegedAccessViolations.join("; ")}
- fixture proof result: ${passedCount === results.length ? "passed" : "failed"}
- real-tool proof result: not run

## confirmed fixture capability

The fixture loop demonstrates that one senior demonstration record can be normalized into \`flow.md\`, linked to a normalized capture manifest, and used by the deterministic mock user harness to complete the same workflow using overlay guidance only.

Each fixture eval used only:

- generated \`flow.md\`
- normalized capture manifest
- redacted frame references
- visible screen-observation text
- explicit simulated low-level fixture input transitions

No eval used APIs, backend access, database reads, DOM inspection, browser selectors, target-tool MCP, computer-use automation, embeddings, vector search, or LLM inference.

## tool results

${results.map(renderToolProofSection).join("\n")}

## shared teaching primitives

- yaml frontmatter defines tool, capture id, terminal business state, confidence threshold, redaction policy, and input automation policy
- embedded JSON step data defines expected visible state, grounded instruction text, manual user action, success condition, and fail-closed fallback
- overlay guidance is text plus region highlight only
- screen-state confidence is computed from visible text in fixture observations
- confidence below \`0.75\` fails closed instead of showing a target
- fixture user action is matched against explicit manual transition data
- reviewer checklist accepts only completed evals with terminal visible business state and no violations

## tool-specific fixture differences

- odoo-like fixture workflow: open opportunity, select qualified stage, save visible qualified state
- notion-like fixture workflow: open task, open status property, select ready for review
- both workflows use three manual click transitions, but different visible text, anchors, terminal states, and redacted frame paths

## unproven limits

- Real odoo and notion environments are not available in this repo.
- Native screen recording, frame extraction, keyboard event capture, mouse event capture, and desktop overlay behavior are not implemented yet.
- The \`.mp4\` eval recording files in fixture runs are local ignored markers, not live target-tool recordings.
- Fixture proof is not full production reliability and is not full PII compliance.

## next experiment

Implement a real local capture adapter spike that writes raw screen recording, keyboard log, mouse log, redacted frame metadata, and a normalized capture manifest using the same artifact contracts, then rerun this proof against the adapter output.
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
- terminal business state reached: ${result.terminalBusinessStateReached}
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
