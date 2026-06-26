#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createNormalizedCaptureManifest,
  createNormalizedRunCaptureManifest,
  normalizeDemonstrationToFlowMarkdown,
  validateNativeCaptureReadiness,
  writeLocalCaptureBundle,
  type SeniorDemonstration
} from "@onboardai/capture";
import {
  auditCaptureTeachGoalStatus,
  auditEvalProofResults,
  auditRealToolRunArtifacts,
  auditShareableEvidencePaths,
  markRealToolProofEvidenceAudited,
  parseRealToolProofEvidenceFile,
  runDeterministicEval,
  type CaptureTeachGoalStatusFinding,
  type CaptureTeachGoalStatusResult,
  type EvalProofAuditResult,
  type EvalRunResult,
  type AuditedRealToolProofEvidence,
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
} else if (args[0] === "capture" && args[1] === "normalize-run") {
  const tool = args[2];
  const runId = args[3];
  if ((tool !== "odoo" && tool !== "notion") || !runId || !isSafeRunId(runId)) {
    console.error("usage: onboardai capture normalize-run <odoo|notion> <run-id>");
    process.exitCode = 1;
  } else {
    const artifact = normalizeFixtureRunCapture(tool, runId);
    console.log(`normalized ${tool} fixture run capture to ${artifact.path}`);
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
} else if (args[0] === "capture" && args[1] === "readiness" && args[2] === "validate") {
  const readinessPath = args[3];
  if (!readinessPath || args.length > 4) {
    console.error("usage: onboardai capture readiness validate <path>");
    process.exitCode = 1;
  } else {
    try {
      const content = readFileSync(resolveWorkspacePath(readinessPath), "utf8");
      const validation = validateNativeCaptureReadiness(JSON.parse(content));
      if (validation.valid) {
        console.log(`native capture readiness valid: ${readinessPath}`);
      } else {
        console.error(`native capture readiness invalid: ${validation.errors.join("; ")}`);
      }
      process.exitCode = validation.valid ? 0 : 1;
    } catch (error) {
      console.error(`native capture readiness invalid: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
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
} else if (args[0] === "proof" && args[1] === "scan-shareable") {
  const scan = scanShareableArtifacts();
  if (scan.passed) {
    console.log(`shareable artifact scan passed: ${scan.filesScanned} file(s) scanned`);
  } else {
    console.error(`shareable artifact scan failed: ${scan.findings.join("; ")}`);
  }
  process.exitCode = scan.passed ? 0 : 1;
} else if (args[0] === "proof" && args[1] === "status") {
  const fixtureAudit = loadFixtureProofAudit();
  if (!fixtureAudit) {
    console.error("fixture proof audit missing or invalid; run pnpm proof:fixtures first");
    process.exitCode = 1;
  } else {
    const realToolEvidence = loadRealToolProofEvidence(["odoo", "notion"]);
    const goalStatus = auditCaptureTeachGoalStatus({
      fixtureAudit,
      realToolProofs: realToolEvidence.proofs,
      realToolProofFindings: realToolEvidence.findings
    });
    writeFullGoalProofStatus(goalStatus);
    console.log(`full goal ${goalStatus.fullGoalProven ? "proven" : "not proven"}`);
    console.log(`fixture proof ${goalStatus.fixtureProofPassed ? "passed" : "failed"}`);
    console.log(`real-tool proof ${goalStatus.realToolProofPassed ? "passed" : "failed"}: ${goalStatus.summary.realToolsPassed}/${goalStatus.summary.realToolsRequired} tools`);
    if (goalStatus.findings.length > 0) {
      console.log(`findings: ${goalStatus.findings.map((finding) => `${finding.tool}: ${finding.message}`).join("; ")}`);
    }
    process.exitCode = goalStatus.fullGoalProven ? 0 : 1;
  }
} else if (args[0] === "proof" && args[1] === "real-run" && args[2] === "init") {
  const tool = args[3];
  const generatedRunIdRequested = args[4] === "--generate-run-id";
  const runId = tool === "odoo" || tool === "notion" ? (generatedRunIdRequested ? generateRealRunId(tool) : args[4]) : args[4];
  const hasUnsupportedInitArg = args.length > 5;
  if ((tool !== "odoo" && tool !== "notion") || !runId || !isSafeRunId(runId) || hasUnsupportedInitArg) {
    console.error("usage: onboardai proof real-run init <odoo|notion> <run-id|--generate-run-id>");
    process.exitCode = 1;
  } else {
    try {
      const created = initializeRealToolRun(tool, runId);
      console.log(`initialized real run ${tool}/${runId}: ${created.join(", ")}`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
} else if (args[0] === "proof" && args[1] === "real-run") {
  const tool = args[2];
  const runId = args[3];
  const writeSummary = args[4] === "--write-summary";
  const hasUnsupportedFlag = args.length > 4 && !writeSummary;
  if ((tool !== "odoo" && tool !== "notion") || !runId || hasUnsupportedFlag) {
    console.error("usage: onboardai proof real-run <odoo|notion> <run-id> [--write-summary]");
    process.exitCode = 1;
  } else {
    const audit = auditRealToolRun(tool, runId);
    if (audit.passed) {
      console.log(`real run ${tool}/${runId} valid: ${audit.summary.requiredArtifacts}/${audit.summary.requiredArtifacts} required artifacts`);
      if (writeSummary) {
        const proofPath = writeRealToolProofSummary(tool, runId);
        console.log(`wrote ${proofPath}`);
      }
    } else {
      console.error(`real run ${tool}/${runId} failed: ${audit.findings.map((finding) => finding.message).join("; ")}`);
    }
    process.exitCode = audit.passed ? 0 : 1;
  }
} else {
  console.log("usage: onboardai flow validate <path> | flow search <query> | capture materialize <odoo|notion> | capture normalize <odoo|notion> | capture normalize-run <odoo|notion> <run-id> | capture readiness validate <path> | eval run <odoo|notion> | proof fixtures | proof scan-shareable | proof status | proof real-run init <odoo|notion> <run-id|--generate-run-id> | proof real-run <odoo|notion> <run-id> [--write-summary]");
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
  normalizeFixtureRunCapture(tool, fixture.runId);
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

function normalizeFixtureRunCapture(tool: ToolName, runId: string): { readonly path: string; readonly framePaths: readonly string[] } {
  if (!isSafeRunId(runId)) {
    throw new Error("run id must be lowercase kebab-case");
  }

  const fixture = getDeterministicFixture(tool);
  const demonstration = withRunLocalFramePaths(getSeniorDemonstration(tool), tool, runId);
  const artifact = normalizeDemonstrationToFlowMarkdown(demonstration, fixture.flowPath);
  const manifest = createNormalizedRunCaptureManifest(demonstration, artifact, { tool, runId });
  const manifestPath = resolveWorkspacePath(manifest.path);
  const framePaths = manifest.manifest.redactedFrames.map((frame) => frame.path);

  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, manifest.json);

  for (const framePath of framePaths) {
    const absolutePath = resolveWorkspacePath(framePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, fixturePng());
  }

  return { path: manifest.path, framePaths };
}

function withRunLocalFramePaths(demonstration: SeniorDemonstration, tool: ToolName, runId: string): SeniorDemonstration {
  return {
    ...demonstration,
    frames: demonstration.frames.map((frame, index) => ({
      ...frame,
      redactedFramePath: `evals/runs/${tool}/${runId}/redacted-frame-${String(index + 1).padStart(4, "0")}.png`
    }))
  };
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

  writeFileSync(
    join(runDir, "step-trace.json"),
    `${JSON.stringify({ schemaVersion: 1, tool: result.tool, runId: result.runId, flowId: result.flowId, steps: result.trace }, null, 2)}\n`
  );
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

function scanShareableArtifacts(): { readonly passed: boolean; readonly filesScanned: number; readonly findings: readonly string[] } {
  const roots = ["flows", "evals", "captures/normalized", "captures/redacted"] as const;
  const rules = [
    { label: "email address", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
    { label: "password", pattern: /\b(?:password|passwd|pwd)\s*[:=]/i },
    { label: "token", pattern: /\b(?:token|access_token|refresh_token)\s*[:=]|\bbearer\s+["']?[A-Za-z0-9._~+/=-]{12,}/i },
    { label: "api key", pattern: /\b(?:api[_-]?key|secret[_-]?key)\s*[:=]/i },
    { label: "session secret", pattern: /\b(?:session[_-]?secret|sessionid|session_id)\s*[:=]/i },
    { label: "unsafe capture path", pattern: /\bcaptures\/(?:raw|unsafe|tmp)\//i },
    { label: "local tmp path", pattern: /(^|[^a-z])(?:\/private)?\/tmp\//i },
    { label: "file url", pattern: /\bfile:\/\//i },
    { label: "traversal path", pattern: /(^|[\s"'(])\.\.(?:\/|\\)/i }
  ] as const;
  const findings: string[] = [];
  let filesScanned = 0;

  for (const path of roots.flatMap((root) => listShareableTextFiles(root)).sort()) {
    filesScanned += 1;
    const content = readFileSync(resolveWorkspacePath(path), "utf8");
    for (const rule of rules) {
      if (rule.pattern.test(content)) {
        findings.push(`${path}: ${rule.label}`);
      }
    }
  }

  return { passed: findings.length === 0, filesScanned, findings };
}

function listShareableTextFiles(root: string): string[] {
  const absoluteRoot = resolveWorkspacePath(root);
  const entries = safeReadDir(absoluteRoot);
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(root, entry);
    const absolutePath = resolveWorkspacePath(path);
    const stat = statSync(absolutePath);
    if (stat.isDirectory()) {
      files.push(...listShareableTextFiles(path));
    } else if (!isBinaryEvidencePath(path)) {
      files.push(path);
    }
  }

  return files;
}

function isBinaryEvidencePath(path: string): boolean {
  return /\.(?:png|jpe?g|gif|webp|mp4|mov|webm)$/i.test(path);
}

function loadFixtureProofAudit(): EvalProofAuditResult | null {
  const auditPath = resolveWorkspacePath(join("evals", "reports", "fixture-proof-audit.json"));
  if (!existsSync(auditPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(auditPath, "utf8")) as EvalProofAuditResult;
  } catch {
    return null;
  }
}

function initializeRealToolRun(tool: ToolName, runId: string): readonly string[] {
  const runDir = resolveWorkspacePath(join("evals", "runs", tool, runId));
  if (existsSync(runDir) && safeReadDir(runDir).length > 0) {
    throw new Error(`real run ${tool}/${runId} already exists; refusing to overwrite run evidence`);
  }

  mkdirSync(runDir, { recursive: true });

  const replacements: readonly [RegExp, string][] = [
    [/\breplace-with-odoo-or-notion\b/g, tool],
    [/\bflows\/tool\/replace-with-flow\.flow\.md\b/g, flowPathForTool(tool)],
    [/\breplace-with-flow-id\b/g, flowIdForTool(tool)],
    [/\breplace with flow\.md terminal-business-state\b/g, terminalBusinessStateForTool(tool)],
    [/\bevals\/runs\/tool\/replace-with-run-id\b/g, `evals/runs/${tool}/${runId}`],
    [/\breplace-with-run-id\b/g, runId],
    [/\breplace-with-capture-id\b/g, `capture-real-${tool}-${runId}`],
    [/^- tool:\s*$/gm, `- tool: ${tool}`],
    [/^- flow id:\s*$/gm, `- flow id: ${flowIdForTool(tool)}`],
    [/^- run id:\s*$/gm, `- run id: ${runId}`]
  ];
  const templateFiles = [
    "step-trace.json",
    "failure-log.md",
    "reviewer-checklist.md",
    "reviewer-signoff.json",
    "flow-evidence.json",
    "demo-data-evidence.json",
    "capture-readiness.json",
    "capture-manifest.json",
    "screen-input-evidence.json",
    "outcome-evidence.json"
  ] as const;
  const created: string[] = [];

  for (const file of templateFiles) {
    const templatePath = resolveWorkspacePath(join("evals", "templates", "runs", "tool-run-id", file));
    let content = readFileSync(templatePath, "utf8");
    for (const [pattern, replacement] of replacements) {
      content = content.replace(pattern, replacement);
    }

    writeFileSync(join(runDir, file), content);
    created.push(join("evals", "runs", tool, runId, file));
  }

  return created;
}

function generateRealRunId(tool: ToolName, now: Date = new Date()): string {
  const timestamp = now
    .toISOString()
    .slice(0, 19)
    .replace(/[-:]/g, "")
    .replace("T", "t");
  const base = `${tool}-real-eval-${timestamp}z`;

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const runId = suffix === 0 ? base : `${base}-${suffix + 1}`;
    if (!existsSync(resolveWorkspacePath(join("evals", "runs", tool, runId)))) {
      return runId;
    }
  }

  throw new Error(`could not generate an unused real run id for ${tool}`);
}

function isSafeRunId(runId: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(runId);
}

function flowPathForTool(tool: ToolName): string {
  return tool === "odoo" ? "flows/odoo/qualify-opportunity.flow.md" : "flows/notion/update-task-status.flow.md";
}

function flowIdForTool(tool: ToolName): string {
  return tool === "odoo" ? "odoo-qualify-opportunity" : "notion-update-task-status";
}

function terminalBusinessStateForTool(tool: ToolName): string {
  return tool === "odoo" ? "demo opportunity visible with stage qualified" : "demo task visible with status ready for review";
}

function auditRealToolRun(tool: ToolName, runId: string): ReturnType<typeof auditRealToolRunArtifacts> {
  const proof = realToolProofForRun(tool, runId);

  return auditRealToolRunArtifacts(
    proof,
    (path) => existsSync(resolveWorkspacePath(path)),
    (path) => readFileSync(resolveWorkspacePath(path), "utf8")
  );
}

function writeRealToolProofSummary(tool: ToolName, runId: string): string {
  const proofPath = join("evals", "reports", `real-tool-proof-${tool}.json`);
  const absoluteProofPath = resolveWorkspacePath(proofPath);
  mkdirSync(dirname(absoluteProofPath), { recursive: true });
  writeFileSync(absoluteProofPath, `${JSON.stringify(realToolProofForRun(tool, runId), null, 2)}\n`);
  return proofPath;
}

function realToolProofForRun(tool: ToolName, runId: string): RealToolProofEvidence {
  return {
    tool,
    runId,
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
}

function loadRealToolProofEvidence(requiredTools: readonly ToolName[]): {
  readonly proofs: readonly AuditedRealToolProofEvidence[];
  readonly findings: readonly CaptureTeachGoalStatusFinding[];
} {
  const proofs: AuditedRealToolProofEvidence[] = [];
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

      const auditedProof = markRealToolProofEvidenceAudited(proof, artifactAudit);
      if (auditedProof) {
        proofs.push(auditedProof);
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
    const runManifestPath = join(runDir, "capture-manifest.json");
    const reportPath = join("evals", "reports", `${result.tool}-${result.runId}.md`);
    const checklistPath = join("evals", "reviewer-checklists", `${result.tool}-${result.runId}.md`);

    references.push({ tool: result.tool, label: "flow", path: flowPath });
    references.push({ tool: result.tool, label: "normalized capture manifest", path: manifestPath });
    references.push({ tool: result.tool, label: "run-local normalized capture manifest", path: runManifestPath });
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

    references.push(...extractManifestEvidenceReferences(result.tool, manifestPath));
    references.push(...extractManifestEvidenceReferences(result.tool, runManifestPath));

    for (const entry of result.trace) {
      references.push({ tool: result.tool, label: `trace ${entry.stepId} held-out frame`, path: entry.currentFrame });
      if (entry.successFrame) {
        references.push({ tool: result.tool, label: `trace ${entry.stepId} success frame`, path: entry.successFrame });
      }
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

function extractManifestEvidenceReferences(tool: string, manifestPath: string): readonly ShareableEvidencePathReference[] {
  const references: ShareableEvidencePathReference[] = [];
  const manifest = JSON.parse(readFileSync(resolveWorkspacePath(manifestPath), "utf8")) as NormalizedManifestEvidence;

  if (typeof manifest.flowPath === "string") {
    references.push({ tool, label: `${manifestPath} flow path`, path: manifest.flowPath });
  }

  for (const frame of manifest.redactedFrames ?? []) {
    if (typeof frame.path === "string") {
      references.push({ tool, label: `${manifestPath} redacted frame ${String(frame.frameId ?? "unknown")}`, path: frame.path });
    }
  }

  return references;
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
- run-local capture manifest: evals/runs/${result.tool}/${result.runId}/capture-manifest.json
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
- run-local capture manifest: evals/runs/${result.tool}/${result.runId}/capture-manifest.json
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
- run-local normalized capture manifest
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
- run-local capture manifest: evals/runs/${result.tool}/${result.runId}/capture-manifest.json
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
- zero human help: ${result.humanHelpIncidents === 0}
- no invented steps: ${result.inventedStepIncidents === 0}
- no privileged access: ${result.privilegedAccessViolations.length === 0}

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
