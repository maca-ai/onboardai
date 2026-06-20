import { test } from "node:test";
import assert from "node:assert/strict";
import { validateFlowMarkdown } from "../dist/index.js";

const validFlow = `---
flow-id: odoo-qualify-opportunity
flow-version: 1
tool: odoo
tool-surface: browser-or-pwa
capture-id: capture-2026-06-20-001
created-at: "2026-06-20t00:00:00z"
created-by-role: senior-demonstrator
terminal-business-state: opportunity-visible-as-qualified
confidence-threshold: 0.75
data-class: clean-demo
raw-capture-policy: unsafe-to-share-local-only
redaction-policy: hard-secret-redaction-v0
supports-overlay-highlights: true
input-automation-allowed: false
---

# qualify opportunity

\`\`\`json
{
  "step-id": "step-001",
  "title": "open the opportunity",
  "expected-state": {
    "visible-text": ["pipeline", "demo opportunity"],
    "screen-region-hints": [
      {
        "anchor-id": "pipeline-card",
        "x": 120,
        "y": 240,
        "width": 320,
        "height": 90,
        "source-frame": "captures/redacted/capture-2026-06-20-001/frame-0003.png"
      }
    ]
  },
  "instruction": {
    "text": "select the opportunity card named demo opportunity.",
    "highlight-anchor-id": "pipeline-card",
    "allowed-guidance": ["text", "highlight"],
    "forbidden-guidance": ["click", "type", "submit", "automate"]
  },
  "user-action": {
    "kind": "click",
    "target-anchor-id": "pipeline-card",
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
\`\`\`
`;

test("a minimal valid flow.md parses and validates", () => {
  const result = validateFlowMarkdown(validFlow);

  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.document?.steps.length, 1);
  assert.equal(result.document?.frontmatter.tool, "odoo");
});

test("an invalid flow.md fails validation", () => {
  const invalidFlow = validFlow.replace(/,\n  "success-condition": \{[\s\S]*?\n  \}/, "");
  const result = validateFlowMarkdown(invalidFlow);

  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.includes("success-condition")), true);
});
