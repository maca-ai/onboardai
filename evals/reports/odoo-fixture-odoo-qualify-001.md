# eval report

## run

- tool name: odoo
- flow id: odoo-qualify-opportunity
- run id: fixture-odoo-qualify-001
- completion result: passed
- completion rate: 1
- number of steps: 3
- steps completed: 3
- steps failed: 0
- first stuck step: none
- overlay confidence per step: step-001=1, step-002=1, step-003=1
- below-threshold events: 0
- overlay misreads: none
- invented-step incidents: 0
- human-help incidents: 0
- api/backend/dom/selector violations: none
- final terminal business state: demo opportunity visible with stage qualified
- terminal business state reached: true
- reviewer signoff result: accepted

## evidence

- step trace: evals/runs/odoo/fixture-odoo-qualify-001/step-trace.json
- final screen: evals/runs/odoo/fixture-odoo-qualify-001/final-screen.png
- normalized capture manifest: captures/normalized/capture-fixture-odoo-qualify-001/manifest.json
- eval recording marker: evals/runs/odoo/fixture-odoo-qualify-001/eval-recording.mp4
- failure log: evals/runs/odoo/fixture-odoo-qualify-001/failure-log.md

## proof boundary

This fixture eval used only screen observations from the fixture and simulated low-level input primitives. It did not use APIs, backend access, database reads, DOM inspection, browser selectors, target-tool MCP, computer-use automation, embeddings, vector search, or LLM inference.
