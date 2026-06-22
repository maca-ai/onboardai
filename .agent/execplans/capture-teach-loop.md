# prove the capture-to-teach loop

this execplan is a living document. keep `progress`, `surprises-and-discoveries`, `decision-log`, and `outcomes-and-retrospective` current as work proceeds.

this plan follows `.agent/plans.md`.

## purpose

after this work, onboardai should prove that a senior can demonstrate one short workflow once in an api-less tool, the system can save that demonstration as a normalized `flow.md`, and a first-time user can complete the same workflow using only step-by-step overlay guidance.

the proof is not a pretty document. the proof is a held-out teaching eval in `/evals` that passes on two different api-less tools: odoo and notion.

## user-visible result

a user can run the app, capture a short workflow, normalize it into `flow.md`, then run a teaching session where the overlay highlights the correct region and gives the next instruction. if the current screen does not match the expected state with confidence at or above `0.75`, the overlay refuses to guess.

## fixed decisions

- project folder: `onboardai`
- repo state: fresh folder, no repo
- first repo action: run `git init`
- primary language: typescript
- package manager: pnpm
- desktop shell: tauri-first
- platform target: macos and windows
- linux: out of scope for v0
- target tools: odoo and notion
- odoo: browser or pwa first
- notion: desktop app or browser
- target tools are not currently available
- evals use clean seeded demo data or sanitized duplicate data
- capture may later occur against real work environments
- raw capture is retained locally until manually deleted
- raw capture is unsafe-to-share and excluded from git
- v0 is not full pii classification
- v0 hard-redacts secrets and email addresses
- overlay guides only and never automates input
- below confidence `0.75`, fail closed
- deterministic mock user harness is the v0 scripted stand-in
- no vector database
- no embeddings
- ripgrep is allowed and preferred for local text search
- search must exist as a library function and cli command

## hard constraints

do not request or use:

- odoo api
- notion api
- mcp access to target tools
- backend access
- database access
- dom inspection
- playwright selectors
- computer-use automation as proof

do not weaken any constraint to make an eval pass.

## definitions

`capture`: local recording of screen video, keyboard events, mouse events, and optional senior notes.

`raw capture`: original capture material. unsafe-to-share. excluded from git.

`redacted frame`: screenshot frame after hard secret redaction.

`flow.md`: normalized markdown document with yaml frontmatter and embedded json step data.

`anchor`: a screen-region reference derived from captured frames, used for overlay highlighting.

`overlay`: a desktop overlay or sidecar that shows instructions and highlights regions. it does not click or type.

`terminal business state`: the final visible state that proves the workflow reached its intended business outcome.

`deterministic mock user harness`: a test harness that can execute simulated low-level input primitives against fixtures, but cannot infer missing actions with an llm or inspect hidden state.

## progress

### milestone 1 foundation

- [x] initialize git in the fresh folder with `git init`
- [x] add `.gitignore` excluding raw captures, unsafe local artifacts, logs, and secrets
- [x] scaffold pnpm workspace
- [x] add docs from this artifact set
- [x] add baseline lint, typecheck, and test scripts
- [x] inspect available local `teach` skill as the local copy of `mattpocock/teach`
- [x] decide fork, adapt ideas only, or ignore
- [x] define first `flow.md` parser and validator
- [x] build local flow library search as library function
- [x] rank local flow library search by parsed flow evidence
- [x] expose flow search as cli command
- [x] build capture artifact model
- [x] build senior-demonstration to normalized `flow.md` generation
- [x] build normalized capture manifests for redacted frame and input evidence
- [x] tag business-sensitive values in normalized capture manifests
- [x] add native capture readiness gate so unverified adapters cannot be used as proof
- [x] build redaction pipeline for forbidden persisted secrets
- [x] build screen-state matcher with confidence output
- [x] build overlay guidance renderer contract
- [x] enforce fail-closed behavior below confidence `0.75`
- [x] add deterministic mock user harness safety policy module
- [x] add odoo-like clean fixture contract
- [x] add notion-like clean fixture contract
- [x] pass odoo held-out teaching eval against clean fixture
- [x] pass notion held-out teaching eval against clean fixture
- [x] collect fixture senior-review checklist evidence
- [x] separate fixture senior capture observations from held-out eval observations
- [x] materialize referenced redacted and held-out fixture frames
- [x] require explicit terminal visible text for fixture eval pass
- [x] add machine-readable two-tool fixture proof audit
- [x] reject ungrounded instruction highlights and user-action target anchors in `flow.md`
- [x] audit shareable evidence paths for existence, allowed location, and unsafe capture leaks
- [x] write explicit full-goal status showing fixture proof is not real odoo/notion proof
- [x] define real target-tool proof evidence ingestion contract
- [x] prepare real target-tool eval runbook and templates without loading them as proof
- [x] gate real target-tool proof summaries on complete real run artifacts
- [x] add CLI dry-run validation for filled real run directories
- [x] validate real run step-trace and reviewer-checklist contents before proof ingestion
- [x] validate real run outcome evidence before proof ingestion
- [x] add guarded CLI summary creation for validated real run directories
- [x] add full-goal proof status command that fails until real odoo and notion proofs exist
- [x] add guarded CLI initialization for editable real-run skeletons
- [x] add reproducible shareable artifact safety scan command
- [x] require real-run step traces to be grounded in referenced `flow.md`
- [x] require native capture readiness evidence before real-run proof can pass
- [x] require senior reviewer signoff for every real-run step id
- [x] require normalized capture manifest contents before real-run proof can pass
- [x] require normalized capture input evidence for every real-run step id
- [x] require screen-input redacted frames to be listed in normalized capture manifest
- [x] require real-run step current frames to be same-run redacted PNG evidence
- [x] require normalized redacted capture evidence to be `captures/redacted/<capture-id>/frame-*.png`
- [x] reject path-like raw artifact leaks in normalized capture manifests
- [x] restrict normalized input evidence to mouse and keyboard event observations
- [x] require normalized input evidence to include traced action target anchors
- [x] require real-run visible text evidence to be grounded in `flow.md`
- [x] require real-run matched visible text evidence to prove observed screen text
- [x] require real-run outcome counts to match same-run step trace evidence
- [x] require normalized capture manifests to match same-run flow evidence
- [x] reject unredacted secrets in real-run shareable text artifacts
- [x] require real-run terminal outcome text to match `flow.md`
- [x] reject overlay input automation exposure in real-run step traces
- [x] reject real-run failure logs that contradict passing outcome evidence
- [x] require real-run JSON evidence schema version `1`
- [x] require real-run step trace to be a versioned JSON document
- [x] require full-goal status to count only evidence-audited real proofs
- [ ] complete retrospective

## surprises-and-discoveries

record observations here.

- observation: the repo already contained project docs and `.agent/execplans/capture-teach-loop.md`, but no git history or stack.
  evidence: `git status -sb` before scaffold showed no commits on `main` and untracked docs/plan files.

- observation: network access to GitHub was blocked when trying to inspect `https://github.com/mattpocock/teach.git`.
  evidence: sandboxed `git ls-remote` failed with `Could not resolve host: github.com`; escalated `git ls-remote` was rejected by the user.

- observation: the available local `teach` skill is a teaching-workspace methodology, not a capture, redaction, overlay, or eval runtime.
  evidence: `/Users/mc/.codex/skills/teach/SKILL.md` describes `MISSION.md`, `RESOURCES.md`, `learning-records`, `lessons`, reference documents, and feedback loops.

- observation: Node v20 built-in test runner is enough for the first milestone.
  evidence: Context7 `/websites/nodejs_latest-v20_x` documents `node --test` as the stable built-in test runner in Node v20 and supports command-line test execution.

- observation: TypeScript compiler behavior for `noEmit` was verified before relying on it for lint/typecheck scripts.
  evidence: Context7 `/microsoft/typescript/v5.9.3` documents `noEmit` as a compiler option that disables emitted files.

- observation: `pnpm --filter @onboardai/cli` runs the CLI from the package directory, not the workspace root.
  evidence: first `pnpm eval:odoo` and `pnpm eval:notion` runs failed with `ENOENT` for `flows/...`; CLI now locates the workspace root by walking up to `pnpm-workspace.yaml`.

- observation: fixture eval evidence can be generated without any target-tool privileged access.
  evidence: `pnpm eval:odoo` passed 3/3 steps and `pnpm eval:notion` passed 3/3 steps using only fixture screen observations and simulated low-level fixture input transitions.

- observation: generated flows must preserve the `flow.md` schema's kebab-case field names.
  evidence: first generated-flow test run failed because the normalizer emitted `targetAnchorId`; fixing it to emit `target-anchor-id` allowed the harness to match manual actions and pass both fixture evals.

- observation: capture normalization can be verified without real target tools by using deterministic senior demonstration records.
  evidence: `pnpm capture:normalize:odoo` and `pnpm capture:normalize:notion` generated the two committed `flow.md` files from raw artifact metadata, redacted frame references, mouse input events, keyboard log artifacts, and human notes.

- observation: shareable normalized capture manifests can cite capture evidence without leaking raw capture paths.
  evidence: `captures/normalized/capture-fixture-odoo-qualify-001/manifest.json` and `captures/normalized/capture-fixture-notion-ready-review-001/manifest.json` contain raw artifact kind/safety summaries, redacted frame paths, anchors, and step input evidence; raw/unsafe/tmp path scan found no matches.

- observation: the full fixture proof is now reproducible through one command.
  evidence: `pnpm proof:fixtures` regenerates both normalized flows and manifests, reruns both fixture evals, refreshes reviewer evidence, and writes `evals/reports/two-tool-fixture-proof.md`; latest run passed 2/2 tools.

- observation: the fixture capture adapter can now materialize local raw artifacts under git-ignored paths.
  evidence: `pnpm capture:materialize:odoo` and `pnpm capture:materialize:notion` each wrote 4 raw artifacts under `captures/raw/...`; `git check-ignore` confirmed the screen recording, keyboard log, and mouse log paths are ignored.

- observation: Context7 verified several Tauri v2 concepts, but not enough to justify adding a native capture dependency yet.
  evidence: Context7 `/websites/v2_tauri_app` documented v2 capabilities, permission files, plugin command exposure, global shortcut support, and platform-specific window behavior; it did not verify a complete official path for screen recording, full keyboard event logging, full mouse event logging, macos/windows permission recovery, deterministic native capture tests, or overlay behavior.

- observation: fixture evals are now actually held out from the senior capture frame paths.
  evidence: senior demonstrations normalize from `captures/redacted/...` frame references, while deterministic eval step traces now use `evals/fixtures/.../held-out-frame-*.png`; `pnpm proof:fixtures` passed 2/2 tools after regenerating `/evals` evidence.

- observation: terminal business state now depends on explicit visible text, not tool-specific keyword shortcuts.
  evidence: `EvalRunResult` records `terminalExpectedVisibleText` and `terminalMissingVisibleText`; a regression test removes terminal-only text from the held-out final observation and the eval fails even after all three step transitions complete.

- observation: the two-tool fixture proof now has a machine-readable audit gate.
  evidence: `pnpm proof:fixtures` writes `evals/reports/fixture-proof-audit.json` with `passed: true`, required tools `odoo` and `notion`, 6/6 steps completed, zero human-help incidents, zero invented-step incidents, zero privileged-access violations, and no findings.

- observation: flow-library search now ranks local files by structured flow evidence instead of plain substring filtering.
  evidence: `searchFlowDocumentDetails` scores path, frontmatter, step titles, instructions, expected visible text, and success visible text; targeted flow tests passed 4/4, `pnpm flow:search ready review` returned the Notion flow, and `pnpm flow:search qualify opportunity` returned the Odoo flow.

- observation: normalized capture manifests now tag business-sensitive frame paths before shareable persistence.
  evidence: `createNormalizedCaptureManifest` routes redacted frame paths through the same redaction/tagging helper used for visible text and input evidence; targeted capture tests passed 10/10, including a local absolute frame path containing `opp-123` that produced `file-path` and `business-record-id` tags.

- observation: fixture flow and eval frame references now point to materialized shareable PNG artifacts.
  evidence: `proof fixtures` writes 8 redacted capture frame PNGs under `captures/redacted/...` and 8 held-out eval frame PNGs under `evals/fixtures/...`; targeted CLI tests passed 2/2 and `file` identified sample artifacts as 1x1 PNG images.

- observation: normalized flows now fail validation when overlay or action anchors are not grounded in the current step's redacted frame hints, and malformed anchors with missing source frames fail without crashing validation.
  evidence: new flow tests reject `instruction.highlight-anchor-id` and `user-action.target-anchor-id` values that do not appear in the same step's `expected-state.screen-region-hints`; another test removes `source-frame` and validates the error path.

- observation: fixture proof now machine-checks referenced shareable evidence paths instead of relying on report text.
  evidence: `pnpm proof:fixtures` writes `evals/reports/fixture-proof-audit.json` with `shareableEvidence.passed: true`, 60 references audited, zero missing references, zero unsafe references, and zero disallowed references.

- observation: fixture proof now writes a separate full-goal status artifact that prevents overclaiming.
  evidence: `evals/reports/full-goal-proof-status.json` reports `fullGoalProven: false`, `fixtureProofPassed: true`, `realToolProofPassed: false`, `missingRealToolProofs: 2`, and missing real target-tool plus native screen-plus-input evidence for both odoo and notion.

- observation: full-goal status can now ingest real target-tool proof summaries when they exist, but none are present yet.
  evidence: `proof fixtures` looks for `evals/reports/real-tool-proof-odoo.json` and `evals/reports/real-tool-proof-notion.json`; current `evals/reports/full-goal-proof-status.json` has `realToolProofs: []` and `missingRealToolProofs: 2`.

- observation: real target-tool evals now have copyable runbook and template artifacts, but those templates are not ingested as completed proof.
  evidence: `docs/real-eval-runbook.md` defines clean seeded setup, senior capture, naive-user eval, and reviewer signoff checklists; templates live under `evals/templates/...` instead of `evals/reports/real-tool-proof-*.json`, so `proof fixtures` will not treat placeholders as real odoo or notion evidence.

- observation: real proof summary parsing now rejects misplaced or incomplete proof pointers before full-goal audit.
  evidence: targeted eval-harness tests passed 17/17, including cases for missing `seniorReviewerSignoff`, wrong-tool run paths, non-`step-trace.json` evidence paths, and incomplete real proof data that leaves fixture proof true while full-goal proof remains false.

- observation: real proof summaries now require a complete derived real run directory before the CLI loads them as proof.
  evidence: `auditRealToolRunArtifacts` requires `step-trace.json`, `final-screen.png`, `eval-recording.mp4`, `failure-log.md`, `reviewer-checklist.md`, and `screen-input-evidence.json`; targeted eval-harness tests passed 20/20 and CLI tests passed 2/2 after wiring the audit into `loadRealToolProofEvidence`.

- observation: native screen-plus-input evidence is now represented without changing the proof summary schema.
  evidence: the run directory must include `screen-input-evidence.json` with clean seeded data, local-only raw capture policy, native screen recording, keyboard log, mouse log, hard redaction, no-privileged-access flags, and shareable redacted/normalized evidence paths; templates were added under `evals/templates/runs/tool-run-id/`.

- observation: a filled real run directory can now be validated before creating a live real-proof summary.
  evidence: `onboardai proof real-run <odoo|notion> <run-id>` runs the same artifact gate used by full-goal proof ingestion, returns failure findings for incomplete runs, and does not create `evals/reports/real-tool-proof-*.json`; targeted CLI tests passed 4/4.

- observation: real run validation now rejects weak step traces and unsigned reviewer checklists, not just missing files.
  evidence: `auditRealToolRunArtifacts` parses `step-trace.json` and requires successful instruction steps, confidence `>=0.75`, highlighted anchor ids, manual-only actions, and current-frame evidence under the run directory; it also requires `reviewer-checklist.md` to contain `- accepted: true` and not `- rejected: true`. Targeted eval-harness tests passed 21/21.

- observation: real run validation now grounds summary booleans in a required outcome evidence artifact.
  evidence: `outcome-evidence.json` is required under the real run directory and must show completion rate 1, all steps completed, terminal business state reached, empty terminal missing text, zero human-help incidents, zero invented-step incidents, no privileged access violations, held-out eval evidence, and senior reviewer signoff; targeted eval-harness tests passed 22/22.

- observation: real run outcome evidence now fails if it names the wrong tool or points outside the matching run directory.
  evidence: `auditRealToolRunArtifacts` rejects unsupported outcome tools, summary/run tool mismatches, raw capture references, absolute paths, missing paths, and paths that do not exactly match `evals/runs/<tool>/<run-id>/final-screen.png` and `evals/runs/<tool>/<run-id>/step-trace.json`; targeted eval-harness tests passed 22/22.

- observation: live real-proof summaries can now be written from the CLI only after a run directory passes the evidence gate.
  evidence: `onboardai proof real-run <tool> <run-id> --write-summary` writes `evals/reports/real-tool-proof-<tool>.json` only after the same 7-artifact real-run audit passes; CLI tests prove missing runs fail without writing or changing the summary, valid temporary runs can write the summary, and the test restores the repo to no live real-tool summaries.

- observation: the current full-goal gate can now be checked directly without rerunning fixture evals.
  evidence: `pnpm proof:status` reads `fixture-proof-audit.json`, validates any live real-proof summaries through the same run artifact gate, refreshes `full-goal-proof-status.json`, and currently exits 1 with missing real held-out and native capture evidence for both odoo and notion.

- observation: real run directories can now be initialized without creating proof.
  evidence: `onboardai proof real-run init <tool> <run-id>` copies the editable JSON/Markdown templates into `evals/runs/<tool>/<run-id>/`, refuses unsafe or traversal run ids, refuses to overwrite existing run evidence, and still fails `proof real-run` until real final-screen, eval-recording, reviewer acceptance, and other native evidence are supplied; targeted CLI tests passed 7/7.

- observation: shareable artifact safety scans are now reproducible through the CLI.
  evidence: `pnpm proof:scan` runs `onboardai proof scan-shareable` over `flows`, `evals`, `captures/normalized`, and `captures/redacted`, skips binary evidence, and fails on forbidden emails, password assignments, token assignments, api keys, session secrets, or raw/unsafe/tmp capture paths; targeted CLI tests passed 9/9 and current scan passed 22 text files.

- observation: real run validation now rejects invented trace guidance by checking the referenced `flow.md`.
  evidence: `flow-evidence.json` is required under each real run directory, points to a local flow file under `flows/`, and the validator parses that flow to compare step ids, overlay instruction text, highlight anchors, action kind, action target anchor, terminal business state, and flow id against `step-trace.json`; targeted eval-harness tests passed 23/23.

- observation: real run validation now rejects native capture claims unless adapter readiness is represented in the same run directory.
  evidence: `capture-readiness.json` is required under each real run directory, `screen-input-evidence.json` must point to it, and the validator requires native adapter kind, macos or windows platform, verified docs, screen recording, keyboard event logging, mouse event logging, redacted frame output, raw artifact ignore coverage, and an empty blockers list; targeted eval-harness tests passed 24/24 and CLI tests passed 9/9.

- observation: real run validation now requires reviewer signoff for each taught step, not just a run-level approval.
  evidence: `reviewer-checklist.md` must still contain `- accepted: true` and no `- rejected: true`, and it must now include `- <step-id>: accepted` for every step id in `step-trace.json`; targeted eval-harness tests passed 25/25 and CLI tests passed 9/9.

- observation: real run validation now rejects empty normalized capture manifests.
  evidence: `screen-input-evidence.json` still points to a manifest under `captures/normalized/`, and the validator now parses that manifest to require matching tool, local-only raw capture policy, hard-secret-redaction policy, screen recording, keyboard event log, mouse event log, sanitized raw artifact summaries without raw paths, redacted frame evidence under `captures/redacted/`, and per-step input evidence; targeted eval-harness tests passed 26/26 and CLI tests passed 9/9.

- observation: real run validation now grounds normalized manifest input evidence in the actual real step trace.
  evidence: the manifest validator reads `evals/runs/<tool>/<run-id>/step-trace.json` and requires `inputEvidence` entries for every traced step id, preventing a manifest from passing with partial or unrelated input evidence; targeted eval-harness tests passed 27/27.

- observation: real run validation now rejects screen-input frame evidence that is not listed in the normalized capture manifest.
  evidence: `screen-input-evidence.json` redacted frame paths are still checked for allowed shareable locations and existence, and are now also checked against the parsed manifest `redactedFrames` set; targeted eval-harness tests passed 28/28.

- observation: real run validation now rejects step traces that cite same-run non-frame artifacts as screen evidence.
  evidence: `step-trace.json` current frame paths must still exist under the run directory, and now must also point to `redacted-frame-*.png`; a regression using the existing same-run `failure-log.md` path fails validation; targeted eval-harness tests passed 29/29.

- observation: real run validation now rejects non-PNG redacted capture evidence even when screen-input evidence and the normalized manifest agree on the path.
  evidence: both `screen-input-evidence.json` redacted frame evidence paths and normalized manifest `redactedFrames[].path` entries must match `captures/redacted/<capture-id>/frame-*.png`; a regression using `captures/redacted/capture-real-odoo-001/frame-0001.json` fails validation; targeted eval-harness tests passed 30/30.

- observation: real run validation now rejects normalized manifest raw artifact summaries that leak local raw paths under alternate field names.
  evidence: raw artifact summaries may still prove kind, safety, and git policy, but path-like fields and values such as `rawPath: captures/raw/...` and `localPath: /Users/...` fail validation; targeted eval-harness tests passed 31/31.

- observation: real run validation now rejects normalized manifest input evidence that uses privileged or invented event records instead of captured mouse or keyboard events.
  evidence: every `inputEvidence[].inputEvents[]` entry must be an object with `kind` equal to `mouse` or `keyboard` and a non-empty `event`; fields containing api, backend, database, dom, mcp, or selector are rejected; targeted eval-harness tests passed 32/32.

- observation: real run validation now rejects per-step input evidence that does not include the traced action target anchor.
  evidence: the normalized manifest validator reads `step-trace.json` action target anchors and requires the matching `inputEvidence` entry to include the same `anchorId`; a regression using unrelated per-step mouse events fails validation; targeted eval-harness tests passed 33/33.

- observation: real run validation now rejects step traces whose visible text evidence does not match the referenced flow.
  evidence: `step-trace.json` entries must have empty `missingVisibleText`, and `expectedVisibleText` must equal the matching `flow.md` step's expected visible text; targeted eval-harness tests passed 34/34.

- observation: real run validation now rejects traces that claim recognition without matched visible text proving the same flow-visible strings were observed.
  evidence: `matchedVisibleText` must equal the matching `flow.md` step's expected visible text, not just be present or partial; targeted eval-harness tests passed 35/35.

- observation: real run validation now rejects outcome evidence whose completion counts are not backed by the same-run step trace.
  evidence: `outcome-evidence.json` `stepCount` and `stepsCompleted` must match the parsed `step-trace.json` count and successful step count; targeted eval-harness tests passed 36/36.

- observation: real run validation now rejects normalized capture manifests that belong to a different flow than the same-run flow evidence.
  evidence: normalized manifest `flowPath` and `flowId` must match `evals/runs/<tool>/<run-id>/flow-evidence.json`; targeted eval-harness tests passed 37/37.

- observation: real run validation now rejects unredacted forbidden strings in shareable run text and referenced normalized artifacts.
  evidence: `proof real-run` scans run JSON/Markdown text, referenced `flow.md`, and referenced normalized manifests for forbidden email addresses, password assignments, token assignments, api key assignments, and session secret assignments; targeted eval-harness tests passed 38/38.

- observation: real run validation now rejects terminal outcome evidence that does not name the terminal business state and terminal visible text from the referenced flow.
  evidence: `outcome-evidence.json` `terminalBusinessState`, `terminalExpectedVisibleText`, and `terminalMatchedVisibleText` must match the referenced `flow.md` terminal business state and terminal step success visible text; targeted eval-harness tests passed 39/39.

- observation: the cli real-run proof path enforces the same terminal outcome grounding as the eval-harness.
  evidence: the complete cli real-run fixture initially failed under the stricter `outcome-evidence.json` schema until it supplied terminal business state plus expected and matched terminal visible text from `flow.md`; targeted cli tests then passed 9/9.

- observation: real run validation now rejects step traces that expose overlay input automation.
  evidence: every real `step-trace.json` entry must set `overlayCanAutomateInput: false`, and fields such as `overlayAutomation` or automation command targets fail validation; targeted eval-harness tests passed 40/40 and targeted cli tests passed 9/9.

- observation: real run validation now rejects failure logs that contradict passing outcome evidence.
  evidence: `failure-log.md` must state `no failure observed` for a passing real run and must not contain false result lines for pass status, terminal state, zero human help, no invented steps, or no privileged access; targeted eval-harness tests passed 41/41 and targeted cli tests passed 9/9.

- observation: real run validation now rejects unsupported JSON evidence schema versions.
  evidence: `flow-evidence.json`, `capture-readiness.json`, `screen-input-evidence.json`, `outcome-evidence.json`, and referenced normalized manifests must use `schemaVersion: 1`; targeted eval-harness tests passed 42/42.

- observation: real run step traces are now versioned JSON documents instead of unversioned arrays.
  evidence: `step-trace.json` must contain `schemaVersion: 1` and a `steps` array; the real-run gate uses that same document reader for primary trace validation, flow grounding, reviewer signoff, manifest input grounding, and outcome count grounding; targeted eval-harness tests passed 42/42 and targeted cli tests passed 9/9.

- observation: full-goal status no longer trusts real-proof summary booleans unless the run directory evidence has been audited.
  evidence: `auditCaptureTeachGoalStatus` now requires real proofs to carry the validator-derived `runEvidenceAudited: true` marker; `loadRealToolProofEvidence` adds that marker only after `auditRealToolRunArtifacts` passes; targeted eval-harness tests passed 43/43.

## decision-log

- decision: use typescript, pnpm, and tauri-first.
  rationale: typescript fits app, eval, and orchestration work; tauri is the preferred desktop shell, with rust allowed only for native capture, overlay, or input hooks.
  date-author: 2026-06-20, initial artifact.

- decision: use deterministic mock user harness as v0 scripted stand-in.
  rationale: computer-use automation and playwright selectors are too capable or too privileged and could make an incomplete `flow.md` appear valid.
  date-author: 2026-06-20, initial artifact.

- decision: v0 redaction is hard secret redaction, not full pii classification.
  rationale: this creates a precise safety boundary without pretending to solve full compliance.
  date-author: 2026-06-20, initial artifact.

- decision: adapt ideas only from the local `teach` skill; do not fork or add a hard dependency.
  rationale: the skill's reusable value is teaching discipline and feedback loops, while onboardai needs screen-plus-input capture, hard redaction, normalized `flow.md`, no-automation overlay guidance, and deterministic eval proof.
  date-author: 2026-06-20, codex milestone 1.

- decision: use manual frontmatter and embedded JSON extraction for milestone 1 instead of adding markdown, yaml, or JSON schema parser dependencies.
  rationale: the first tests only need strict validation of the project contract; avoiding parser dependencies avoids unverified external-library behavior and keeps the diff minimal.
  date-author: 2026-06-20, codex milestone 1.

- decision: use Node v20's built-in test runner and TypeScript 5.9.3 as the initial verification stack.
  rationale: Context7 verified the relevant command behavior; this avoids extra test framework dependencies.
  date-author: 2026-06-20, codex milestone 1.

- decision: model fixture evals as screen-observation state machines with explicit manual action transitions.
  rationale: this keeps proof inside the allowed boundary: the harness reads `flow.md`, compares visible text in fixture observations, asks the overlay for text/highlight guidance, and applies only deterministic fixture input primitives with no DOM, selectors, APIs, backend access, MCP, LLM inference, embeddings, or vector database.
  date-author: 2026-06-20, codex fixture eval milestone.

- decision: fixture eval commands regenerate `flow.md` from senior demonstration records before running.
  rationale: this makes the proof exercise capture-to-normalized-flow behavior instead of relying on static hand-authored flow files.
  date-author: 2026-06-20, codex normalization milestone.

- decision: normalized capture manifests omit raw artifact paths and persist only raw artifact kind, safety, and git policy.
  rationale: raw captures are unsafe-to-share and git-ignored; shareable artifacts should prove that screen, keyboard, and mouse inputs existed without revealing local raw paths.
  date-author: 2026-06-20, codex manifest milestone.

- decision: keep the two-tool proof report explicit about unproven real-tool behavior.
  rationale: fixture eval success is meaningful but does not prove native capture, desktop overlay behavior, or real odoo/notion held-out evals.
  date-author: 2026-06-20, codex fixture proof milestone.

- decision: local fixture capture materialization writes explicit marker files, not fake native recordings.
  rationale: this proves local filesystem persistence and raw artifact policy without overstating native screen/input capture support.
  date-author: 2026-06-20, codex local capture adapter spike.

- decision: keep native capture behind an explicit readiness gate until official docs or Context7 verify every required input and persistence behavior.
  rationale: fixture proof should not silently upgrade into a native proof; a native adapter must show verified screen recording, keyboard logging, mouse logging, redacted frame output, raw artifact ignore policy, and zero blockers before it can be used as evidence.
  date-author: 2026-06-20, codex native capture readiness spike.

- decision: treat fixture eval observations as held-out from senior capture observations.
  rationale: the v0 proof should exercise a generated `flow.md` against a separate first-time-user screen sequence, rather than replaying the same frame paths that produced the flow.
  date-author: 2026-06-20, codex held-out fixture proof.

- decision: make `proof fixtures` fail from a structured audit, not only per-tool boolean results.
  rationale: a single audit object makes the proof contract explicit across both tools and catches missing held-out evidence, terminal visible text, reviewer signoff, human-help, invented-step, or privileged-access invariants before the Markdown report can claim success.
  date-author: 2026-06-20, codex fixture proof audit.

- decision: keep flow-library search local and parser-backed, with no embeddings or vector database.
  rationale: the proof needs flow retrieval from local `flow.md` files while preserving the explicit no-embedding/no-vector constraint; scoring parsed flow fields gives deterministic ranking without adding infrastructure.
  date-author: 2026-06-21, codex flow search ranking.

- decision: tag manifest frame references as business-sensitive instead of hard-redacting them.
  rationale: the project contract allows file paths and business record ids to remain local when tagged; redacted-frame references are useful evidence, but local absolute paths and embedded record ids must be marked before a normalized manifest is considered shareable.
  date-author: 2026-06-21, codex manifest business-sensitive tagging.

- decision: materialize fixture frame artifacts as tiny PNG evidence markers.
  rationale: the fixture proof should not reference absent frames; until native capture exists, committed marker PNGs make the redacted-frame and held-out-frame evidence paths concrete while the reports continue to state they are not real target-tool recordings.
  date-author: 2026-06-21, codex fixture frame materialization.

- decision: validate anchor grounding inside the `flow.md` parser instead of relying on overlay rendering to drop missing highlights.
  rationale: malformed teaching artifacts should be rejected before they reach eval or user-facing overlay guidance; this keeps overlay behavior grounded in captured redacted frame evidence and prevents invented target references.
  date-author: 2026-06-21, codex flow anchor grounding.

- decision: fold shareable evidence path checks into the existing proof audit rather than adding a separate script.
  rationale: the command that claims fixture proof should fail if any referenced flow, manifest, redacted frame, held-out frame, eval artifact, report, or reviewer checklist path is missing, absolute, outside allowed evidence locations, or points at raw/unsafe/tmp capture material.
  date-author: 2026-06-21, codex evidence path audit.

- decision: write full-goal status separately from fixture proof status.
  rationale: fixture proof is useful v0 evidence but cannot satisfy the objective; a separate machine-readable status keeps the missing real odoo/notion held-out eval and native screen-plus-input capture requirements visible even when fixture proof passes.
  date-author: 2026-06-21, codex full-goal status audit.

- decision: load real target-tool proof from explicit JSON summaries under `evals/reports/`.
  rationale: full-goal proof should have a deterministic local filesystem ingestion point for real odoo/notion evidence, while the summary remains only a pointer to required run artifacts under `/evals/runs` and cannot stand in for missing native screen-plus-input evidence.
  date-author: 2026-06-21, codex real-proof ingestion contract.

- decision: store real eval templates under `evals/templates/` instead of the live summary paths.
  rationale: future odoo/notion runs need exact copyable artifacts, but placing placeholders at `evals/reports/real-tool-proof-*.json` would make the CLI ingest them as attempted real evidence and blur fixture proof from full-goal proof.
  date-author: 2026-06-21, codex real-eval preparation.

- decision: require real proof summary `evidencePath` values to point at `evals/runs/<tool>/<run-id>/step-trace.json`.
  rationale: the proof summary is still only a pointer, but it must target the matching tool's run trace and cannot point to reports, raw captures, unrelated tool runs, or arbitrary files.
  date-author: 2026-06-21, codex real-eval preparation.

- decision: derive real run artifact requirements from the proof summary's `evidencePath` instead of adding fields to `real-tool-proof-*.json`.
  rationale: this preserves the existing proof summary contract while preventing a summary file alone from counting as real proof; all native screen-plus-input evidence must live in the matching run directory.
  date-author: 2026-06-21, codex real-run artifact gate.

- decision: use `screen-input-evidence.json` as the shareable native capture evidence manifest for real runs.
  rationale: raw recordings and local input logs stay unsafe-to-share and git-ignored, but the real run still needs a machine-checkable shareable statement that native screen recording, keyboard events, mouse events, redaction, clean data, and no privileged access were verified.
  date-author: 2026-06-21, codex real-run artifact gate.

- decision: validate filled real run directories with an explicit CLI dry run before creating summary proof files.
  rationale: operators need a safe local check that uses the final artifact gate without accidentally making `evals/reports/real-tool-proof-*.json` appear as completed evidence.
  date-author: 2026-06-21, codex real-run validation CLI.

- decision: inspect real `step-trace.json` and reviewer checklist contents inside the same artifact gate.
  rationale: a run directory with placeholder files should not count as real proof; the gate must see successful overlay guidance, high-confidence grounded highlights, manual-only actions, held-out frame evidence, and accepted senior signoff before a proof summary can load.
  date-author: 2026-06-21, codex real-run content validation.

- decision: require `outcome-evidence.json` for real run-level pass criteria.
  rationale: the live proof summary booleans should be backed by machine-checkable local evidence for terminal state, completion, zero human help, no invented steps, no privileged access, held-out eval evidence, and reviewer signoff before the summary is loaded.
  date-author: 2026-06-21, codex real-run outcome validation.

- decision: make outcome evidence point to exact same-run artifacts instead of accepting arbitrary shareable paths.
  rationale: the outcome artifact should ground the summary in the run directory that produced it; allowing raw, absolute, temporary, traversal, or other-run evidence paths would let a summary claim success from evidence outside the held-out eval.
  date-author: 2026-06-21, codex real-run outcome validation.

- decision: keep `proof real-run` read-only by default and require `--write-summary` to create live real-proof summary files.
  rationale: operators need a safe dry run while preparing real odoo/notion evidence; summary creation should be explicit and still blocked by the same local filesystem evidence gate.
  date-author: 2026-06-21, codex real-proof summary writer.

- decision: make `proof status` exit non-zero until the full objective is actually proven.
  rationale: a status command that returns success for fixture-only proof would invite overclaiming; CI and operators should see failure until both real odoo and real notion held-out runs pass with native screen-plus-input evidence.
  date-author: 2026-06-21, codex full-goal status command.

- decision: initialize real-run skeletons from templates but never create binary evidence or live proof summaries during init.
  rationale: setup should be easy for a future held-out odoo/notion run, but final-screen frames, eval recordings, redacted evidence, and accepted reviewer/outcome data must come from the actual run and remain validated by `proof real-run`.
  date-author: 2026-06-21, codex real-run init command.

- decision: keep the shareable safety scan text-only and explicit about skipped binary evidence.
  rationale: committed text artifacts can be reliably scanned for forbidden secret strings and unsafe path leaks in TypeScript without new dependencies; screenshots and recordings still need the redaction/native evidence pipeline because text scanning binary media would be misleading.
  date-author: 2026-06-21, codex shareable scan command.

- decision: require `flow-evidence.json` for real runs instead of trusting trace messages alone.
  rationale: a non-empty overlay message does not prove the overlay was grounded in `flow.md`; comparing the real run trace to the referenced flow prevents invented steps, invented highlights, or mismatched action targets from being loaded as real proof.
  date-author: 2026-06-21, codex real-run flow grounding.

- decision: require `capture-readiness.json` for real runs instead of trusting native-capture booleans alone.
  rationale: the proof summary and screen-input manifest should not be able to claim native screen-plus-input capture without same-run evidence that the adapter was native, docs-verified, had screen/keyboard/mouse coverage, emitted redacted frames, kept raw artifacts ignored, and had no blockers.
  date-author: 2026-06-21, codex native capture readiness evidence.

- decision: make real-run reviewer signoff step-specific.
  rationale: the objective requires senior reviewer signoff for each taught step; a checklist with only a run-level `accepted: true` can hide an unreviewed or disputed step, so the artifact gate now compares reviewer acceptance lines to the actual step trace ids.
  date-author: 2026-06-21, codex per-step reviewer signoff.

- decision: parse real-run normalized capture manifests instead of trusting their paths.
  rationale: a real proof run must demonstrate screen-plus-input capture evidence, not merely reference a file named `manifest.json`; requiring sanitized raw artifact summaries, redacted frames, and per-step input evidence closes the gap where an empty manifest could satisfy the path gate.
  date-author: 2026-06-21, codex normalized manifest evidence.

- decision: ground manifest input evidence against the real step trace.
  rationale: screen-plus-input proof has to cover the taught workflow, not just prove that some input events existed; comparing manifest `inputEvidence` step ids to `step-trace.json` prevents partial capture evidence from passing as a complete real run.
  date-author: 2026-06-21, codex manifest input coverage.

- decision: cross-check screen-input redacted frames with the normalized capture manifest.
  rationale: real proof should not be able to cite arbitrary redacted frame files that happen to exist; the frame evidence used for native screen-plus-input claims must be part of the normalized capture manifest for the same run.
  date-author: 2026-06-21, codex manifest frame cross-check.

- decision: require step-trace frame evidence to be a same-run redacted PNG.
  rationale: a path under `evals/runs/<tool>/<run-id>/` proves only location, not screen evidence; requiring `redacted-frame-*.png` prevents arbitrary same-run JSON, Markdown, or log files from standing in for the frame the overlay saw.
  date-author: 2026-06-21, codex step frame evidence gate.

- decision: require redacted capture evidence paths to use the `frame-*.png` convention.
  rationale: matching a path prefix is not enough to prove that a manifest or screen-input artifact cites a redacted screen frame; requiring `captures/redacted/<capture-id>/frame-*.png` prevents unrelated shareable files under the redacted tree from being counted as frame evidence.
  date-author: 2026-06-21, codex redacted frame type gate.

- decision: reject raw artifact path leaks by key and value shape.
  rationale: a manifest field named `rawPath`, `localPath`, or another path-like key can leak the same unsafe raw capture location as a literal `path` field; normalized raw artifact summaries must stay summary-only and must not persist local raw locations.
  date-author: 2026-06-21, codex raw artifact path leak gate.

- decision: validate normalized input event evidence as observed mouse or keyboard events.
  rationale: per-step input evidence should prove screen-plus-input capture, not privileged access; rejecting api, backend, database, dom, mcp, and selector fields prevents a manifest from satisfying the input-evidence gate with hidden tool state or automation handles.
  date-author: 2026-06-22, codex input event evidence gate.

- decision: ground normalized input evidence in the traced action target anchor.
  rationale: a mouse or keyboard event for the right step can still be unrelated to the taught action; comparing input event `anchorId` values to `step-trace.json` action target anchors prevents unrelated input logs from satisfying the screen-plus-input proof.
  date-author: 2026-06-22, codex input target grounding gate.

- decision: ground real step visible text evidence in `flow.md`.
  rationale: a real proof should not pass when the trace claims screen recognition but the visible text evidence differs from the taught screen state or still reports missing expected text.
  date-author: 2026-06-22, codex visible text grounding gate.

- decision: require matched visible text to equal the flow expected visible text.
  rationale: empty `missingVisibleText` is not enough evidence by itself; the trace must also show that every flow-required visible string was actually matched on the observed screen frame.
  date-author: 2026-06-22, codex matched visible text gate.

- decision: cross-check outcome completion counts against `step-trace.json`.
  rationale: run-level outcome evidence should summarize the same held-out trace, not independently claim a larger or different completed workflow.
  date-author: 2026-06-22, codex outcome trace count gate.

- decision: ground normalized capture manifests in same-run flow evidence.
  rationale: screen-plus-input evidence must prove the senior demonstration for the `flow.md` that taught the eval, not an unrelated capture manifest with similar-looking step ids.
  date-author: 2026-06-22, codex manifest flow grounding gate.

- decision: make the real-run gate enforce hard-redaction on shareable text artifacts.
  rationale: a real proof summary should not be writable from a run directory whose local JSON, Markdown, `flow.md`, or normalized manifest still contains forbidden email or secret strings.
  date-author: 2026-06-22, codex real-run text redaction gate.

- decision: ground terminal outcome text in the referenced `flow.md`.
  rationale: an empty terminal missing-text list is not enough evidence; the outcome artifact must state which terminal business state and terminal visible strings were expected and observed.
  date-author: 2026-06-22, codex terminal outcome grounding gate.

- decision: require explicit non-automation evidence in real step traces.
  rationale: `manualOnly: true` on the user action is not enough to prove the overlay did not also expose click, type, submit, approve, delete, or mutation commands; each real trace step must record that overlay input automation is unavailable and must not contain overlay automation command fields.
  date-author: 2026-06-22, codex real-run overlay non-automation gate.

- decision: treat the failure log as run-level evidence, not just prose.
  rationale: a passing outcome JSON should not override a same-run failure log that says the run failed, required human help, invented steps, missed the terminal state, or used privileged access.
  date-author: 2026-06-22, codex real-run failure-log consistency gate.

- decision: require explicit schema versions for real-run JSON evidence.
  rationale: a run directory should not pass with stale or ad hoc JSON shapes that happen to contain a few expected fields; the validator and templates should agree on the artifact schema version before loading proof.
  date-author: 2026-06-22, codex real-run schema-version gate.

- decision: make `step-trace.json` a versioned document with `steps`.
  rationale: the step trace is the primary real-run evidence artifact and should follow the same versioned JSON contract as the other run evidence files; keeping it as an unversioned array made the schema-version gate incomplete.
  date-author: 2026-06-22, codex real-run step-trace schema gate.

- decision: keep `runEvidenceAudited` as a derived validator marker, not a real-proof summary field.
  rationale: an operator-written summary should not be able to self-attest that run-directory evidence was checked; the marker is added only after the validator reads and accepts the referenced evidence artifacts.
  date-author: 2026-06-22, codex audited real-proof status gate.

## outcomes-and-retrospective

milestone 1 in progress.

current evidence:

- capture changes: added `packages/capture` raw artifact model and a git-ignore test proving raw/unsafe/tmp capture paths and common unsafe artifacts are ignored; added senior-demonstration normalization to shareable `flow.md` with redaction before persistence; added normalized capture manifests for redacted frame and input evidence without raw path leakage and with business-sensitive tagging; added local fixture capture materialization for raw screen/input marker artifacts; materialized shareable redacted-frame marker PNGs for fixture proof; added native capture readiness checks that fail closed until docs and all capture inputs are verified.
- redaction changes: added `packages/redaction` hard-redaction for emails, password assignments, token-like values, api keys, and session secrets, plus business-sensitive tagging for urls, paths, and record ids.
- flow changes: added `packages/flow` parser/validator for yaml frontmatter and embedded JSON step blocks, with validation for required fields, confidence threshold, unsafe anchor paths, per-step anchor grounding, manual-only action, exact fail-closed message, and forbidden persisted secrets; added ranked local flow search over parsed flow evidence.
- overlay changes: added `packages/overlay` guidance renderer that only returns text/highlight guidance, never input automation, and fails closed below `0.75`.
- eval harness changes: added `packages/eval-harness` policy guard forbidding llm inference, dom, selectors, apis, backend, database, and target-tool mcp access; added screen-state matching from visible text and deterministic eval execution; added explicit terminal visible-text verification and held-out status in eval results; added machine-readable proof audit across both required tools; added shareable evidence path auditing for missing, unsafe, absolute, or disallowed artifact references; added full-goal status auditing and real-proof summary parsing that remain false until real odoo and notion proof evidence exists; added real run artifact auditing for required run files, `capture-readiness.json`, `screen-input-evidence.json`, `step-trace.json`, `reviewer-checklist.md`, and `outcome-evidence.json`; added per-step reviewer signoff checks against the actual real-run trace ids; added normalized capture manifest content validation, real-step input coverage checks, redacted-frame cross-checking, step current-frame PNG checks, redacted capture frame type checks, raw artifact path-leak checks, mouse/keyboard-only input event checks, input target-anchor grounding, matched visible-text grounding, outcome count grounding, manifest flow grounding, shareable text redaction checks, terminal outcome text grounding, overlay non-automation trace grounding, failure-log consistency checks, schema-version checks, versioned step-trace document parsing, and derived run-evidence-audited full-goal status checks for real runs.
- real eval preparation changes: added a real odoo/notion eval runbook for clean seeded setup, senior capture, naive-user held-out eval, reviewer signoff, and no-privileged-access boundaries; added copyable templates for proof summaries, real run step traces, real run failure logs, real run reviewer checklists, flow evidence, native capture readiness evidence, screen/input evidence, and outcome evidence under `evals/templates/`; tightened proof-summary parsing so incomplete summaries and wrong-tool evidence paths are rejected; wired CLI real proof ingestion so incomplete run directories are not loaded as proof; added `proof real-run` dry-run validation for filled real run directories, guarded `--write-summary` creation for accepted real runs, and `proof real-run init` skeleton setup that remains non-passing until evidence is filled.
- fixture changes: added odoo-like and notion-like fixture contracts with visible starting text, separate capture and held-out eval observations, four eval screen observations each, three manual transitions each, and terminal business states.
- cli changes: added `@onboardai/cli` commands for flow validation/search, deterministic eval evidence generation, shareable fixture frame materialization, audited two-tool fixture proof, guarded real-run summary creation, full-goal proof status, real-run skeleton initialization, and shareable artifact safety scanning.
- proof changes: added `pnpm proof:fixtures`, `pnpm proof:status`, `pnpm proof:scan`, `evals/reports/two-tool-fixture-proof.md`, `evals/reports/fixture-proof-audit.json`, and `evals/reports/full-goal-proof-status.json` to compare both fixture evals, machine-check the proof invariants, audit shareable evidence path integrity, scan shareable text artifacts for safety leaks, separate fixture proof from full-goal proof, ingest optional real-proof summaries, and record limitations.

what the eval showed:

- odoo fixture teaching eval passed from a generated normalized flow against held-out eval observations: 3/3 steps, completion rate 1, terminal expected visible text `demo opportunity, stage, qualified, saved`, no terminal missing text, no human help, no privileged access, no invented steps, reviewer checklist accepted.
- notion fixture teaching eval passed from a generated normalized flow against held-out eval observations: 3/3 steps, completion rate 1, terminal expected visible text `demo task, status, ready for review`, no terminal missing text, no human help, no privileged access, no invented steps, reviewer checklist accepted.
- latest targeted eval-harness test suite passed: 42 tests, 42 pass, 0 fail.
- latest targeted cli test suite passed: 9 tests, 9 pass, 0 fail.
- latest full test suite passed: 77 tests, 77 pass, 0 fail.
- latest flow validation passed: 2 flow files validated.
- latest fixture proof passed: 2/2 tool-like fixture evals.
- latest proof status command exited 1 as expected because the full goal is not proven: real-tool proof failed 0/2 tools with missing real held-out teaching eval evidence and missing native screen-plus-input capture evidence for both odoo and notion.
- latest full-goal status remains unproven: `fullGoalProven: false`, `fixtureProofPassed: true`, `realToolProofPassed: false`, `realToolProofs: 0`, `missingRealToolProofs: 2`.
- latest live real-proof summary check found `evals/reports/real-tool-proof-odoo.json` absent and `evals/reports/real-tool-proof-notion.json` absent.
- latest shareable artifact safety scan passed: 24 text files scanned with no forbidden secret/email or raw/unsafe/tmp path findings.
- latest git-ignore check confirmed `captures/raw/example/screen-recording.mp4`, `captures/unsafe/example.txt`, and `captures/tmp/example.txt` are ignored.
- real-eval preparation does not add real target-tool evidence. It does not prove native screen recording, native keyboard logging, native mouse logging, real overlay behavior, real first-time-user completion, or real senior signoff on odoo or notion.

completion rate:

- milestone 1 requested tests: 6 of 6 requested behavioral test groups are covered and passing.
- fixture eval proof: 2 of 2 tool-like fixture evals have passed.
- real-tool proof: 0 of 2 real target-tool evals have passed because real odoo and notion environments are not available in this repo yet.
- real-eval preparation: 0 of 2 real target-tool evals have been run; templates remain preparation artifacts only.

where the user or harness got stuck:

- no fixture stuck point. Both deterministic fixture runs reached terminal state.

which step the overlay misread:

- none in fixture evals. All overlay confidence values were `1` and every highlight was grounded in the current step's `flow.md` anchor.

next best experiment:

- initialize a real run with `proof real-run init <tool> <run-id>`, run the real-eval runbook once against a clean seeded odoo sandbox or a clean seeded notion workspace using native screen-plus-input capture, fill the run directory including `flow-evidence.json`, `capture-readiness.json`, and per-step reviewer acceptance lines, run `proof real-run`, then run `proof real-run --write-summary` only after the dry run passes and senior signoff is complete.

at completion, record:

- whether both tools passed
- completion rate per tool
- stuck points per tool
- overlay misreads per tool
- secret-redaction failures, if any
- whether the system proved tool-agnostic behavior
- what remains unsafe or unproven

## context-and-orientation

the repo now exists on branch `codex/capture-teach-foundation`. the first scaffold commit is `d0471af`.

expected top-level structure:

```text
onboardai/
  agents.md
  codex-goal.md
  codex-kickoff-prompt.md
  package.json
  pnpm-workspace.yaml
  .gitignore
  .agent/
    plans.md
    execplans/
      capture-teach-loop.md
  apps/
    desktop/
  packages/
    capture/
    redaction/
    flow/
    overlay/
    eval-harness/
    fixtures/
    cli/
  docs/
    product-brief.md
    safety-policy.md
    eval-protocol.md
    flow-format.md
    repo-structure.md
    context7-policy.md
    eval-fixtures.md
  evals/
    runs/
    reports/
    reviewer-checklists/
  captures/
    raw/
    redacted/
    normalized/
```

## plan-of-work

### phase 0 - foundation

1. run `git init`.
2. create `.gitignore`.
3. create pnpm workspace.
4. add minimal typescript config.
5. add empty packages.
6. add test runner.
7. add lint and format commands.
8. run baseline commands and record results.

expected evidence:

- `git status` shows repo initialized
- `pnpm install` succeeds
- `pnpm test` succeeds, even if only placeholder tests exist
- raw capture paths are ignored by git

### phase 1 - teach engine inspection

1. inspect `mattpocock/teach`.
2. summarize architecture, state model, teaching loop, reusable primitives, license, and integration cost.
3. choose exactly one path:
   - fork
   - adapt ideas only
   - ignore
4. record the decision and rationale.
5. do not introduce a hard dependency before the decision.

expected evidence:

- written inspection note under `docs/`
- decision recorded in this execplan
- no unreviewed hard dependency

### phase 2 - flow format and search

1. define `flow.md` schema.
2. implement parser and validator.
3. validate yaml frontmatter.
4. validate embedded json step blocks.
5. implement flow library search with filesystem search plus optional llm ranking.
6. expose search through cli.
7. reject embeddings and vector db.

expected evidence:

- invalid flow fixtures fail
- valid flow fixtures pass
- `pnpm onboardai flow search <query>` returns matching flows
- search uses local text files and ripgrep where available

### phase 3 - capture and redaction

1. define capture artifact model.
2. store raw capture locally under ignored path.
3. mark raw capture unsafe-to-share.
4. extract representative frames.
5. hard-redact forbidden secrets and email addresses.
6. tag business-sensitive fields without removing them.
7. persist redacted frames and normalized capture metadata.

expected evidence:

- tests inject fake secrets and prove they do not persist in redacted artifacts
- raw capture path is ignored
- redacted output exists and references original unsafe capture by local id only

### phase 4 - overlay

1. implement screen-state matcher.
2. emit confidence score for current screen state.
3. read next instruction only from `flow.md`.
4. highlight anchored screen regions when confidence is at least `0.75`.
5. show fail-closed message below threshold.
6. ensure no input automation exists.

expected evidence:

- test proves overlay cannot display invented steps
- test proves below-threshold behavior
- test proves no click or typing primitive is exposed from overlay package

### phase 5 - deterministic eval harness

1. define fixture screen model.
2. define low-level input primitives.
3. let harness read `flow.md`.
4. let harness receive screen observations.
5. make harness fail on ambiguity.
6. block llm inference, dom, selectors, apis, backend, and mcp.

expected evidence:

- ambiguous fixture fails
- complete explicit flow passes
- incomplete flow fails
- eval report records step trace and final state

### phase 6 - odoo eval

1. create clean seeded odoo-like fixture.
2. capture or synthesize a senior demonstration against the fixture.
3. normalize to `flow.md`.
4. run deterministic held-out eval.
5. record report, trace, recording, failure log if any, and reviewer checklist.

expected evidence:

- odoo eval passes end-to-end
- no api, dom, selector, or backend evidence appears
- senior reviewer can confirm correctness from artifacts

### phase 7 - notion eval

1. create clean seeded notion-like fixture.
2. capture or synthesize a senior demonstration against the fixture.
3. normalize to `flow.md`.
4. run deterministic held-out eval.
5. record report, trace, recording, failure log if any, and reviewer checklist.

expected evidence:

- notion eval passes end-to-end
- no api, dom, selector, or backend evidence appears
- senior reviewer can confirm correctness from artifacts

### phase 8 - two-tool proof

1. compare both evals.
2. identify shared teaching primitives.
3. identify tool-specific exceptions.
4. prove no tool-specific shortcut is required.
5. write final report.

expected evidence:

- both evals pass
- completion rate is recorded
- stuck points and overlay misreads are recorded
- final report separates confirmed capability from unproven claims

## acceptance criteria

the goal is complete only when all are true:

- `flow.md` schema exists and validates
- multiple captured flows are supported
- raw captures are local, unsafe-to-share, and git-ignored
- forbidden secrets are hard-redacted before shareable persistence
- overlay reads only from `flow.md`
- overlay highlights screen regions
- overlay never automates clicks or typing
- overlay fails closed below confidence `0.75`
- deterministic harness exists and passes explicit fixtures
- deterministic harness fails ambiguous fixtures
- odoo held-out teaching eval passes
- notion held-out teaching eval passes
- senior reviewer evidence exists for both
- final report states limitations honestly

## commands

initial expected commands:

```sh
git init
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm onboardai flow validate examples/flows
pnpm onboardai flow search "create"
pnpm onboardai eval run odoo
pnpm onboardai eval run notion
```

actual milestone 1 commands:

```sh
git init
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm flow:validate
```

results on 2026-06-20:

- `git init`: passed after escalated filesystem approval; initialized `/Users/mc/Desktop/onboardai/.git/`.
- sandboxed `pnpm install`: failed with npm registry DNS errors.
- escalated `pnpm install`: passed; installed `typescript@5.9.3`, `@types/node@20.19.24`, and transitive `undici-types`.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- first `pnpm test`: failed because the CLI test invoked `node dist/index.js` from the repo root; fixed by setting the test cwd to the CLI package root.
- second `pnpm test`: passed; 11 tests, 11 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 0 flow files.

fixture eval milestone commands:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm flow:validate
pnpm eval:odoo
pnpm eval:notion
rg -n "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|password\\s*[:=]|token\\s*[:=]|api[_-]?key\\s*[:=]|session[_-]?secret\\s*[:=]" flows evals captures --glob "!**/*.mp4" -i
```

latest results on 2026-06-20 before final verification rerun:

- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 16 tests, 16 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 flow files.
- first `pnpm eval:odoo` and `pnpm eval:notion`: failed due CLI resolving flow paths from `packages/cli`; fixed by locating the workspace root from `pnpm-workspace.yaml`.
- second `pnpm eval:odoo`: passed; 3/3 steps.
- second `pnpm eval:notion`: passed; 3/3 steps.
- artifact secret scan across `flows`, `evals`, and `captures`: no matches.

current eval artifacts:

```text
evals/runs/odoo/fixture-odoo-qualify-001/step-trace.json
evals/runs/odoo/fixture-odoo-qualify-001/final-screen.png
evals/runs/odoo/fixture-odoo-qualify-001/eval-recording.mp4
evals/runs/odoo/fixture-odoo-qualify-001/failure-log.md
evals/reports/odoo-fixture-odoo-qualify-001.md
evals/reviewer-checklists/odoo-fixture-odoo-qualify-001.md
evals/runs/notion/fixture-notion-ready-review-001/step-trace.json
evals/runs/notion/fixture-notion-ready-review-001/final-screen.png
evals/runs/notion/fixture-notion-ready-review-001/eval-recording.mp4
evals/runs/notion/fixture-notion-ready-review-001/failure-log.md
evals/reports/notion-fixture-notion-ready-review-001.md
evals/reviewer-checklists/notion-fixture-notion-ready-review-001.md
captures/normalized/capture-fixture-odoo-qualify-001/manifest.json
captures/normalized/capture-fixture-notion-ready-review-001/manifest.json
evals/reports/two-tool-fixture-proof.md
```

real eval preparation commands:

```sh
pnpm --filter @onboardai/eval-harness test
pnpm lint
pnpm typecheck
pnpm test
pnpm flow:validate
pnpm proof:fixtures
rg -n "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|password\\s*[:=]|token\\s*[:=]|api[_-]?key\\s*[:=]|session[_-]?secret\\s*[:=]" flows evals captures/normalized captures/redacted --glob "!**/*.mp4" -i
rg -n "captures/(raw|unsafe|tmp)/" flows evals captures/normalized captures/redacted --glob "!**/*.mp4"
git check-ignore captures/raw/example/screen-recording.mp4 captures/unsafe/example.txt captures/tmp/example.txt
```

results on 2026-06-21:

- `pnpm --filter @onboardai/eval-harness test`: passed; 17 tests, 17 pass, 0 fail.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 45 tests, 45 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 flow files.
- `pnpm proof:fixtures`: passed; fixture proof passed 2/2 tools.
- full-goal status after `pnpm proof:fixtures`: `fullGoalProven: false`, `fixtureProofPassed: true`, `realToolProofPassed: false`, `realToolProofs: 0`, `missingRealToolProofs: 2`.
- forbidden secret and email scan across `flows`, `evals`, `captures/normalized`, and `captures/redacted`: no matches; `rg` exited 1 because no matches were found.
- unsafe capture reference scan across shareable artifacts: no matches; `rg` exited 1 because no matches were found.
- `git check-ignore` for sample `captures/raw`, `captures/unsafe`, and `captures/tmp` paths: passed; all sample paths are ignored.

real run artifact gate commands:

```sh
pnpm --filter @onboardai/eval-harness test
pnpm --filter @onboardai/cli test
pnpm lint
pnpm typecheck
pnpm test
pnpm flow:validate
pnpm proof:fixtures
node -e "for (const p of ['evals/templates/reports/real-tool-proof-odoo.json','evals/templates/reports/real-tool-proof-notion.json','evals/templates/runs/tool-run-id/step-trace.json','evals/templates/runs/tool-run-id/screen-input-evidence.json']) { JSON.parse(require('fs').readFileSync(p,'utf8')); console.log('valid json: '+p); }"
rg -n "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|password\\s*[:=]|token\\s*[:=]|api[_-]?key\\s*[:=]|session[_-]?secret\\s*[:=]" flows evals captures/normalized captures/redacted --glob "!**/*.mp4" -i
rg -n "captures/(raw|unsafe|tmp)/" flows evals captures/normalized captures/redacted --glob "!**/*.mp4"
git check-ignore captures/raw/example/screen-recording.mp4 captures/unsafe/example.txt captures/tmp/example.txt
```

results on 2026-06-21:

- `pnpm --filter @onboardai/eval-harness test`: passed; 20 tests, 20 pass, 0 fail.
- `pnpm --filter @onboardai/cli test`: passed; 2 tests, 2 pass, 0 fail.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 48 tests, 48 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 flow files.
- `pnpm proof:fixtures`: passed; fixture proof passed 2/2 tools.
- JSON template validation: passed for odoo proof summary, notion proof summary, step trace, and screen-input evidence templates.
- full-goal status after `pnpm proof:fixtures`: `fullGoalProven: false`, `fixtureProofPassed: true`, `realToolProofPassed: false`, `realToolProofs: 0`, `missingRealToolProofs: 2`.
- forbidden secret and email scan across `flows`, `evals`, `captures/normalized`, and `captures/redacted`: no matches; `rg` exited 1 because no matches were found.
- unsafe capture reference scan across shareable artifacts: no matches; `rg` exited 1 because no matches were found.
- `git check-ignore` for sample `captures/raw`, `captures/unsafe`, and `captures/tmp` paths: passed; all sample paths are ignored.

real run validation CLI commands:

```sh
pnpm --filter @onboardai/cli test
pnpm lint
pnpm typecheck
pnpm test
pnpm flow:validate
pnpm proof:fixtures
node packages/cli/dist/index.js proof real-run odoo missing-real-run-smoke
rg -n "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|password\\s*[:=]|token\\s*[:=]|api[_-]?key\\s*[:=]|session[_-]?secret\\s*[:=]" flows evals captures/normalized captures/redacted --glob "!**/*.mp4" -i
rg -n "captures/(raw|unsafe|tmp)/" flows evals captures/normalized captures/redacted --glob "!**/*.mp4"
git check-ignore captures/raw/example/screen-recording.mp4 captures/unsafe/example.txt captures/tmp/example.txt
```

results on 2026-06-21:

- `pnpm --filter @onboardai/cli test`: passed; 4 tests, 4 pass, 0 fail.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 50 tests, 50 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 flow files.
- `pnpm proof:fixtures`: passed; fixture proof passed 2/2 tools.
- `node packages/cli/dist/index.js proof real-run odoo missing-real-run-smoke`: failed closed as expected with missing `step-trace.json`, `final-screen.png`, `eval-recording.mp4`, `failure-log.md`, `reviewer-checklist.md`, and `screen-input-evidence.json` findings.
- full-goal status after `pnpm proof:fixtures`: `fullGoalProven: false`, `fixtureProofPassed: true`, `realToolProofPassed: false`, `realToolProofs: 0`, `missingRealToolProofs: 2`.
- forbidden secret and email scan across `flows`, `evals`, `captures/normalized`, and `captures/redacted`: no matches; `rg` exited 1 because no matches were found.
- unsafe capture reference scan across shareable artifacts: no matches; `rg` exited 1 because no matches were found.
- `git check-ignore` for sample `captures/raw`, `captures/unsafe`, and `captures/tmp` paths: passed; all sample paths are ignored.

real run content validation commands:

```sh
pnpm --filter @onboardai/eval-harness test
pnpm --filter @onboardai/cli test
pnpm lint
pnpm typecheck
pnpm test
pnpm flow:validate
pnpm proof:fixtures
rg -n "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|password\\s*[:=]|token\\s*[:=]|api[_-]?key\\s*[:=]|session[_-]?secret\\s*[:=]" flows evals captures/normalized captures/redacted --glob "!**/*.mp4" -i
rg -n "captures/(raw|unsafe|tmp)/" flows evals captures/normalized captures/redacted --glob "!**/*.mp4"
git check-ignore captures/raw/example/screen-recording.mp4 captures/unsafe/example.txt captures/tmp/example.txt
```

results on 2026-06-21:

- `pnpm --filter @onboardai/eval-harness test`: passed; 21 tests, 21 pass, 0 fail.
- `pnpm --filter @onboardai/cli test`: passed; 4 tests, 4 pass, 0 fail.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 51 tests, 51 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 flow files.
- `pnpm proof:fixtures`: passed; fixture proof passed 2/2 tools.
- full-goal status after `pnpm proof:fixtures`: `fullGoalProven: false`, `fixtureProofPassed: true`, `realToolProofPassed: false`, `realToolProofs: 0`, `missingRealToolProofs: 2`.
- forbidden secret and email scan across `flows`, `evals`, `captures/normalized`, and `captures/redacted`: no matches; `rg` exited 1 because no matches were found.
- unsafe capture reference scan across shareable artifacts: no matches; `rg` exited 1 because no matches were found.
- `git check-ignore` for sample `captures/raw`, `captures/unsafe`, and `captures/tmp` paths: passed; all sample paths are ignored.

capture-normalization milestone commands:

```sh
pnpm capture:normalize:odoo
pnpm capture:normalize:notion
pnpm lint
pnpm typecheck
pnpm test
pnpm flow:validate
pnpm eval:odoo
pnpm eval:notion
rg -n "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|password\\s*[:=]|token\\s*[:=]|api[_-]?key\\s*[:=]|session[_-]?secret\\s*[:=]" flows evals captures --glob "!**/*.mp4" -i
```

latest results on 2026-06-20:

- `pnpm capture:normalize:odoo`: passed; generated `flows/odoo/qualify-opportunity.flow.md`.
- `pnpm capture:normalize:notion`: passed; generated `flows/notion/update-task-status.flow.md`.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- first `pnpm test` after normalization: failed because generated steps used `targetAnchorId` instead of `target-anchor-id`; fixed serializer.
- second `pnpm test`: passed; 20 tests, 20 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 generated flow files.
- `pnpm eval:odoo`: passed; 3/3 steps.
- `pnpm eval:notion`: passed; 3/3 steps.
- artifact secret scan across `flows`, `evals`, and `captures`: no matches.

normalized capture manifest milestone commands:

```sh
pnpm capture:normalize:odoo
pnpm capture:normalize:notion
pnpm lint
pnpm typecheck
pnpm test
pnpm flow:validate
pnpm eval:odoo
pnpm eval:notion
rg -n "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|password\\s*[:=]|token\\s*[:=]|api[_-]?key\\s*[:=]|session[_-]?secret\\s*[:=]" flows evals captures --glob "!**/*.mp4" -i
rg -n "captures/(raw|unsafe|tmp)/" flows evals captures/normalized --glob "!**/*.mp4"
```

latest results on 2026-06-20:

- `pnpm capture:normalize:odoo`: passed; generated `flows/odoo/qualify-opportunity.flow.md` and `captures/normalized/capture-fixture-odoo-qualify-001/manifest.json`.
- `pnpm capture:normalize:notion`: passed; generated `flows/notion/update-task-status.flow.md` and `captures/normalized/capture-fixture-notion-ready-review-001/manifest.json`.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 21 tests, 21 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 generated flow files.
- `pnpm eval:odoo`: passed; 3/3 steps and report cites normalized manifest.
- `pnpm eval:notion`: passed; 3/3 steps and report cites normalized manifest.
- forbidden secret scan across `flows`, `evals`, and `captures`: no matches.
- raw/unsafe/tmp path scan across shareable artifacts: no matches.

two-tool fixture proof command:

```sh
pnpm capture:materialize:odoo
pnpm capture:materialize:notion
pnpm proof:fixtures
```

latest results on 2026-06-20:

- `pnpm capture:materialize:odoo`: passed; wrote 4 raw fixture artifacts under `captures/raw/odoo-qualify-opportunity/`.
- `pnpm capture:materialize:notion`: passed; wrote 4 raw fixture artifacts under `captures/raw/notion-update-task-status/`.
- `git check-ignore` for materialized screen recording, keyboard log, and mouse log paths: passed.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 22 tests, 22 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 generated flow files.
- `pnpm proof:fixtures`: passed; fixture proof passed 2/2 tools.
- final fixture proof report: `evals/reports/two-tool-fixture-proof.md`.
- report confirms 6/6 steps completed, 0 below-threshold events, 0 human-help incidents, 0 invented-step incidents, and no api/backend/dom/selector/mcp violations.
- report explicitly states real-tool proof was not run and remains unproven.
- forbidden secret scan across `flows`, `evals`, and `captures/normalized`: no matches.
- raw/unsafe/tmp path scan across shareable artifacts: no matches.

native capture readiness gate command:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm flow:validate
pnpm proof:fixtures
rg -n "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|password\\s*[:=]|token\\s*[:=]|api[_-]?key\\s*[:=]|session[_-]?secret\\s*[:=]" flows evals captures/normalized --glob "!**/*.mp4" -i
rg -n "captures/(raw|unsafe|tmp)/" flows evals captures/normalized --glob "!**/*.mp4"
```

latest results on 2026-06-20:

- Context7 `/websites/v2_tauri_app`: verified Tauri v2 capabilities, permission files, plugin command exposure, global shortcut plugin support, and platform-specific window behavior.
- Context7 `/websites/v2_tauri_app`: missing evidence for a complete official native capture path covering screen recording, full keyboard event logs, full mouse event logs, macos/windows permission recovery, deterministic native capture tests, and overlay behavior.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 25 tests, 25 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 generated flow files.
- `pnpm proof:fixtures`: passed; fixture proof passed 2/2 tools.
- forbidden secret scan across `flows`, `evals`, and `captures/normalized`: no matches.
- raw/unsafe/tmp path scan across shareable artifacts: no matches.

held-out fixture proof strengthening command:

```sh
pnpm build
node --test packages/fixtures packages/eval-harness
pnpm proof:fixtures
pnpm lint
pnpm typecheck
pnpm test
pnpm flow:validate
rg -n "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|password\\s*[:=]|token\\s*[:=]|api[_-]?key\\s*[:=]|session[_-]?secret\\s*[:=]" flows evals captures/normalized --glob "!**/*.mp4" -i
rg -n "captures/(raw|unsafe|tmp)/" flows evals captures/normalized --glob "!**/*.mp4"
```

latest results on 2026-06-20:

- `pnpm build`: passed.
- first targeted `node --test packages/fixtures packages/eval-harness`: failed because it raced a parallel build and loaded stale `dist` output; no code change was made for that failure.
- second targeted `node --test packages/fixtures packages/eval-harness`: passed; 10 tests, 10 pass, 0 fail.
- `pnpm proof:fixtures`: passed; fixture proof passed 2/2 tools with held-out eval runs 2/2.
- odoo fixture proof: 3/3 steps, completion rate 1, terminal missing visible text none, held out from capture frames true.
- notion fixture proof: 3/3 steps, completion rate 1, terminal missing visible text none, held out from capture frames true.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 27 tests, 27 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 generated flow files.
- forbidden secret scan across `flows`, `evals`, and `captures/normalized`: no matches.
- raw/unsafe/tmp path scan across shareable artifacts: no matches.

machine-readable fixture proof audit command:

```sh
pnpm build
node --test packages/eval-harness
pnpm proof:fixtures
```

latest results on 2026-06-20:

- first targeted `node --test packages/eval-harness`: failed because it raced a parallel build and loaded stale `dist` output; no code change was made for that failure.
- second targeted `node --test packages/eval-harness`: passed; 8 tests, 8 pass, 0 fail.
- `pnpm proof:fixtures`: passed; fixture proof passed 2/2 tools.
- `evals/reports/fixture-proof-audit.json`: `passed` true, tools audited `odoo` and `notion`, 6/6 steps completed, zero below-threshold events, zero human-help incidents, zero invented-step incidents, zero privileged-access violations, and no findings.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 29 tests, 29 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 generated flow files.
- forbidden secret scan across `flows`, `evals`, and `captures/normalized`: no matches.
- raw/unsafe/tmp path scan across shareable artifacts: no matches.

ranked local flow search command:

```sh
pnpm build
node --test packages/flow
pnpm flow:search ready review
pnpm flow:search qualify opportunity
```

latest results on 2026-06-21:

- first targeted `node --test packages/flow`: failed because it raced a parallel build and loaded stale `dist` output; no code change was made for that failure.
- second targeted `node --test packages/flow`: passed; 4 tests, 4 pass, 0 fail.
- `pnpm flow:search ready review`: passed; returned `/Users/mc/Desktop/onboardai/flows/notion/update-task-status.flow.md`.
- `pnpm flow:search qualify opportunity`: passed; returned `/Users/mc/Desktop/onboardai/flows/odoo/qualify-opportunity.flow.md`.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 31 tests, 31 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 generated flow files.
- `pnpm proof:fixtures`: passed; fixture proof passed 2/2 tools.
- forbidden secret scan across `flows`, `evals`, and `captures/normalized`: no matches.
- raw/unsafe/tmp path scan across shareable artifacts: no matches.

normalized manifest business-sensitive tagging command:

```sh
pnpm build
node --test packages/capture
pnpm proof:fixtures
```

latest results on 2026-06-21:

- `pnpm build`: passed.
- `node --test packages/capture`: passed; 10 tests, 10 pass, 0 fail.
- `pnpm proof:fixtures`: passed; fixture proof passed 2/2 tools after regenerating manifests through the hardened manifest path.
- fixture manifests did not change because committed fixture frame references are relative redacted paths; the new regression test covers local absolute frame paths and business record ids.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 32 tests, 32 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 generated flow files.
- forbidden secret scan across `flows`, `evals`, and `captures/normalized`: no matches.
- raw/unsafe/tmp path scan across shareable artifacts: no matches.

shareable fixture frame materialization command:

```sh
pnpm build
node --test packages/cli
pnpm proof:fixtures
rg --files captures/redacted evals/fixtures
```

latest results on 2026-06-21:

- first targeted `node --test packages/cli`: failed because it raced a parallel build and loaded stale `dist` output; no code change was made for that failure.
- second targeted `node --test packages/cli`: passed; 2 tests, 2 pass, 0 fail.
- `pnpm proof:fixtures`: passed; fixture proof passed 2/2 tools.
- `rg --files captures/redacted evals/fixtures`: found 16 shareable frame marker PNGs, 8 redacted capture frames and 8 held-out eval frames.
- `file captures/redacted/odoo-qualify-opportunity/frame-0001.png evals/fixtures/notion-update-task-status/held-out-frame-0001.png`: both sample artifacts are PNG images.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 33 tests, 33 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 generated flow files.
- `pnpm proof:fixtures`: passed; fixture proof passed 2/2 tools.
- forbidden secret scan across `flows`, `evals`, `captures/normalized`, and `captures/redacted`: no matches.
- raw/unsafe/tmp path scan across shareable artifacts: no matches.

flow anchor grounding command:

```sh
pnpm --filter @onboardai/flow test
pnpm lint
pnpm typecheck
pnpm test
pnpm flow:validate
pnpm proof:fixtures
rg -n "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|password\\s*[:=]|token\\s*[:=]|api[_-]?key\\s*[:=]|session[_-]?secret\\s*[:=]" flows evals captures/normalized captures/redacted --glob "!**/*.mp4" -i
rg -n "captures/(raw|unsafe|tmp)/" flows evals captures/normalized captures/redacted --glob "!**/*.mp4"
```

latest results on 2026-06-21:

- `pnpm --filter @onboardai/flow test`: passed; 7 tests, 7 pass, 0 fail.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 36 tests, 36 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 generated flow files.
- `pnpm proof:fixtures`: passed; fixture proof passed 2/2 tools.
- forbidden secret scan across `flows`, `evals`, `captures/normalized`, and `captures/redacted`: no matches.
- raw/unsafe/tmp path scan across shareable artifacts: no matches.

shareable evidence path audit command:

```sh
pnpm --filter @onboardai/eval-harness test
pnpm --filter @onboardai/cli test
pnpm lint
pnpm typecheck
pnpm test
pnpm flow:validate
pnpm proof:fixtures
rg -n "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|password\\s*[:=]|token\\s*[:=]|api[_-]?key\\s*[:=]|session[_-]?secret\\s*[:=]" flows evals captures/normalized captures/redacted --glob "!**/*.mp4" -i
rg -n "captures/(raw|unsafe|tmp)/" flows evals captures/normalized captures/redacted --glob "!**/*.mp4"
```

latest results on 2026-06-21:

- `pnpm --filter @onboardai/eval-harness test`: passed; 10 tests, 10 pass, 0 fail.
- `pnpm --filter @onboardai/cli test`: passed; 2 tests, 2 pass, 0 fail.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 38 tests, 38 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 generated flow files.
- `pnpm proof:fixtures`: passed; fixture proof passed 2/2 tools.
- `evals/reports/fixture-proof-audit.json`: `shareableEvidence.passed` true, 60 references audited, zero missing references, zero unsafe references, and zero disallowed references.
- forbidden secret scan across `flows`, `evals`, `captures/normalized`, and `captures/redacted`: no matches.
- raw/unsafe/tmp path scan across shareable artifacts: no matches.

full-goal proof status command:

```sh
pnpm --filter @onboardai/eval-harness test
pnpm --filter @onboardai/cli test
pnpm lint
pnpm typecheck
pnpm test
pnpm flow:validate
pnpm proof:fixtures
rg -n "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|password\\s*[:=]|token\\s*[:=]|api[_-]?key\\s*[:=]|session[_-]?secret\\s*[:=]" flows evals captures/normalized captures/redacted --glob "!**/*.mp4" -i
rg -n "captures/(raw|unsafe|tmp)/" flows evals captures/normalized captures/redacted --glob "!**/*.mp4"
```

latest results on 2026-06-21:

- `pnpm --filter @onboardai/eval-harness test`: passed; 14 tests, 14 pass, 0 fail.
- `pnpm --filter @onboardai/cli test`: passed; 2 tests, 2 pass, 0 fail.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 42 tests, 42 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 generated flow files.
- `pnpm proof:fixtures`: passed; fixture proof passed 2/2 tools.
- `evals/reports/full-goal-proof-status.json`: `fullGoalProven` false, `fixtureProofPassed` true, `realToolProofPassed` false, `realToolsPassed` 0/2, `missingRealToolProofs` 2.
- real-proof summary ingestion: no `evals/reports/real-tool-proof-odoo.json` or `evals/reports/real-tool-proof-notion.json` files are present, so `realToolProofs` remains empty.
- forbidden secret scan across `flows`, `evals`, `captures/normalized`, and `captures/redacted`: no matches.
- raw/unsafe/tmp path scan across shareable artifacts: no matches.

latest results on 2026-06-22:

- changed: full-goal status now counts real-tool proof only after the referenced run directory passes the artifact audit and is converted through `markRealToolProofEvidenceAudited`.
- eval showed: deterministic fixture proof still passes for both tools; real-tool proof remains absent.
- completion rate: fixture evals remain 6/6 taught steps; real odoo/notion held-out eval completion remains 0/2 tools because no actual real runs are present.
- stuck point: full-goal proof is blocked on real odoo and notion run directories with native screen-plus-input evidence, not on summary JSON.
- overlay misread: none in fixture evals; no real overlay misread evidence exists yet.
- next best experiment: run one real target-tool capture/eval using `proof real-run init`, fill the run directory with native screen-plus-input evidence, dry-run `proof real-run`, then repeat for the second tool.
- `pnpm --filter @onboardai/eval-harness test`: passed; 43 tests, 43 pass, 0 fail.
- `pnpm --filter @onboardai/cli test`: passed; 9 tests, 9 pass, 0 fail.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 78 tests, 78 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 flow files.
- `pnpm proof:fixtures`: passed; fixture proof passed 2/2 tools.
- `pnpm proof:scan`: passed; scanned 24 shareable text files.
- `pnpm proof:status`: expected failure; `full goal not proven`, `fixture proof passed`, `real-tool proof failed: 0/2 tools`.
- forbidden secret scan across `flows`, `evals`, `captures/normalized`, and `captures/redacted`: no matches.
- raw/unsafe/tmp path scan across shareable artifacts: no matches.
- `git check-ignore` for sample raw/unsafe/tmp capture paths: passed.

## idempotence-and-recovery

repo initialization is safe only once. if `.git` already exists, do not re-run `git init`; record that the repo was already initialized.

capture generation can be repeated if new run ids are used.

evals must be append-only under `/evals/runs/`. do not overwrite prior failed evidence.

if a dependency blocks progress, write a spike and verify behavior through context7 or official docs before committing to it.

## artifacts-and-notes

required eval evidence per tool:

```text
/evals/runs/<tool>/<run-id>/step-trace.json
/evals/runs/<tool>/<run-id>/final-screen.png
/evals/runs/<tool>/<run-id>/eval-recording.mp4
/evals/runs/<tool>/<run-id>/failure-log.md
/evals/reviewer-checklists/<tool>-<run-id>.md
```

## interfaces-and-dependencies

expected package responsibilities:

- `packages/capture`: capture models, input logs, frame extraction interfaces
- `packages/redaction`: secret and email redaction
- `packages/flow`: flow parser, schema, validator, search
- `packages/overlay`: guidance renderer, confidence gate, highlight model
- `packages/eval-harness`: deterministic user stand-in and eval runner
- `packages/fixtures`: odoo-like and notion-like clean fixtures
- `packages/cli`: command-line entrypoints
- `apps/desktop`: tauri shell or sidecar

do not finalize external packages until context7 or official docs verify behavior for the installed version.

## revision-notes

- 2026-06-20: initial execplan created from project interview decisions.
- 2026-06-20: milestone 1 scaffold added: pnpm TypeScript workspace, package skeletons, baseline verification scripts, capture/redaction/flow/overlay/eval/fixture/cli contracts, teach decision note, and passing baseline tests.
- 2026-06-20: fixture eval loop added: two three-step flow fixtures, deterministic screen-state matcher, explicit manual fixture transitions, CLI eval evidence writer, odoo/notion fixture reports, and reviewer checklists.
- 2026-06-20: capture normalization added: deterministic senior demonstration records now generate the two `flow.md` files before eval, with redaction and required raw screen/keyboard/mouse artifact metadata.
- 2026-06-20: normalized capture manifests added: each generated fixture flow now has a shareable manifest under `captures/normalized/` with redacted frame paths, input evidence, raw artifact kind/safety summaries, and no raw capture paths.
- 2026-06-20: two-tool fixture proof command added: `pnpm proof:fixtures` refreshes both fixture evals and writes `evals/reports/two-tool-fixture-proof.md` with confirmed fixture capability and unproven real-tool limits.
- 2026-06-20: local fixture capture materialization added: `pnpm capture:materialize:odoo` and `pnpm capture:materialize:notion` write ignored raw marker artifacts for screen recording, keyboard logs, mouse logs, and senior notes.
- 2026-06-20: native capture readiness gate added: fixture readiness remains explicit, native readiness fails closed without verified docs and every required screen/input artifact path, and `docs/native-capture-adapter-spike.md` records the Tauri evidence gap.
- 2026-06-20: held-out fixture proof strengthened: senior capture observations now feed normalized flows while eval observations use separate held-out frame paths, and terminal business state requires explicit final visible text.
- 2026-06-20: machine-readable fixture proof audit added: `proof fixtures` now writes `evals/reports/fixture-proof-audit.json` and fails unless both required tools satisfy the no-help, no-invention, no-privileged-access, held-out, terminal-text, and reviewer-signoff gates.
- 2026-06-21: ranked local flow search added: `searchFlowDocumentDetails` now scores local `flow.md` files by parsed path, frontmatter, step title, instruction, expected visible text, and success visible text without embeddings or a vector database.
- 2026-06-21: normalized manifest business-sensitive tagging added: redacted frame paths now pass through shareable tagging before persistence, with tests covering absolute local paths and business record ids.
- 2026-06-21: shareable fixture frame materialization added: fixture proof now writes referenced redacted capture frame and held-out eval frame PNG markers so committed flow/eval evidence paths resolve to concrete files.
- 2026-06-21: flow anchor grounding added: `flow.md` validation now rejects instruction highlights and user-action target anchors that are not present in the same step's captured screen-region hints.
- 2026-06-21: shareable evidence path audit added: `proof fixtures` now fails if referenced flow, manifest, redacted frame, held-out frame, eval run, report, or reviewer checklist paths are missing, unsafe, absolute, or outside allowed evidence directories.
- 2026-06-21: full-goal proof status added: `proof fixtures` now writes `evals/reports/full-goal-proof-status.json`, which remains not proven until real odoo and notion held-out target-tool evals pass from native screen-plus-input capture evidence.
- 2026-06-21: real-proof summary ingestion contract added: `proof fixtures` now optionally loads `evals/reports/real-tool-proof-odoo.json` and `evals/reports/real-tool-proof-notion.json`, validates their fields, and keeps full-goal proof false while those real target-tool summaries and run artifacts are absent.
- 2026-06-22: audited real-proof status gate added: full-goal status now rejects unaudited real-proof summary booleans and counts real proofs only after the referenced run directory passes the artifact audit.
