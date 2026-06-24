# flow format

## purpose

`flow.md` is the normalized artifact created from one senior demonstration.

it must be readable by humans and strict enough for machines.

## file model

a flow file is markdown with:

1. yaml frontmatter
2. human-readable overview
3. one embedded json block per step
4. evidence references
5. safety tags

## naming

use lower-case kebab-case file names.

examples:

```text
flows/odoo/qualify-opportunity.flow.md
flows/notion/update-task-status.flow.md
```

## yaml frontmatter

required frontmatter fields:

```yaml
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
```

## step markdown

each step should have:

- step number
- plain-language instruction
- expected visible state
- user action
- success condition
- fallback message
- embedded json block

## embedded json block

example:

```json
{
  "step-id": "step-001",
  "title": "open the opportunity",
  "expected-state": {
    "visible-text": ["pipeline", "new opportunity"],
    "forbidden-visible-secrets": true,
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
```

## required step fields

each step json object must include:

- `step-id`
- `title`
- `expected-state`
- `instruction`
- `user-action`
- `success-condition`
- `fallback`

## terminal rule

each `flow.md` must include exactly one step with `success-condition.terminal: true`.

that terminal step's `success-condition.visible-text` is the screen-observed evidence for the
frontmatter `terminal-business-state`. real-run `outcome-evidence.json` must match this terminal
visible text instead of using a summary boolean alone.

## anchor rules

anchors must reference redacted frames, not raw frames.

anchors must include:

- anchor id
- source frame
- region coordinates
- visible evidence or description

anchors must not contain hard-redacted secret values.

`instruction.highlight-anchor-id` and `user-action.target-anchor-id`, when present, must match an
anchor id in the same step's `expected-state.screen-region-hints`. The overlay and harness may not
use an anchor that was not grounded in captured redacted frame evidence for that step.

## confidence behavior

if the current screen state matches the expected state with confidence at or above `0.75`, the overlay may show the instruction and highlight.

if confidence is below `0.75`, the overlay must not show a target highlight.

it must show exactly:

```text
screen state not recognized. ask a human or restart this step.
```

## multiple flows

v0 must support multiple flows from day one.

the flow library is a directory of files, not a database.

search is filesystem search plus optional llm ranking.

the implemented local search ranks parsed flow files using path, frontmatter, step titles, instructions, expected visible text, and success visible text.

search results must be derived from local `flow.md` file contents.

do not use embeddings or a vector database.

## invalid flow examples

a flow is invalid if:

- a step has no success condition
- a step has no fallback
- a highlight has no source frame
- a source frame points to raw capture
- an instruction highlight or user-action target references an undefined anchor
- instruction text asks the system to click or type
- confidence threshold is missing
- terminal business state is missing
- tool is missing
- embedded json is malformed
- a hard-redacted secret appears in persisted data
