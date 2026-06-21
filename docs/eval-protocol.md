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

fixture proof is not the full project goal. fixture proof runs must also write
`evals/reports/full-goal-proof-status.json`, and that status must remain `fullGoalProven: false` until both
real odoo and real notion held-out evals pass using native screen-plus-input capture evidence.

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
/evals/runs/<tool>/<run-id>/screen-input-evidence.json
/evals/runs/<tool>/<run-id>/outcome-evidence.json
```

`screen-input-evidence.json` must state that native screen recording, keyboard logging, mouse logging, hard
redaction, clean seeded data, local-only raw capture, and no privileged proof access were all verified. it
may reference shareable redacted frames and normalized manifests, but it must not reference raw, unsafe, or
temporary capture paths.

`step-trace.json` must contain at least one taught step. every real proof step must show successful
instruction guidance, overlay confidence at or above `0.75`, a non-empty highlighted anchor id, a manual-only
user action, and a current frame path under the same run directory.

`reviewer-checklist.md` must contain `- accepted: true` and must not contain `- rejected: true`.

`outcome-evidence.json` must show completion rate `1`, all taught steps completed, terminal business state
reached, empty terminal missing visible text, zero human-help incidents, zero invented-step incidents, no
privileged access violations, held-out eval evidence, and senior reviewer signoff.

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
/evals/templates/runs/tool-run-id/screen-input-evidence.json
/evals/templates/runs/tool-run-id/outcome-evidence.json
```

for a real run, copy the templates into:

```text
/evals/runs/<tool>/<run-id>/step-trace.json
/evals/runs/<tool>/<run-id>/failure-log.md
/evals/runs/<tool>/<run-id>/reviewer-checklist.md
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
