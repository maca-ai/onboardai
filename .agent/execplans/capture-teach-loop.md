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

## outcomes-and-retrospective

milestone 1 in progress.

current evidence:

- capture changes: added `packages/capture` raw artifact model and a git-ignore test proving raw/unsafe/tmp capture paths and common unsafe artifacts are ignored; added senior-demonstration normalization to shareable `flow.md` with redaction before persistence; added normalized capture manifests for redacted frame and input evidence without raw path leakage and with business-sensitive tagging; added local fixture capture materialization for raw screen/input marker artifacts; materialized shareable redacted-frame marker PNGs for fixture proof; added native capture readiness checks that fail closed until docs and all capture inputs are verified.
- redaction changes: added `packages/redaction` hard-redaction for emails, password assignments, token-like values, api keys, and session secrets, plus business-sensitive tagging for urls, paths, and record ids.
- flow changes: added `packages/flow` parser/validator for yaml frontmatter and embedded JSON step blocks, with validation for required fields, confidence threshold, unsafe anchor paths, per-step anchor grounding, manual-only action, exact fail-closed message, and forbidden persisted secrets; added ranked local flow search over parsed flow evidence.
- overlay changes: added `packages/overlay` guidance renderer that only returns text/highlight guidance, never input automation, and fails closed below `0.75`.
- eval harness changes: added `packages/eval-harness` policy guard forbidding llm inference, dom, selectors, apis, backend, database, and target-tool mcp access; added screen-state matching from visible text and deterministic eval execution; added explicit terminal visible-text verification and held-out status in eval results; added machine-readable proof audit across both required tools; added shareable evidence path auditing for missing, unsafe, absolute, or disallowed artifact references; added full-goal status auditing that remains false until real odoo and notion proof evidence exists.
- fixture changes: added odoo-like and notion-like fixture contracts with visible starting text, separate capture and held-out eval observations, four eval screen observations each, three manual transitions each, and terminal business states.
- cli changes: added `@onboardai/cli` commands for flow validation/search, deterministic eval evidence generation, shareable fixture frame materialization, and audited two-tool fixture proof.
- proof changes: added `pnpm proof:fixtures`, `evals/reports/two-tool-fixture-proof.md`, `evals/reports/fixture-proof-audit.json`, and `evals/reports/full-goal-proof-status.json` to compare both fixture evals, machine-check the proof invariants, audit shareable evidence path integrity, separate fixture proof from full-goal proof, and record limitations.

what the eval showed:

- odoo fixture teaching eval passed from a generated normalized flow against held-out eval observations: 3/3 steps, completion rate 1, terminal expected visible text `demo opportunity, stage, qualified, saved`, no terminal missing text, no human help, no privileged access, no invented steps, reviewer checklist accepted.
- notion fixture teaching eval passed from a generated normalized flow against held-out eval observations: 3/3 steps, completion rate 1, terminal expected visible text `demo task, status, ready for review`, no terminal missing text, no human help, no privileged access, no invented steps, reviewer checklist accepted.
- latest test suite passed: 40 tests, 40 pass, 0 fail.

completion rate:

- milestone 1 requested tests: 6 of 6 requested behavioral test groups are covered and passing.
- fixture eval proof: 2 of 2 tool-like fixture evals have passed.
- real-tool proof: 0 of 2 real target-tool evals have passed because real odoo and notion environments are not available in this repo yet.

where the user or harness got stuck:

- no fixture stuck point. Both deterministic fixture runs reached terminal state.

which step the overlay misread:

- none in fixture evals. All overlay confidence values were `1` and every highlight was grounded in the current step's `flow.md` anchor.

next best experiment:

- add a real-proof evidence ingestion contract for native screen-plus-input odoo/notion runs, then keep it failing until actual target-tool artifacts exist under `/evals`.

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

- `pnpm --filter @onboardai/eval-harness test`: passed; 12 tests, 12 pass, 0 fail.
- `pnpm --filter @onboardai/cli test`: passed; 2 tests, 2 pass, 0 fail.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed; 40 tests, 40 pass, 0 fail.
- `pnpm flow:validate`: passed; validated 2 generated flow files.
- `pnpm proof:fixtures`: passed; fixture proof passed 2/2 tools.
- `evals/reports/full-goal-proof-status.json`: `fullGoalProven` false, `fixtureProofPassed` true, `realToolProofPassed` false, `realToolsPassed` 0/2, `missingRealToolProofs` 2.
- forbidden secret scan across `flows`, `evals`, `captures/normalized`, and `captures/redacted`: no matches.
- raw/unsafe/tmp path scan across shareable artifacts: no matches.

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
