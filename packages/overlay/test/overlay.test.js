import { test } from "node:test";
import assert from "node:assert/strict";
import * as overlay from "../dist/index.js";

const step = {
  "step-id": "step-001",
  title: "open the opportunity",
  "expected-state": {
    "screen-region-hints": [
      {
        "anchor-id": "pipeline-card",
        x: 10,
        y: 20,
        width: 30,
        height: 40,
        "source-frame": "captures/redacted/capture-001/frame-0001.png"
      }
    ]
  },
  instruction: {
    text: "select the opportunity card named demo opportunity.",
    "highlight-anchor-id": "pipeline-card",
    "allowed-guidance": ["text", "highlight"],
    "forbidden-guidance": ["click", "type", "submit", "approve", "delete", "automate"]
  },
  "user-action": {
    kind: "click",
    "target-anchor-id": "pipeline-card",
    "manual-only": true
  },
  "success-condition": {
    terminal: false
  },
  fallback: {
    "below-confidence-message": "screen state not recognized. ask a human or restart this step."
  }
};

test("overlay behavior fails closed below confidence 0.75", () => {
  const result = overlay.renderOverlayGuidance(step, 0.74);

  assert.equal(result.kind, "fail-closed");
  assert.equal(result.message, "screen state not recognized. ask a human or restart this step.");
  assert.equal(result.highlight, null);
  assert.equal(result.canAutomateInput, false);
});

test("overlay can show grounded text and highlight at or above confidence 0.75", () => {
  const result = overlay.renderOverlayGuidance(step, 0.75);

  assert.equal(result.kind, "instruction");
  assert.equal(result.message, step.instruction.text);
  assert.equal(result.highlight?.["anchor-id"], "pipeline-card");
  assert.equal(result.canAutomateInput, false);
});

test("overlay package does not expose click or type automation", () => {
  const exportedNames = Object.keys(overlay);

  assert.equal(exportedNames.some((name) => /\b(click|type|submit|approve|delete|automate)\b/i.test(name)), false);
});
