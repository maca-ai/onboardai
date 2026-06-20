---
flow-id: notion-update-task-status
flow-version: 1
tool: notion
tool-surface: desktop-or-browser
capture-id: capture-fixture-notion-ready-review-001
created-at: "2026-06-20t00:00:00z"
created-by-role: senior-demonstrator
terminal-business-state: demo task visible with status ready for review
confidence-threshold: 0.75
data-class: clean-demo
raw-capture-policy: unsafe-to-share-local-only
redaction-policy: hard-secret-redaction-v0
supports-overlay-highlights: true
input-automation-allowed: false
---

# update task status

The senior demonstrator opened a clean notion-like task list, selected the demo task, changed the status, and confirmed the visible page state.

## step 1

Open the demo task from the project task list.

```json
{
  "step-id": "step-001",
  "title": "open the demo task",
  "expected-state": {
    "visible-text": ["project tasks", "demo task", "status: not started"],
    "screen-region-hints": [
      {
        "anchor-id": "demo-task-row",
        "x": 88,
        "y": 210,
        "width": 520,
        "height": 48,
        "source-frame": "captures/redacted/notion-update-task-status/frame-0001.png"
      }
    ]
  },
  "instruction": {
    "text": "select the row for demo task.",
    "highlight-anchor-id": "demo-task-row",
    "allowed-guidance": ["text", "highlight"],
    "forbidden-guidance": ["click", "type", "submit", "automate"]
  },
  "user-action": {
    "kind": "click",
    "target-anchor-id": "demo-task-row",
    "manual-only": true
  },
  "success-condition": {
    "visible-text": ["demo task", "status", "not started"],
    "terminal": false
  },
  "fallback": {
    "below-confidence-message": "screen state not recognized. ask a human or restart this step.",
    "restart-from-step": "step-001"
  }
}
```

## step 2

Open the status property.

```json
{
  "step-id": "step-002",
  "title": "open status choices",
  "expected-state": {
    "visible-text": ["demo task", "status", "not started", "ready for review"],
    "screen-region-hints": [
      {
        "anchor-id": "status-property",
        "x": 260,
        "y": 156,
        "width": 220,
        "height": 42,
        "source-frame": "captures/redacted/notion-update-task-status/frame-0002.png"
      }
    ]
  },
  "instruction": {
    "text": "open the status property.",
    "highlight-anchor-id": "status-property",
    "allowed-guidance": ["text", "highlight"],
    "forbidden-guidance": ["click", "type", "submit", "automate"]
  },
  "user-action": {
    "kind": "click",
    "target-anchor-id": "status-property",
    "manual-only": true
  },
  "success-condition": {
    "visible-text": ["status", "ready for review"],
    "terminal": false
  },
  "fallback": {
    "below-confidence-message": "screen state not recognized. ask a human or restart this step.",
    "restart-from-step": "step-002"
  }
}
```

## step 3

Choose ready for review.

```json
{
  "step-id": "step-003",
  "title": "choose ready for review",
  "expected-state": {
    "visible-text": ["status", "not started", "ready for review"],
    "screen-region-hints": [
      {
        "anchor-id": "ready-for-review-option",
        "x": 294,
        "y": 252,
        "width": 236,
        "height": 38,
        "source-frame": "captures/redacted/notion-update-task-status/frame-0003.png"
      }
    ]
  },
  "instruction": {
    "text": "select ready for review.",
    "highlight-anchor-id": "ready-for-review-option",
    "allowed-guidance": ["text", "highlight"],
    "forbidden-guidance": ["click", "type", "submit", "automate"]
  },
  "user-action": {
    "kind": "click",
    "target-anchor-id": "ready-for-review-option",
    "manual-only": true
  },
  "success-condition": {
    "visible-text": ["demo task", "status", "ready for review"],
    "terminal": true
  },
  "fallback": {
    "below-confidence-message": "screen state not recognized. ask a human or restart this step.",
    "restart-from-step": "step-003"
  }
}
```

## evidence

- redacted frames: `captures/redacted/notion-update-task-status/`
- eval run: `evals/runs/notion/fixture-notion-ready-review-001/`

## safety

- raw capture policy: unsafe-to-share local only
- input automation allowed: false
- proof access: screen observations and simulated low-level fixture input only
