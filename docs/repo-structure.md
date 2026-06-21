# repo structure

## target layout

```text
onboardai/
  agents.md
  codex-goal.md
  codex-kickoff-prompt.md
  package.json
  pnpm-workspace.yaml
  .gitignore
  .agent/
    plans.md
    execplans/
      capture-teach-loop.md
  apps/
    desktop/
  packages/
    capture/
    redaction/
    flow/
    overlay/
    eval-harness/
    fixtures/
    cli/
  docs/
    product-brief.md
    safety-policy.md
    eval-protocol.md
    flow-format.md
    repo-structure.md
    context7-policy.md
    eval-fixtures.md
    real-eval-runbook.md
  flows/
    odoo/
    notion/
  evals/
    runs/
    reports/
    reviewer-checklists/
    templates/
  captures/
    raw/
    redacted/
    normalized/
```

## package responsibilities

### apps/desktop

tauri-first desktop shell.

responsibilities:

- display capture controls
- display overlay or sidecar
- coordinate local capture permissions
- run only local workflows

fallback:

- if native overlay blocks progress, implement sidecar first
- if tauri blocks fast progress, document why electron is needed before switching

### packages/capture

responsibilities:

- capture metadata model
- screen recording interface
- input event log interface
- frame extraction interface
- unsafe artifact labeling

does not:

- perform redaction
- infer workflow semantics

### packages/redaction

responsibilities:

- hard-redact forbidden persisted secrets
- detect email addresses
- detect common token and key patterns
- tag business-sensitive values when possible
- expose testable redaction functions

does not:

- claim full pii compliance

### packages/flow

responsibilities:

- parse `flow.md`
- validate yaml frontmatter
- validate embedded json steps
- validate anchors
- validate confidence threshold
- search flow library through local files
- expose library api

does not:

- use embeddings
- use vector database

### packages/overlay

responsibilities:

- render instruction text
- render highlight regions
- enforce confidence threshold
- show fail-closed message
- guarantee guidance comes from `flow.md`

does not:

- click
- type
- submit
- mutate target tools

### packages/eval-harness

responsibilities:

- deterministic mock user harness
- fixture state transitions
- simulated low-level input primitives
- step trace
- completion report
- ambiguity failure

does not:

- use llm inference
- inspect dom
- use selectors
- call apis
- use mcp access

### packages/fixtures

responsibilities:

- odoo-like clean fixture
- notion-like clean fixture
- seeded demo data
- screen-state observations
- expected terminal business state

### packages/cli

responsibilities:

- expose repo commands
- validate flows
- search flow library
- run evals
- produce reports

## git ignore requirements

`.gitignore` must exclude:

```text
node_modules/
dist/
.turbo/
coverage/
.env
.env.*
*.pem
*.key
captures/raw/
captures/unsafe/
captures/tmp/
*.mp4
*.mov
*.webm
*.mkv
*.har
.ds-store
```

## script expectations

expected scripts:

```json
{
  "scripts": {
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "flow:validate": "pnpm --filter @onboardai/cli onboardai flow validate flows",
    "flow:search": "pnpm --filter @onboardai/cli onboardai flow search",
    "eval:odoo": "pnpm --filter @onboardai/cli onboardai eval run odoo",
    "eval:notion": "pnpm --filter @onboardai/cli onboardai eval run notion"
  }
}
```

codex may adjust actual script names, but must keep equivalent behavior.

## naming

use lower-case kebab-case for files and package names.

avoid underscores, camel case, and pascal case in project-created file names unless required by external tooling.

## first commit target

the first commit should include:

- repo scaffold
- docs
- `.gitignore`
- package manager files
- baseline tests
- active execplan

it should not include raw capture artifacts.
