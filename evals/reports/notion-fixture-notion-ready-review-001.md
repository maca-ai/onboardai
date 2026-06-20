# eval report

## run

- tool name: notion
- flow id: notion-update-task-status
- run id: fixture-notion-ready-review-001
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
- final terminal business state: demo task visible with status ready for review
- terminal business state reached: true
- reviewer signoff result: accepted

## evidence

- step trace: evals/runs/notion/fixture-notion-ready-review-001/step-trace.json
- final screen: evals/runs/notion/fixture-notion-ready-review-001/final-screen.png
- normalized capture manifest: captures/normalized/capture-fixture-notion-ready-review-001/manifest.json
- eval recording marker: evals/runs/notion/fixture-notion-ready-review-001/eval-recording.mp4
- failure log: evals/runs/notion/fixture-notion-ready-review-001/failure-log.md

## proof boundary

This fixture eval used only screen observations from the fixture and simulated low-level input primitives. It did not use APIs, backend access, database reads, DOM inspection, browser selectors, target-tool MCP, computer-use automation, embeddings, vector search, or LLM inference.
