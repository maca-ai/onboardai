# agents

## project authority

this repo builds onboardai: a screen-only capture-to-teach prototype for api-less desktop and browser tools.

the goal is not to make a plausible flow document. the goal is to prove that one senior demonstration can be captured, normalized into `flow.md`, and used to guide a first-time user through the same workflow with no human help.

## source-of-truth order

when changing code or specs, use this authority order:

1. local repo code and tests
2. this `agents.md`
3. `.agent/plans.md`
4. `.agent/execplans/capture-teach-loop.md`
5. docs in `docs/`
6. installed dependency versions
7. official vendor documentation for those versions
8. context7 results for external-library behavior
9. public examples only if they match the installed version

never use training memory as authority for external api behavior, desktop permissions, tauri behavior, browser behavior, package behavior, or operating-system hooks.

## mandatory first actions

before making project files, run:

```sh
git init
```

then create a first commit only after the initial repo scaffold, ignore rules, docs, and test commands exist.

## hard boundaries

do not request, assume, or use api, mcp, backend, database, dom, browser selector, odoo api, notion api, or hidden application state access for the target tools.

the target claim is screen-plus-input observation only.

allowed capture inputs:

- screen recording
- redacted screenshots
- keyboard event logs
- mouse event logs
- optional human context notes from the senior demonstrator

not allowed for proof:

- playwright selectors
- dom inspection
- notion api
- odoo api
- backend database reads
- mcp access to the target tool
- computer-use automation as eval proof
- llm inference to fill missing steps during the deterministic eval

## safety boundary

v0 is not full pii compliance.

v0 must hard-redact before persisting redacted frames:

- passwords
- tokens
- api keys
- session secrets
- email addresses

allowed locally but tagged as business-sensitive:

- customer names
- file paths
- browser urls
- internal object names
- business record ids

raw capture artifacts may be retained locally until manually deleted by the user, but they are unsafe-to-share and must be excluded from git by default.

## overlay boundary

the overlay guides only. it must never click, type, submit, approve, delete, or mutate anything.

the overlay must show text instructions and highlight screen regions when the current screen state is recognized with confidence at or above `0.75`.

below `0.75`, it must fail closed and show exactly:

```text
screen state not recognized. ask a human or restart this step.
```

## eval boundary

a passed eval means:

- clean seeded demo data or a sanitized duplicate is used
- a first-time user, or the deterministic mock user harness, reaches the terminal business state defined in `flow.md`
- the user receives only overlay guidance
- no senior help is provided during the eval
- no api, backend, dom, selector, or mcp access is used
- every taught step is confirmed correct by the senior reviewer
- the same loop passes on both odoo and notion

a generated `flow.md` that looks plausible is not success.

## dependency policy

before changing code that depends on an external library, verify behavior through context7 or official vendor docs for the installed version.

if context7 is unavailable, stop and record the blocker in the execplan.

## teach engine policy

there is no existing fork url.

inspect `mattpocock/teach` before deciding whether to:

1. fork it
2. adapt ideas only
3. ignore it

do not hard-depend on a fork before inspection is complete.

## stack policy

primary stack:

- typescript
- pnpm
- tauri-first desktop shell
- markdown, yaml, and json file artifacts
- local filesystem persistence
- git-managed specs and source

allowed only if justified:

- rust for tauri-native capture, overlay, or input hooks
- electron if tauri blocks fast progress
- python for helper scripts

platform target:

- macos and windows in scope
- linux out of scope for v0, but do not intentionally block it

## work discipline

update `.agent/execplans/capture-teach-loop.md` after every meaningful change.

each iteration must record:

- what changed in capture or teaching
- what the eval showed
- completion rate
- where the user or harness got stuck
- which step the overlay misread
- the next best experiment

if blocked, stop and report:

- attempted approaches
- eval evidence gathered
- specific blocker
- input that would unlock progress

do not declare success on partial or untested results.

## git remote and push discipline

the canonical remote is:

```text
https://github.com/maca-ai/onboardai
```

the active feature branch is:

```text
codex/capture-teach-foundation
```

after every implementation run that creates a commit, push the current branch to github.

the final report for a committed implementation run must include:

- git push result
- upstream tracking branch
- `git rev-list --left-right --count <upstream>...<branch>` result
- `git status` summary

do not push secrets, raw captures, unsafe captures, tmp captures, or local environment files.
