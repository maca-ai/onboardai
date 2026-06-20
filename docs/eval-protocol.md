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
