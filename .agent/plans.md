# plans

this file defines how work is planned and verified in this repo.

## planning contract

every non-trivial change must be made under an execplan in `.agent/execplans/`.

the active plan is:

```text
.agent/execplans/capture-teach-loop.md
```

the execplan is the single living plan. do not create competing plans for the same work.

## required execplan properties

each execplan must be:

- self-contained
- self-sufficient
- novice-guiding
- outcome-focused
- evidence-driven
- updated as work proceeds

the plan must tell a new contributor:

- why the work matters
- what already exists
- what to build next
- what commands to run
- what evidence proves success
- what risks remain
- how to recover from failed attempts

## update rules

update the active execplan whenever any of these happen:

- a file or module is added
- a design decision is made
- a library is selected or rejected
- `mattpocock/teach` is inspected
- a capture method is attempted
- redaction behavior changes
- overlay behavior changes
- eval fixtures change
- an eval passes or fails
- a blocker is found
- the next best experiment changes

## gate definitions

### gate 0 - repo foundation

success means:

- `git init` has run
- `.gitignore` excludes raw captures and local unsafe artifacts
- pnpm workspace exists
- docs exist
- baseline tests and lint commands exist
- active execplan is present and current

### gate 1 - teach engine decision

success means:

- `mattpocock/teach` was inspected
- reusable parts were summarized
- one path was chosen: fork, adapt ideas only, or ignore
- rationale is recorded in the execplan
- no hard dependency exists before this decision

### gate 2 - flow format

success means:

- `flow.md` format supports multiple flows
- each step has machine-readable json
- screenshots and anchors are referenced by path
- expected screen state, action, success condition, and fallback are present
- schema validation fails on missing required fields

### gate 3 - capture pipeline

success means:

- screen recording can be stored locally
- input event logs can be stored locally
- optional human notes can be attached
- raw captures are marked unsafe-to-share
- raw captures are excluded from git
- redacted frames are produced before shareable persistence

### gate 4 - secret redaction

success means:

- passwords, tokens, api keys, session secrets, and email addresses are hard-redacted
- business-sensitive values are tagged, not blindly removed
- tests prove forbidden secrets do not appear in redacted frames or normalized artifacts

### gate 5 - overlay guidance

success means:

- overlay or sidecar reads only from `flow.md`
- highlights are grounded in captured anchors
- overlay never automates input
- below confidence `0.75`, the fail-closed message appears
- tests prove no invented step can be shown

### gate 6 - deterministic eval harness

success means:

- harness can read `flow.md`
- harness can read redacted screenshots
- harness can receive current screen observations
- harness can execute simulated low-level input primitives in fixtures
- harness fails on ambiguity
- harness does not use llms, dom, selectors, apis, mcp, or backend access

### gate 7 - odoo fixture eval

success means:

- clean seeded odoo-like fixture exists
- captured flow reaches terminal business state
- deterministic harness completes with zero human help
- senior-review checklist can be completed from evidence

### gate 8 - notion fixture eval

success means:

- clean seeded notion-like fixture exists
- captured flow reaches terminal business state
- deterministic harness completes with zero human help
- senior-review checklist can be completed from evidence

### gate 9 - two-tool proof

success means:

- both odoo and notion evals pass
- eval evidence is stored under `/evals`
- senior review confirms each taught step was correct
- no tool-specific shortcut is required
- final retrospective documents limits and next work

## blocked condition

if no valid path remains, stop. do not weaken the constraints.

the report must include:

- attempted approaches
- eval evidence gathered
- exact blocker
- proposed unlock input
