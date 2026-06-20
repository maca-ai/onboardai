# teach engine decision

## source inspected

- local skill: `/Users/mc/.codex/skills/teach/SKILL.md`
- date: 2026-06-20
- network inspection of `https://github.com/mattpocock/teach.git` was attempted and blocked by denied network approval, so the local installed skill is the available inspection source for this milestone.

## findings

The local `teach` skill defines a teaching workspace, not a runtime capture or desktop overlay engine. Its useful pieces are conceptual:

- mission-grounded lessons
- durable learning records
- reference documents
- tight feedback loops
- retrieval practice and progressive difficulty

It does not provide primitives for screen recording, input event logging, secret redaction, flow parsing, overlay rendering, confidence gating, or deterministic held-out eval evidence.

## decision

Adapt ideas only.

## rationale

The onboardai proof needs a screen-plus-input capture pipeline, normalized `flow.md`, a no-automation overlay, and deterministic eval evidence. The local teach skill can inform reviewer checklists and feedback-loop discipline, but taking a fork or hard dependency would not directly solve the capture-to-teach contract.

## dependency impact

No dependency or fork is added.
