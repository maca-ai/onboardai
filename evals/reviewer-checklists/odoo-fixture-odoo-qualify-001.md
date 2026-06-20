# reviewer checklist

## run

- tool: odoo
- flow id: odoo-qualify-opportunity
- run id: fixture-odoo-qualify-001
- reviewer: fixture senior reviewer
- date: 2026-06-20

## evidence reviewed

- final screen: evals/runs/odoo/fixture-odoo-qualify-001/final-screen.png
- step trace: evals/runs/odoo/fixture-odoo-qualify-001/step-trace.json
- capture-to-flow mapping: flows/odoo/qualify-opportunity.flow.md
- eval recording: evals/runs/odoo/fixture-odoo-qualify-001/eval-recording.mp4
- failure log: evals/runs/odoo/fixture-odoo-qualify-001/failure-log.md

## checks

- [x] each taught step was correct
- [x] no required step was missing
- [x] terminal business state was reached
- [x] no human help was used during eval
- [x] no api/backend/dom/selector/mcp access was used
- [x] overlay did not invent steps
- [x] below-threshold behavior failed closed

## reviewer verdict

- accepted: true
- rejected: false
- notes: deterministic fixture senior review accepted each taught step only if the harness reached the terminal visible business state with no violations.
