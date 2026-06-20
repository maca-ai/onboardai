# product brief

## product name

onboardai

## one-sentence claim

onboardai turns one senior demonstration in an api-less desktop or browser tool into a grounded step-by-step teaching overlay that a first-time user can follow.

## primary goal

prove the capture-to-teach loop on two api-less tools:

- odoo
- notion

the loop is complete only when a held-out teaching eval passes on both tools.

## target workflow

a senior demonstrates one short workflow of about three steps.

the system observes:

- screen recording
- keyboard events
- mouse events
- optional human context notes

the system saves:

- raw capture locally as unsafe-to-share
- redacted frames
- normalized `flow.md`

then a first-time user completes the same workflow using only the overlay guidance.

## non-goals

v0 does not attempt to:

- integrate with odoo api
- integrate with notion api
- use mcp access to target tools
- inspect dom or browser selectors
- use backend or database access
- fully classify pii
- automate clicks or typing
- prove production reliability
- support linux as a target platform
- use a vector database
- use embeddings

## success condition

success requires all of the following:

- clean or sanitized eval data
- valid `flow.md`
- secret redaction before shareable persistence
- overlay guidance grounded only in `flow.md`
- screen-region highlights
- no automation of user input
- fail-closed behavior below confidence `0.75`
- deterministic held-out eval passes on odoo
- deterministic held-out eval passes on notion
- senior reviewer signs off each taught step

## why two tools matter

one tool can be solved with shortcuts. two different tools force the capture and teaching layer to generalize beyond one interface.

the point is not odoo or notion specifically. the point is a tool-agnostic proof that screen-only teaching can work without privileged integration.

## user roles

### senior demonstrator

the person who knows the workflow and performs it once during capture.

### first-time user

a person who has never performed the captured process before.

### reviewer

the senior or domain owner who confirms that the taught steps were correct.

### builder

codex or another agent implementing the repo under gate discipline.

## v0 business state examples

actual fixture workflows must be finalized in the repo, but suitable examples are:

### odoo-like fixture

create or update a sales opportunity so it reaches a visible terminal state such as:

```text
opportunity moved to qualified
```

### notion-like fixture

create or update a task page so it reaches a visible terminal state such as:

```text
task status changed to ready for review
```

the final state must be visible on screen and verifiable without api, dom, or backend access.

## product risks

### risk: plausible but wrong flow

mitigation: success requires held-out eval evidence, not document appearance.

### risk: secret leakage

mitigation: hard-redact secrets and email addresses before shareable persistence.

### risk: wrong overlay highlight

mitigation: confidence threshold and fail-closed behavior.

### risk: privileged eval proof

mitigation: deterministic mock user harness, no llm inference, no dom, no selectors, no apis.

### risk: tool-specific shortcut

mitigation: two-tool eval requirement.
