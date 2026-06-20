# safety policy

## scope

this policy defines the v0 safety boundary for onboardai.

v0 is a local prototype. it is not full pii compliance, not a security product, and not a replacement for legal or compliance review.

## capture classes

### raw capture

raw capture includes:

- screen recording
- keyboard event log
- mouse event log
- unredacted frames
- human context notes

raw capture is:

- local only
- unsafe-to-share
- retained until manually deleted by the user
- excluded from git by default
- never used as shareable evidence

### redacted artifact

redacted artifacts include:

- redacted screenshots
- normalized observations
- normalized `flow.md`
- eval evidence after redaction

redacted artifacts may be committed only if tests confirm forbidden persisted secrets are absent.

## forbidden persisted secrets

the following must be hard-redacted before shareable persistence:

- passwords
- tokens
- api keys
- session secrets
- email addresses

hard-redacted means the original value cannot be reconstructed from the persisted artifact.

## business-sensitive fields

the following may remain in local artifacts but must be tagged as business-sensitive when detected or manually marked:

- customer names
- file paths
- browser urls
- internal object names
- business record ids

these are not treated as hard-redaction targets in v0.

## explicit non-goal

v0 does not attempt full pii classification.

do not describe the system as pii-compliant.

## git policy

`.gitignore` must exclude at least:

```text
captures/raw/
captures/unsafe/
captures/tmp/
*.mp4
*.mov
*.webm
*.mkv
*.har
.env
.env.*
*.pem
*.key
```

do not commit raw capture artifacts.

## eval data policy

held-out evals must use:

- clean seeded demo data, or
- sanitized duplicate data

held-out evals must not use live customer data.

## overlay safety

the overlay must never:

- click
- type
- submit
- approve
- delete
- mutate application state
- execute hidden actions

the overlay may:

- show text instructions
- highlight regions
- show failure messages
- ask the user to restart a step
- ask the user to ask a human

## confidence safety

if current screen-state confidence is below `0.75`, the overlay must not highlight a target.

it must show exactly:

```text
screen state not recognized. ask a human or restart this step.
```

## proof safety

the eval proof must not use:

- odoo api
- notion api
- backend data
- database access
- dom inspection
- playwright selectors
- mcp access
- computer-use automation
- llm inference to guess missing actions

## failure behavior

if redaction, capture, overlay, or eval evidence is uncertain, the system must fail closed.

acceptable failure states:

- no highlight shown
- eval marked failed
- artifact marked unsafe-to-share
- report requests human input

unacceptable failure states:

- invented step shown
- below-threshold highlight shown
- raw secret persisted in shareable artifact
- eval declared successful without evidence
