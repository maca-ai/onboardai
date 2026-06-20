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
- [x] expose flow search as cli command
- [x] build capture artifact model
- [x] build redaction pipeline for forbidden persisted secrets
- [ ] build screen-state matcher with confidence output
- [x] build overlay guidance renderer contract
- [x] enforce fail-closed behavior below confidence `0.75`
- [x] add deterministic mock user harness safety policy module
- [x] add odoo-like clean fixture contract
- [x] add notion-like clean fixture contract
- [ ] pass odoo held-out teaching eval
- [ ] pass notion held-out teaching eval
- [ ] collect senior-review checklist evidence
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

## outcomes-and-retrospective

milestone 1 in progress.

current evidence:

- capture changes: added `packages/capture` raw artifact model and a git-ignore test proving raw/unsafe/tmp capture paths and common unsafe artifacts are ignored.
- redaction changes: added `packages/redaction` hard-redaction for emails, password assignments, token-like values, api keys, and session secrets, plus business-sensitive tagging for urls, paths, and record ids.
- flow changes: added `packages/flow` parser/validator for yaml frontmatter and embedded JSON step blocks, with validation for required fields, confidence threshold, unsafe anchor paths, manual-only action, exact fail-closed message, and forbidden persisted secrets.
- overlay changes: added `packages/overlay` guidance renderer that only returns text/highlight guidance, never input automation, and fails closed below `0.75`.
- eval harness changes: added `packages/eval-harness` policy guard forbidding llm inference, dom, selectors, apis, backend, database, and target-tool mcp access.
- fixture changes: added odoo-like and notion-like fixture contracts with visible starting text and terminal business states.
- cli changes: added `@onboardai/cli` commands for flow validation/search and explicit non-implemented eval command stubs.

what the eval showed:

- no held-out teaching eval has run yet.
- milestone 1 tests passed: 11 tests, 11 pass, 0 fail.

completion rate:

- milestone 1 requested tests: 6 of 6 requested behavioral test groups are covered and passing.
- project goal: 0 of 2 required held-out tool evals have passed.

where the user or harness got stuck:

- not applicable yet; deterministic fixture eval is not implemented.

which step the overlay misread:

- not applicable yet; screen-state matching is not implemented.

next best experiment:

- implement a deterministic screen-observation matcher and an explicit fixture transition harness, then create one three-step odoo-like flow fixture and make the harness fail on ambiguity before attempting a passing fixture run.

at completion, record:

- whether both tools passed
- completion rate per tool
- stuck points per tool
- overlay misreads per tool
- secret-redaction failures, if any
- whether the system proved tool-agnostic behavior
- what remains unsafe or unproven

## context-and-orientation

the repo does not exist yet. codex must initialize it.

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
