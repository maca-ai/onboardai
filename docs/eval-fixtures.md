# eval fixtures

## purpose

fixtures allow the repo to be built before real odoo and notion environments are available.

fixtures are not the final proof by themselves. they are the v0 falsification substrate for the deterministic mock user harness.

## fixture principles

fixtures must be:

- clean
- seeded
- deterministic
- screen-observation based
- free of live customer data
- strict enough to fail incomplete flows
- explicit enough to verify terminal business state

fixtures must not expose:

- dom selectors as proof
- backend state as proof
- api access as proof
- hidden object ids as proof

## odoo-like fixture

### target surface

browser or pwa-like surface.

### candidate workflow

qualify a sales opportunity.

### seed state

visible starting state:

```text
pipeline
demo opportunity
new
```

### intended steps

1. open the opportunity card.
2. change stage to qualified.
3. save or confirm the visible stage change.

### terminal business state

```text
demo opportunity visible with stage qualified
```

### fixture observations

the fixture should expose only screen observations such as:

- visible text
- approximate regions
- redacted frame references
- confidence score inputs

### forbidden proof

the eval must not prove success by reading:

- dom
- odoo backend
- odoo api
- database
- selectors

## notion-like fixture

### target surface

desktop app or browser-like surface.

### candidate workflow

update a task page status.

### seed state

visible starting state:

```text
project tasks
demo task
status: not started
```

### intended steps

1. open the demo task.
2. change status to ready for review.
3. confirm the page shows the new status.

### terminal business state

```text
demo task visible with status ready for review
```

### fixture observations

the fixture should expose only screen observations such as:

- visible text
- approximate regions
- redacted frame references
- confidence score inputs

### forbidden proof

the eval must not prove success by reading:

- dom
- notion api
- local notion database
- browser selectors
- backend state

## deterministic harness requirements

the harness may execute simulated primitives:

- move pointer to region
- click region
- type provided text
- press key
- wait for next screen observation

these primitives are allowed only inside fixtures.

the harness must fail if:

- a target region is missing
- multiple target regions match
- required visible state is absent
- confidence is below `0.75`
- flow instruction is missing
- flow instruction conflicts with expected state
- an action requires hidden state

## fixture eval reports

each fixture run must output:

- step trace
- current screen observation per step
- overlay instruction per step
- confidence per step
- action primitive used
- resulting screen observation
- final screen
- pass or fail result
- failure reason if any

## migration to real tools

when real odoo and notion become available, keep fixtures.

fixtures remain useful for regression tests.

real-tool captures must still use clean or sanitized eval data for held-out proof.
