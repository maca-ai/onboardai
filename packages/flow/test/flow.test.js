import { test } from "node:test";
import assert from "node:assert/strict";
import { searchFlowDocumentDetails, searchFlowDocuments, validateFlowMarkdown } from "../dist/index.js";

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
    "terminal": true
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

test("a flow with no terminal step fails validation", () => {
  const invalidFlow = validFlow.replace('"terminal": true', '"terminal": false');
  const result = validateFlowMarkdown(invalidFlow);

  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.includes("exactly one terminal step")), true);
});

test("a flow with multiple terminal steps fails validation", () => {
  const secondStep = validFlow
    .match(/```json[\s\S]*?```/)?.[0]
    .replace('"step-id": "step-001"', '"step-id": "step-002"')
    .replace('"title": "open the opportunity"', '"title": "save the opportunity"');
  assert.equal(typeof secondStep, "string");

  const invalidFlow = `${validFlow}\n${secondStep}`;
  const result = validateFlowMarkdown(invalidFlow);

  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.includes("exactly one terminal step")), true);
});

test("a flow with an ungrounded highlight anchor fails validation", () => {
  const invalidFlow = validFlow.replace('"highlight-anchor-id": "pipeline-card"', '"highlight-anchor-id": "missing-card"');
  const result = validateFlowMarkdown(invalidFlow);

  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.includes("highlight anchor missing-card is not defined")), true);
});

test("a flow with an ungrounded user-action target anchor fails validation", () => {
  const invalidFlow = validFlow.replace('"target-anchor-id": "pipeline-card"', '"target-anchor-id": "missing-card"');
  const result = validateFlowMarkdown(invalidFlow);

  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.includes("target anchor missing-card is not defined")), true);
});

test("a flow with a missing anchor source frame fails validation without throwing", () => {
  const invalidFlow = validFlow.replace(
    ',\n        "source-frame": "captures/redacted/capture-2026-06-20-001/frame-0003.png"',
    ""
  );
  const result = validateFlowMarkdown(invalidFlow);

  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.includes("anchor pipeline-card is missing source-frame")), true);
});

test("flow search ranks local flow files by parsed flow evidence", () => {
  const files = [
    { path: "flows/odoo/qualify-opportunity.flow.md", content: validFlow },
    {
      path: "flows/notion/update-task-status.flow.md",
      content: validFlow
        .replace("flow-id: odoo-qualify-opportunity", "flow-id: notion-update-task-status")
        .replace("tool: odoo", "tool: notion")
        .replace("opportunity-visible-as-qualified", "demo task visible with status ready for review")
        .replace("# qualify opportunity", "# update task status")
        .replace("open the opportunity", "choose ready for review")
        .replace("select the opportunity card named demo opportunity.", "select ready for review on the demo task.")
    }
  ];

  const results = searchFlowDocumentDetails(files, "ready review task");

  assert.equal(results[0].path, "flows/notion/update-task-status.flow.md");
  assert.equal(results.length, 1);
  assert.equal(results[0].matches.some((match) => match.field === "terminal-business-state"), true);
  assert.deepEqual(searchFlowDocuments(files, "ready review task"), ["flows/notion/update-task-status.flow.md"]);
});

test("flow search returns no results for unrelated local queries", () => {
  const results = searchFlowDocumentDetails([{ path: "flows/odoo/qualify-opportunity.flow.md", content: validFlow }], "invoice refund");

  assert.deepEqual(results, []);
});
