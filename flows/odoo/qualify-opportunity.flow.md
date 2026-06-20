---
flow-id: odoo-qualify-opportunity
flow-version: 1
tool: odoo
tool-surface: browser-or-pwa
capture-id: capture-fixture-odoo-qualify-001
created-at: "2026-06-20t00:00:00z"
created-by-role: senior-demonstrator
terminal-business-state: demo opportunity visible with stage qualified
confidence-threshold: 0.75
data-class: clean-demo
raw-capture-policy: unsafe-to-share-local-only
redaction-policy: hard-secret-redaction-v0
supports-overlay-highlights: true
input-automation-allowed: false
---

# qualify opportunity

The senior demonstrator opened a clean odoo-like pipeline, selected the demo opportunity, moved it to qualified, and saved the visible stage change.

## step 1

Select the demo opportunity from the pipeline.

```json
{
  "step-id": "step-001",
  "title": "open the opportunity",
  "expected-state": {
    "visible-text": ["pipeline", "demo opportunity", "new"],
    "screen-region-hints": [
      {
        "anchor-id": "opportunity-card",
        "x": 112,
        "y": 180,
        "width": 320,
        "height": 90,
        "source-frame": "captures/redacted/odoo-qualify-opportunity/frame-0001.png"
      }
    ]
  },
  "instruction": {
    "text": "select the opportunity card named demo opportunity.",
    "highlight-anchor-id": "opportunity-card",
    "allowed-guidance": ["text", "highlight"],
    "forbidden-guidance": ["click", "type", "submit", "automate"]
  },
  "user-action": {
    "kind": "click",
    "target-anchor-id": "opportunity-card",
    "manual-only": true
  },
  "success-condition": {
    "visible-text": ["demo opportunity", "stage"],
    "terminal": false
  },
  "fallback": {
    "below-confidence-message": "screen state not recognized. ask a human or restart this step.",
    "restart-from-step": "step-001"
  }
}
```

## step 2

Change the opportunity stage to qualified.

```json
{
  "step-id": "step-002",
  "title": "choose qualified stage",
  "expected-state": {
    "visible-text": ["demo opportunity", "stage", "new", "qualified"],
    "screen-region-hints": [
      {
        "anchor-id": "qualified-stage",
        "x": 540,
        "y": 132,
        "width": 148,
        "height": 44,
        "source-frame": "captures/redacted/odoo-qualify-opportunity/frame-0002.png"
      }
    ]
  },
  "instruction": {
    "text": "select the qualified stage.",
    "highlight-anchor-id": "qualified-stage",
    "allowed-guidance": ["text", "highlight"],
    "forbidden-guidance": ["click", "type", "submit", "automate"]
  },
  "user-action": {
    "kind": "click",
    "target-anchor-id": "qualified-stage",
    "manual-only": true
  },
  "success-condition": {
    "visible-text": ["demo opportunity", "qualified", "unsaved changes"],
    "terminal": false
  },
  "fallback": {
    "below-confidence-message": "screen state not recognized. ask a human or restart this step.",
    "restart-from-step": "step-002"
  }
}
```

## step 3

Save the visible qualified stage.

```json
{
  "step-id": "step-003",
  "title": "save the qualified stage",
  "expected-state": {
    "visible-text": ["demo opportunity", "stage", "qualified", "unsaved changes"],
    "screen-region-hints": [
      {
        "anchor-id": "save-button",
        "x": 34,
        "y": 88,
        "width": 92,
        "height": 40,
        "source-frame": "captures/redacted/odoo-qualify-opportunity/frame-0003.png"
      }
    ]
  },
  "instruction": {
    "text": "save the opportunity so the qualified stage remains visible.",
    "highlight-anchor-id": "save-button",
    "allowed-guidance": ["text", "highlight"],
    "forbidden-guidance": ["click", "type", "submit", "automate"]
  },
  "user-action": {
    "kind": "click",
    "target-anchor-id": "save-button",
    "manual-only": true
  },
  "success-condition": {
    "visible-text": ["demo opportunity", "qualified", "saved"],
    "terminal": true
  },
  "fallback": {
    "below-confidence-message": "screen state not recognized. ask a human or restart this step.",
    "restart-from-step": "step-003"
  }
}
```

## evidence

- redacted frames: `captures/redacted/odoo-qualify-opportunity/`
- eval run: `evals/runs/odoo/fixture-odoo-qualify-001/`

## safety

- raw capture policy: unsafe-to-share local only
- input automation allowed: false
- proof access: screen observations and simulated low-level fixture input only
