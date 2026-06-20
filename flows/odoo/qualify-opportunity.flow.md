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

# odoo qualify opportunity

This normalized flow was generated from one senior demonstration using screen recording, keyboard and mouse event logs, and optional senior notes. Raw capture artifacts are unsafe-to-share and excluded from git; anchors reference redacted frame paths only.

## step 1

select the opportunity card named demo opportunity.

```json
{
  "step-id": "step-001",
  "title": "open the opportunity",
  "expected-state": {
    "visible-text": [
      "pipeline",
      "demo opportunity",
      "new"
    ],
    "forbidden-visible-secrets": true,
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
    "allowed-guidance": [
      "text",
      "highlight"
    ],
    "forbidden-guidance": [
      "click",
      "type",
      "submit",
      "automate"
    ]
  },
  "user-action": {
    "kind": "click",
    "target-anchor-id": "opportunity-card",
    "manual-only": true
  },
  "success-condition": {
    "visible-text": [
      "demo opportunity",
      "stage"
    ],
    "terminal": false
  },
  "fallback": {
    "below-confidence-message": "screen state not recognized. ask a human or restart this step.",
    "restart-from-step": "step-001"
  }
}
```

## step 2

select the qualified stage.

```json
{
  "step-id": "step-002",
  "title": "choose qualified stage",
  "expected-state": {
    "visible-text": [
      "demo opportunity",
      "stage",
      "new",
      "qualified"
    ],
    "forbidden-visible-secrets": true,
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
    "allowed-guidance": [
      "text",
      "highlight"
    ],
    "forbidden-guidance": [
      "click",
      "type",
      "submit",
      "automate"
    ]
  },
  "user-action": {
    "kind": "click",
    "target-anchor-id": "qualified-stage",
    "manual-only": true
  },
  "success-condition": {
    "visible-text": [
      "demo opportunity",
      "qualified",
      "unsaved changes"
    ],
    "terminal": false
  },
  "fallback": {
    "below-confidence-message": "screen state not recognized. ask a human or restart this step.",
    "restart-from-step": "step-002"
  }
}
```

## step 3

save the opportunity so the qualified stage remains visible.

```json
{
  "step-id": "step-003",
  "title": "save the qualified stage",
  "expected-state": {
    "visible-text": [
      "demo opportunity",
      "stage",
      "qualified",
      "unsaved changes"
    ],
    "forbidden-visible-secrets": true,
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
    "allowed-guidance": [
      "text",
      "highlight"
    ],
    "forbidden-guidance": [
      "click",
      "type",
      "submit",
      "automate"
    ]
  },
  "user-action": {
    "kind": "click",
    "target-anchor-id": "save-button",
    "manual-only": true
  },
  "success-condition": {
    "visible-text": [
      "demo opportunity",
      "qualified",
      "saved"
    ],
    "terminal": true
  },
  "fallback": {
    "below-confidence-message": "screen state not recognized. ask a human or restart this step.",
    "restart-from-step": "step-003"
  }
}
```


## senior notes

fixture senior demonstrated qualifying the visible demo opportunity.

## evidence

- raw capture: local unsafe artifacts under ignored capture paths
- redacted frames: captures/redacted/odoo-qualify-opportunity
- input logs: keyboard and mouse event logs captured in raw artifacts

## safety

- raw capture policy: unsafe-to-share local only
- input automation allowed: false
- proof access: screen observations and simulated low-level fixture input only
