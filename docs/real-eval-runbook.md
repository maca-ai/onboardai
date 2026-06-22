# real eval runbook

## purpose

this runbook prepares a future held-out eval against real odoo or notion without changing the proof contract.

the run is valid only if it uses clean seeded demo data, native screen-plus-input capture, redacted shareable artifacts, overlay guidance grounded in `flow.md`, and senior reviewer signoff. fixture proof remains separate from real target-tool proof.

## hard boundaries

- do not use real customer data.
- do not use odoo api, notion api, backend access, database access, mcp access to the target tool, dom access, browser selectors, playwright selectors, computer-use automation, embeddings, or vector databases as proof.
- do not let the overlay click, type, submit, approve, delete, or mutate target-tool state.
- do not copy raw captures into git-tracked locations. raw captures stay under ignored unsafe local paths.
- do not create `evals/reports/real-tool-proof-odoo.json` or `evals/reports/real-tool-proof-notion.json` until every checklist in this runbook is complete.

## run ids

use one stable lowercase kebab-case run id per real eval:

```text
real-odoo-qualify-opportunity-001
real-notion-ready-review-001
```

write real run artifacts under:

```text
evals/runs/<tool>/<run-id>/
```

initialize editable run templates with:

```sh
pnpm --filter @onboardai/cli onboardai proof real-run init <tool> <run-id>
```

this creates the JSON and Markdown skeleton files only. it must still fail `proof real-run` until the real held-out
screen-plus-input evidence, redacted frames, reviewer acceptance, and outcome evidence are filled in.

the proof summary `evidencePath` must point at:

```text
evals/runs/<tool>/<run-id>/step-trace.json
```

## clean seeded demo data

### odoo setup

1. open a non-customer odoo demo or sandbox tenant through the normal visible app UI.
2. confirm no live customer workspace, production database, or customer-identifying data is visible.
3. create or reset one demo sales opportunity manually through the UI with this visible data:
   - opportunity name: `demo opportunity`
   - customer label: `demo account`
   - expected stage before capture: `new`
   - target stage after workflow: `qualified`
4. remove unrelated records from the visible view when the app supports it, or use a filtered demo view that only shows seeded demo records.
5. record the starting screen state in the run notes with the exact visible text required by the first `flow.md` step.

### notion setup

1. open a non-customer notion demo workspace through the normal visible desktop or browser UI.
2. confirm no live customer workspace, private team page, production database, or customer-identifying data is visible.
3. create or reset one demo task manually through the UI with this visible data:
   - page or database name: `demo tasks`
   - task name: `demo task`
   - expected status before capture: `not started`
   - target status after workflow: `ready for review`
4. remove unrelated records from the visible view when the app supports it, or use a filtered demo view that only shows seeded demo records.
5. record the starting screen state in the run notes with the exact visible text required by the first `flow.md` step.

## senior demonstration checklist

before capture:

- [ ] confirm the target tool is odoo or notion.
- [ ] confirm the workspace contains only clean seeded demo data or sanitized duplicate data.
- [ ] confirm the raw capture destination is under `captures/raw/` and labeled unsafe-to-share.
- [ ] confirm screen recording is enabled.
- [ ] confirm keyboard event logging is enabled.
- [ ] confirm mouse event logging is enabled.
- [ ] confirm no api, backend, database, dom, selector, target-tool mcp, or computer-use proof path is active.
- [ ] confirm the intended workflow has approximately three taught steps.

during capture:

- [ ] perform the workflow once as the senior demonstrator.
- [ ] avoid correcting the future user verbally inside the eval material.
- [ ] note any visible starting-state text, target regions, and terminal business-state text that must be preserved in `flow.md`.
- [ ] stop capture immediately after the terminal business state is visible.

after capture:

- [ ] keep raw capture local and unsafe-to-share.
- [ ] run hard redaction before writing shareable frames, normalized manifests, or `flow.md`.
- [ ] verify forbidden secrets and email addresses are absent from shareable artifacts.
- [ ] tag business-sensitive customer names, file paths, browser urls, internal object names, and business record ids if they remain local.
- [ ] normalize the demonstration into `flow.md`.
- [ ] validate that every overlay instruction and highlight anchor is grounded in `flow.md`.

## naive-user eval checklist

before eval:

- [ ] create a fresh seeded demo data copy for the held-out eval.
- [ ] confirm the first-time user has not performed this workflow.
- [ ] confirm the user will receive only overlay guidance.
- [ ] confirm a human will not help during the eval.
- [ ] confirm the overlay cannot automate clicks, typing, submit, approve, delete, or any other state mutation.
- [ ] confirm below-threshold overlay behavior uses exactly `screen state not recognized. ask a human or restart this step.`

during eval:

- [ ] record the screen.
- [ ] record keyboard events.
- [ ] record mouse events.
- [ ] record overlay confidence for each step.
- [ ] record any below-threshold event.
- [ ] record any user stuck point.
- [ ] record any overlay misread.
- [ ] record any invented-step incident.
- [ ] record any human-help incident.
- [ ] record any privileged-access violation.

after eval:

- [ ] write `evals/runs/<tool>/<run-id>/step-trace.json`.
- [ ] confirm every `step-trace.json` entry is successful, has overlay confidence at or above `0.75`, includes a highlighted anchor id, uses manual-only user action, and references a current `redacted-frame-*.png` under the run directory.
- [ ] write `evals/runs/<tool>/<run-id>/flow-evidence.json` pointing to the normalized `flow.md` used for overlay guidance.
- [ ] confirm every `step-trace.json` step id, overlay message, highlighted anchor id, action kind, and target anchor matches the referenced `flow.md`.
- [ ] confirm every `step-trace.json` entry has `missingVisibleText: []`, `expectedVisibleText` exactly matching that step's `flow.md` expected visible text, and `matchedVisibleText` proving the same visible text was observed.
- [ ] write a redacted final screen artifact under `evals/runs/<tool>/<run-id>/`.
- [ ] write or retain `evals/runs/<tool>/<run-id>/eval-recording.mp4` as the held-out eval screen recording evidence.
- [ ] write `evals/runs/<tool>/<run-id>/failure-log.md`, even when no failure occurred.
- [ ] write `evals/runs/<tool>/<run-id>/reviewer-checklist.md`.
- [ ] confirm `reviewer-checklist.md` contains `- accepted: true` and does not contain `- rejected: true`.
- [ ] confirm `reviewer-checklist.md` contains one `- <step-id>: accepted` line for every step id in `step-trace.json`.
- [ ] write `evals/runs/<tool>/<run-id>/capture-readiness.json` with native adapter kind, macos or windows platform, verified docs, screen recording, keyboard event logging, mouse event logging, redacted frame output, raw artifact ignore policy, and empty blockers.
- [ ] write `evals/runs/<tool>/<run-id>/screen-input-evidence.json` with native screen, keyboard, mouse, redaction, clean-data, local-raw-capture, and no-privileged-access confirmations.
- [ ] confirm `screen-input-evidence.json` points to the same-run `capture-readiness.json`.
- [ ] confirm the referenced normalized capture manifest contains sanitized raw artifact summaries for screen recording, keyboard event log, and mouse event log, includes no raw file paths, and lists redacted frame plus per-step input evidence for every step id in `step-trace.json`.
- [ ] confirm the referenced normalized capture manifest `flowPath` and `flowId` match `flow-evidence.json`.
- [ ] confirm normalized manifest raw artifact summaries do not contain path-like fields such as `path`, `rawPath`, or `localPath`, absolute local paths, `file://` paths, or raw/unsafe/tmp capture references.
- [ ] confirm every normalized manifest input event has `kind` set to `mouse` or `keyboard`, has a non-empty event name, and contains no api/backend/database/dom/mcp/selector fields.
- [ ] confirm each step's normalized manifest input evidence includes the same `anchorId` as that step's `actionPrimitive.targetAnchorId` in `step-trace.json`.
- [ ] confirm every normalized manifest redacted frame path and every `screen-input-evidence.json` redacted frame evidence path points to `captures/redacted/<capture-id>/frame-*.png`.
- [ ] confirm every `screen-input-evidence.json` redacted frame evidence path is listed in the normalized capture manifest.
- [ ] write `evals/runs/<tool>/<run-id>/outcome-evidence.json` with terminal state, completion, zero-help, zero-invention, no-privileged-access, held-out, and reviewer-signoff results.
- [ ] confirm `outcome-evidence.json` `stepCount` and `stepsCompleted` match the same-run `step-trace.json` step count and successful step count.
- [ ] confirm real-run shareable text artifacts, the referenced `flow.md`, and the referenced normalized manifest contain no forbidden email addresses, password assignments, token assignments, api key assignments, or session secret assignments.
- [ ] write a report under `evals/reports/`.
- [ ] run `pnpm --filter @onboardai/cli onboardai proof real-run <tool> <run-id>` and fix every finding.
- [ ] after the dry run passes, run `pnpm --filter @onboardai/cli onboardai proof real-run <tool> <run-id> --write-summary` to create the real-tool proof summary.
- [ ] only keep the real-tool proof summary if the eval reached the terminal business state with zero human help, zero invented steps, no privileged access, and reviewer acceptance.

## reviewer signoff checklist

the senior reviewer must inspect:

- [ ] the normalized `flow.md`.
- [ ] the redacted capture frames and normalized capture manifest.
- [ ] the normalized capture manifest contains no raw file paths and includes screen, keyboard, mouse, redacted frame, and per-step input evidence.
- [ ] the held-out eval recording or redacted frame sequence.
- [ ] `step-trace.json`.
- [ ] `flow-evidence.json`.
- [ ] `capture-readiness.json`.
- [ ] `screen-input-evidence.json`.
- [ ] the final screen artifact.
- [ ] `failure-log.md`.
- [ ] the eval report.
- [ ] the no-privileged-access statement.

the reviewer may sign off only if:

- [ ] every taught step was correct.
- [ ] every step id in `step-trace.json` has an explicit accepted line in `reviewer-checklist.md`.
- [ ] no required step was missing.
- [ ] the terminal business state was reached.
- [ ] terminal visible text matched the `flow.md` terminal business state.
- [ ] the user received zero human help during eval.
- [ ] no api, backend, database, dom, selector, mcp, or computer-use proof access was used.
- [ ] overlay guidance did not invent steps.
- [ ] every highlight was grounded in `flow.md` and shown only at confidence `0.75` or higher.
- [ ] every below-threshold state failed closed with the exact required message.
- [ ] raw capture remained local, unsafe-to-share, and excluded from git.

## templates

copy these templates into a real run folder, replacing `tool` and `replace-with-run-id` values:

```text
evals/templates/reports/real-tool-proof-odoo.json
evals/templates/reports/real-tool-proof-notion.json
evals/templates/runs/tool-run-id/step-trace.json
evals/templates/runs/tool-run-id/failure-log.md
evals/templates/runs/tool-run-id/reviewer-checklist.md
evals/templates/runs/tool-run-id/flow-evidence.json
evals/templates/runs/tool-run-id/capture-readiness.json
evals/templates/runs/tool-run-id/screen-input-evidence.json
evals/templates/runs/tool-run-id/outcome-evidence.json
```

do not copy the proof summary template into `evals/reports/real-tool-proof-*.json` until the real run artifacts exist and the reviewer has accepted every taught step.
