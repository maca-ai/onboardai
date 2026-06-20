# two-tool fixture proof

## summary

- proof substrate: deterministic clean fixtures
- tools passed: 2/2
- steps completed: 6/6
- below-threshold events: 0
- human-help incidents: 0
- invented-step incidents: 0
- api/backend/dom/selector/mcp violations: none
- held-out eval runs: 2/2
- fixture proof result: passed
- real-tool proof result: not run

## confirmed fixture capability

The fixture loop demonstrates that one senior demonstration record can be normalized into `flow.md`, linked to a normalized capture manifest, and used by the deterministic mock user harness to complete the same workflow using overlay guidance only.

Each fixture eval used only:

- generated `flow.md`
- normalized capture manifest
- redacted frame references
- held-out visible screen-observation text
- explicit simulated low-level fixture input transitions

No eval used APIs, backend access, database reads, DOM inspection, browser selectors, target-tool MCP, computer-use automation, embeddings, vector search, or LLM inference.

## tool results

### odoo

- flow id: odoo-qualify-opportunity
- run id: fixture-odoo-qualify-001
- passed: true
- completion rate: 1
- steps completed: 3/3
- first stuck step: none
- overlay confidence per step: step-001=1, step-002=1, step-003=1
- overlay misreads: none
- terminal business state: demo opportunity visible with stage qualified
- terminal expected visible text: demo opportunity, stage, qualified, saved
- terminal missing visible text: none
- terminal business state reached: true
- held out from capture frames: true
- reviewer signoff: accepted
- flow: flows/odoo/qualify-opportunity.flow.md
- normalized capture manifest: captures/normalized/capture-fixture-odoo-qualify-001/manifest.json
- eval report: evals/reports/odoo-fixture-odoo-qualify-001.md
- reviewer checklist: evals/reviewer-checklists/odoo-fixture-odoo-qualify-001.md

### notion

- flow id: notion-update-task-status
- run id: fixture-notion-ready-review-001
- passed: true
- completion rate: 1
- steps completed: 3/3
- first stuck step: none
- overlay confidence per step: step-001=1, step-002=1, step-003=1
- overlay misreads: none
- terminal business state: demo task visible with status ready for review
- terminal expected visible text: demo task, status, ready for review
- terminal missing visible text: none
- terminal business state reached: true
- held out from capture frames: true
- reviewer signoff: accepted
- flow: flows/notion/update-task-status.flow.md
- normalized capture manifest: captures/normalized/capture-fixture-notion-ready-review-001/manifest.json
- eval report: evals/reports/notion-fixture-notion-ready-review-001.md
- reviewer checklist: evals/reviewer-checklists/notion-fixture-notion-ready-review-001.md


## shared teaching primitives

- yaml frontmatter defines tool, capture id, terminal business state, confidence threshold, redaction policy, and input automation policy
- embedded JSON step data defines expected visible state, grounded instruction text, manual user action, success condition, and fail-closed fallback
- overlay guidance is text plus region highlight only
- screen-state confidence is computed from visible text in fixture observations
- terminal business state is accepted only when explicit terminal visible text appears on the held-out final screen observation
- confidence below `0.75` fails closed instead of showing a target
- fixture user action is matched against explicit manual transition data
- reviewer checklist accepts only completed evals with terminal visible business state and no violations

## tool-specific fixture differences

- odoo-like fixture workflow: open opportunity, select qualified stage, save visible qualified state
- notion-like fixture workflow: open task, open status property, select ready for review
- both workflows use three manual click transitions, but different visible text, anchors, terminal states, and redacted frame paths

## unproven limits

- Real odoo and notion environments are not available in this repo.
- Native screen recording, frame extraction, keyboard event capture, mouse event capture, and desktop overlay behavior are not implemented yet.
- The raw screen recording and `.mp4` eval recording files in fixture runs are local ignored markers, not native target-tool recordings.
- Fixture proof is not full production reliability and is not full PII compliance.

## next experiment

Implement a real local capture adapter spike that writes raw screen recording, keyboard log, mouse log, redacted frame metadata, and a normalized capture manifest using the same artifact contracts, then rerun this proof against the adapter output.
