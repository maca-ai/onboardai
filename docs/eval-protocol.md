# eval protocol

## purpose

the eval proves whether a captured `flow.md` can teach a first-time user to complete a workflow in an api-less tool.

a flow is successful only when a held-out eval reaches the terminal business state with no human help and no privileged access.

## tools under test

- odoo
- notion

odoo is treated as browser or pwa first.

notion may be desktop app or browser.

## eval substrate

v0 evals must use clean seeded demo data or sanitized duplicate data.

do not run held-out evals against live customer data.

## eval actors

### senior demonstrator

captures the original workflow and provides optional context notes.

### first-time user

a person who has never performed the captured process.

### scripted stand-in

for v0, this is a deterministic mock user harness.

### senior reviewer

confirms each taught step was correct.

## deterministic mock user harness

the harness may:

- read `flow.md`
- read redacted screenshots
- receive current screen observations
- execute low-level simulated input primitives in test fixtures
- fail when a step is ambiguous

the harness must not:

- use an llm to infer missing actions
- use computer-use automation as proof
- use playwright selectors as proof
- inspect the dom
- call odoo or notion apis
- use backend access
- use mcp access to the target tool

## eval run structure

each run should write:

```text
/evals/runs/<tool>/<run-id>/step-trace.json
/evals/runs/<tool>/<run-id>/final-screen.png
/evals/runs/<tool>/<run-id>/eval-recording.mp4
/evals/runs/<tool>/<run-id>/failure-log.md
/evals/runs/<tool>/<run-id>/capture-manifest.json
/evals/reviewer-checklists/<tool>-<run-id>.md
/evals/reports/<tool>-<run-id>.md
/evals/reports/fixture-proof-audit.json
/evals/reports/full-goal-proof-status.json
/evals/fixtures/<flow-id>/held-out-frame-*.png
/captures/redacted/<flow-id>/frame-*.png
```

## required metrics

each report must include:

- tool name
- flow id
- run id
- completion result
- completion rate
- number of steps
- steps completed
- steps failed
- first stuck step
- overlay confidence per step
- below-threshold events
- overlay misreads
- invented-step incidents
- human-help incidents
- api/backend/dom/selector violations
- final terminal business state
- terminal expected visible text
- terminal missing visible text
- held out from capture frames
- reviewer signoff result

## pass criteria

a tool eval passes only if:

- terminal business state is reached
- the final held-out screen observation contains the terminal expected visible text
- no human help is used
- no api/backend/dom/selector/mcp access is used
- overlay guidance is grounded only in `flow.md`
- all shown highlights meet confidence `0.75` or higher
- below-threshold states fail closed
- no invented step is displayed
- senior reviewer signs off each taught step

## fail criteria

a tool eval fails if any of these happen:

- user or harness cannot complete the workflow
- user needs senior help
- overlay invents a step
- overlay highlights below confidence `0.75`
- flow omits necessary action detail
- current state is ambiguous but the overlay guesses
- evidence is missing
- reviewer cannot confirm correctness
- eval uses privileged access

## two-tool proof

the project goal passes only when both odoo and notion evals pass.

if one passes and the other fails, the project is not complete.

fixture proof runs must also write a machine-readable proof audit that verifies both required tools, completion, held-out eval frames, terminal visible text, no human help, no invented steps, no privileged access, and reviewer signoff.

the machine-readable proof audit must also verify shareable evidence path integrity. every referenced flow,
normalized manifest, redacted capture frame, held-out eval frame, eval run artifact, report, and reviewer
checklist path must be project-relative, exist on disk, avoid raw/unsafe/tmp capture locations, and live under
an allowed shareable evidence directory.

scan all shareable text artifacts before sharing or reviewing proof:

```sh
pnpm proof:scan
```

this checks `flows`, `evals`, `captures/normalized`, and `captures/redacted` for forbidden email addresses,
password assignments, token assignments, api keys, session secrets, and raw/unsafe/tmp capture path references.
binary evidence such as png frames and mp4 recordings is skipped by this text scan and must still come from
the redaction pipeline or native run evidence process.

fixture proof is not the full project goal. fixture proof runs must also write
`evals/reports/full-goal-proof-status.json`, and that status must remain `fullGoalProven: false` until both
real odoo and real notion held-out evals pass using native screen-plus-input capture evidence.

check the current full-goal gate without regenerating fixture eval evidence:

```sh
pnpm proof:status
```

this reads the existing fixture proof audit plus any live real-tool proof summaries, validates live real run
directories through the same artifact gate, refreshes `evals/reports/full-goal-proof-status.json`, and exits
non-zero until both real odoo and real notion proof are present and valid.

the full-goal status must not trust real-tool proof summary booleans by themselves. a real proof object counts
only after the referenced run directory has passed the artifact gate in the same process; the validator then
marks that proof internally as run-evidence-audited before including it in full-goal status. do not add an
operator-written `runEvidenceAudited` field to `real-tool-proof-*.json`.
summary files that include `runEvidenceAudited` are invalid because that field is derived proof state, not
operator evidence.

## real target-tool proof contract

real target-tool proof, when available, is loaded from:

```text
/evals/reports/real-tool-proof-odoo.json
/evals/reports/real-tool-proof-notion.json
```

each file must contain one proof object:

```json
{
  "tool": "odoo",
  "substrate": "real-tool",
  "heldOutTeachingEvalPassed": true,
  "nativeScreenPlusInputCaptureVerified": true,
  "terminalBusinessStateReached": true,
  "zeroHumanHelp": true,
  "noInventedSteps": true,
  "noPrivilegedAccess": true,
  "seniorReviewerSignoff": true,
  "evidencePath": "evals/runs/odoo/<run-id>/step-trace.json"
}
```

this summary is only a pointer plus claims. it is not sufficient proof until
`evals/runs/<tool>/<run-id>/` is audited and accepted by `pnpm proof:status` or
`pnpm --filter @onboardai/cli onboardai proof real-run <tool> <run-id>`.

the `evidencePath` must exist on disk under `evals/runs/<tool>/<run-id>/step-trace.json`. the proof object is
only a summary pointer; it does not replace the required run artifacts, native screen-plus-input capture
evidence, reviewer checklist, or no-privileged-access audit evidence.

before a real proof summary is accepted, the derived run directory must contain:

```text
/evals/runs/<tool>/<run-id>/step-trace.json
/evals/runs/<tool>/<run-id>/final-screen.png
/evals/runs/<tool>/<run-id>/eval-recording.mp4
/evals/runs/<tool>/<run-id>/failure-log.md
/evals/runs/<tool>/<run-id>/reviewer-checklist.md
/evals/runs/<tool>/<run-id>/flow-evidence.json
/evals/runs/<tool>/<run-id>/capture-readiness.json
/evals/runs/<tool>/<run-id>/screen-input-evidence.json
/evals/runs/<tool>/<run-id>/outcome-evidence.json
/evals/runs/<tool>/<run-id>/capture-manifest.json
```

all shareable text artifacts read by the real-run gate must be hard-redacted. this includes the run JSON and
Markdown files, the referenced `flow.md`, and the referenced normalized capture manifest. forbidden email
addresses, password assignments, token assignments, api key assignments, and session secret assignments make
the real run invalid.

real-run JSON evidence files must use `schemaVersion: 1`. this applies to `step-trace.json`,
`flow-evidence.json`, `capture-readiness.json`, `screen-input-evidence.json`, `outcome-evidence.json`, and the
referenced normalized capture manifest.

`failure-log.md` must state `no failure observed` for a passing real run and must independently confirm the
passing invariants with exact true result lines for `passed`, `terminal state reached`, `zero human help`,
`no invented steps`, and `no privileged access`. it must not contradict the passing outcome with result lines
such as `- passed: false`, `- terminal state reached: false`, `- zero human help: false`,
`- no invented steps: false`, or `- no privileged access: false`.

create the editable run skeleton from templates with:

```sh
pnpm --filter @onboardai/cli onboardai proof real-run init <odoo|notion> <run-id>
```

the init command creates only editable template files. it does not create a final screen, eval recording,
redacted frame evidence, normalized capture manifest, live proof summary, or passing real proof.

all copied real-run templates must be fully replaced before proof ingestion. `proof real-run` rejects unfilled
template placeholder text such as `replace-with-*` or `replace with *` in run JSON, run Markdown, and the
referenced normalized capture manifest.

`screen-input-evidence.json` must state that native screen recording, keyboard logging, mouse logging, hard
redaction, clean seeded data, local-only raw capture, and no privileged proof access were all verified. it
may reference shareable redacted frames and normalized manifests, but it must not reference raw, unsafe, or
temporary capture paths. redacted frame evidence paths must point to
`evals/runs/<tool>/<run-id>/redacted-frame-*.png` for same-run evidence or
`captures/redacted/<capture-id>/frame-*.png` for separately materialized shareable redacted capture evidence.
it must also point to the exact same-run `capture-readiness.json` artifact.

the referenced normalized capture manifest must be valid JSON and must show the same tool, local-only raw
capture policy, hard-secret-redaction policy, matching `flowPath` and `flowId` from `flow-evidence.json`,
captured screen recording, keyboard event log, mouse event log, sanitized raw artifact summaries for all
three required raw inputs without raw file paths, at least one redacted frame under
`evals/runs/<tool>/<run-id>/redacted-frame-*.png` or `captures/redacted/<capture-id>/frame-*.png`, and
per-step input evidence for every step id in the real `step-trace.json`. raw artifact summaries must not
include path-like fields such as `path`,
`rawPath`, or `localPath`, absolute local paths, `file://` paths, or raw/unsafe/tmp capture references. every
`redactedFrameEvidencePaths` entry in `screen-input-evidence.json` must also be listed in that normalized
manifest.

the preferred capture artifact pipeline skeleton writes the shareable normalized manifest to:

```text
evals/runs/<tool>/<run-id>/capture-manifest.json
```

the manifest must use `schemaVersion: 1`, contain only project-relative shareable paths, and reject raw paths,
absolute paths, `file://` paths, traversal paths, unsafe/tmp capture references, email addresses, and
secret-like strings. any remaining customer names, browser urls, local file paths, internal object names, or
business record ids detected in the manifest must be listed under `redaction.businessSensitiveTags`. raw
capture inputs remain local under ignored paths such as `captures/raw/`, `captures/unsafe/`, and
`captures/tmp/` until the user manually deletes them.

for clean fixture proof only, `onboardai capture normalize-run <odoo|notion> <run-id>` exercises this
run-local manifest path from deterministic senior demonstration data. it must not create real odoo/notion
proof summaries and must not be used as real held-out target-tool evidence.

each normalized manifest `inputEvidence[].inputEvents[]` entry must be a captured mouse or keyboard event
with a non-empty event name. input event records must not include privileged proof handles such as api,
backend, database, dom, mcp, selector, playwright, or computer-use fields.
for every real `step-trace.json` step with an action target anchor, the matching manifest `inputEvidence`
entry must include at least one input event with the same `anchorId`.

`capture-readiness.json` must state that the capture adapter is native, macos or windows, official-docs or
context7 verified, screen-recording capable, keyboard-event capable, mouse-event capable, able to output
redacted frames, and protected by raw-artifact git ignore. its blockers list must be empty. it must include
`verifiedDocReferences` entries with source type `official-docs` or `context7`, a non-empty reference, and
behavior coverage for `screen-recording`, `keyboard-event-log`, `mouse-event-log`, `redacted-frame-output`,
and `raw-artifacts-ignored`.

`step-trace.json` must be an object with `schemaVersion: 1` and a `steps` array containing at least one taught
step. every real proof step must show successful instruction guidance, overlay confidence at or above `0.75`,
`overlayCanAutomateInput: false`, a non-empty highlighted anchor id, a manual-only user action, and a current
frame path under the same run directory. the current frame path must point to a same-run redacted-frame PNG, for example
`evals/runs/<tool>/<run-id>/redacted-frame-0001.png`; a same-run log, JSON file, final screen, raw capture,
unsafe file, or temporary file cannot stand in for step frame evidence. the trace must not include overlay
automation command fields for click, type, submit, approve, delete, or state mutation. each step's
`expectedVisibleText` and `matchedVisibleText` must match the referenced `flow.md` step expected visible text,
and `missingVisibleText` must be an empty array.

if a failed run records any step or event with `overlayConfidence` below `0.75`, the overlay evidence must fail
closed: `overlayMessage` must be exactly `screen state not recognized. ask a human or restart this step.` and
`highlightedAnchorId` must be `null` or absent. below-threshold evidence never counts as a successful proof
step.

`flow-evidence.json` must point to the local `flow.md` used for overlay guidance. the referenced flow must
parse and validate, match the target tool, match the recorded flow id and terminal business state, and its
step ids, instruction text, highlight anchors, and manual action targets must match the real `step-trace.json`.

`reviewer-checklist.md` must identify the senior reviewer, include an ISO review date, bind the signoff to the
same tool, run id, and `flow-evidence.json` flow id, contain `- accepted: true`, must not contain
`- rejected: true`, and must include one per-step acceptance line for every step id in `step-trace.json`, for
example `- step-001: accepted`.

`outcome-evidence.json` must identify the held-out evaluator as `first-time-user` or
`deterministic-mock-user-harness`, show completion rate `1`, all taught steps completed, terminal business
state reached, terminal business state matching the referenced `flow.md`, terminal expected and matched
visible text matching the terminal step's `success-condition.visible-text`, empty terminal missing visible
text, zero human-help incidents, zero invented-step incidents, no privileged access violations, held-out
eval evidence, and senior reviewer signoff. its `stepCount` and `stepsCompleted` values must match the same-run
`step-trace.json` step count and successful step count.

`outcome-evidence.json` `heldOutEvidencePaths` must include same-run held-out eval artifacts, including
`evals/runs/<tool>/<run-id>/final-screen.png` and `evals/runs/<tool>/<run-id>/eval-recording.mp4`. these paths
must exist under the same run directory and must not point to `captures/`, raw, unsafe, tmp, absolute, or
traversal paths. capture artifacts can prove the senior demonstration, but they cannot prove the held-out
naive-user eval outcome.

validate a filled real run directory before creating the live proof summary:

```sh
pnpm --filter @onboardai/cli onboardai proof real-run <odoo|notion> <run-id>
```

this validation command reads only local filesystem artifacts. it does not create
`evals/reports/real-tool-proof-*.json` and does not access the target tool.

after the real run directory passes and the reviewer has accepted the run, create the live proof summary with:

```sh
pnpm --filter @onboardai/cli onboardai proof real-run <odoo|notion> <run-id> --write-summary
```

the summary write still reads only local filesystem artifacts and is blocked by the same run-directory evidence
gate. it must not be used for fixture runs or placeholder templates.

proof summary templates live under:

```text
/evals/templates/reports/real-tool-proof-odoo.json
/evals/templates/reports/real-tool-proof-notion.json
```

do not copy those templates into `/evals/reports/real-tool-proof-*.json` until the real run artifacts exist
and the senior reviewer has accepted every taught step.

## real target-tool run preparation

the detailed runbook is `docs/real-eval-runbook.md`.

real held-out evals must use only clean seeded demo data or sanitized duplicate data. do not run real evals
against live customer data.

real run templates live under:

```text
/evals/templates/runs/tool-run-id/step-trace.json
/evals/templates/runs/tool-run-id/failure-log.md
/evals/templates/runs/tool-run-id/reviewer-checklist.md
/evals/templates/runs/tool-run-id/flow-evidence.json
/evals/templates/runs/tool-run-id/capture-readiness.json
/evals/templates/runs/tool-run-id/screen-input-evidence.json
/evals/templates/runs/tool-run-id/outcome-evidence.json
```

for a real run, copy the templates into:

```text
/evals/runs/<tool>/<run-id>/step-trace.json
/evals/runs/<tool>/<run-id>/failure-log.md
/evals/runs/<tool>/<run-id>/reviewer-checklist.md
/evals/runs/<tool>/<run-id>/flow-evidence.json
/evals/runs/<tool>/<run-id>/capture-readiness.json
/evals/runs/<tool>/<run-id>/screen-input-evidence.json
/evals/runs/<tool>/<run-id>/outcome-evidence.json
```

the real run must also preserve or reference:

- native screen recording evidence from the senior demonstration
- keyboard event log evidence from the senior demonstration
- mouse event log evidence from the senior demonstration
- redacted capture frames and normalized capture manifest
- held-out eval screen recording or redacted frame sequence
- no-privileged-access statement
- eval report under `/evals/reports/`

raw capture evidence must remain local, unsafe-to-share, and excluded from git.

## failure log template

```md
# failure log

## run

- tool:
- flow id:
- run id:
- date:
- evaluator:

## result

- passed: false
- first failed step:
- terminal state reached: false
- zero human help: false
- no invented steps: false
- no privileged access: false

## observed failure

describe what happened.

## evidence

list files and timestamps.

## likely cause

- capture problem:
- flow problem:
- screen-state matcher problem:
- overlay problem:
- fixture problem:
- harness problem:

## next best experiment

state the smallest next experiment.
```

## reviewer checklist template

```md
# reviewer checklist

## run

- tool:
- flow id:
- run id:
- reviewer:
- date:

## evidence reviewed

- final screen:
- step trace:
- capture-to-flow mapping:
- held-out eval observations:
- eval recording:
- failure log:

## checks

- [ ] each taught step was correct
- step-001:
- step-002:
- step-003:
- [ ] no required step was missing
- [ ] terminal business state was reached
- [ ] terminal visible text matched
- [ ] no human help was used during eval
- [ ] no api/backend/dom/selector/mcp access was used
- [ ] overlay did not invent steps
- [ ] eval observations were held out from capture frames
- [ ] below-threshold behavior failed closed

## reviewer verdict

- accepted:
- rejected:
- notes:
```
