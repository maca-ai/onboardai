# context7 policy

## purpose

external-library behavior must be verified before code depends on it.

this protects the repo from stale assumptions about package apis, tauri behavior, desktop permissions, markdown parsing, yaml parsing, test runners, and cross-platform capture or overlay libraries.

## rule

before changing code that depends on an external library, verify the relevant behavior through context7 or official vendor docs for the installed version.

## required verification points

verify before implementing:

- tauri window behavior
- tauri permissions
- tauri plugins
- rust native hooks
- screenshot or screen-capture libraries
- keyboard event capture libraries
- mouse event capture libraries
- overlay or always-on-top window behavior
- markdown parser behavior
- yaml frontmatter parser behavior
- json schema validation behavior
- ripgrep wrapper behavior
- test runner behavior
- packaging behavior for macos and windows

## evidence to record

when verification is performed, record in the execplan:

- library name
- installed version or target version
- behavior checked
- source used
- decision made
- risk remaining

## if context7 is unavailable

if context7 is unavailable, use official vendor docs for the exact version.

if exact-version docs cannot be found, stop and record the blocker.

do not guess.

## prohibited behavior

do not:

- rely on training memory for library apis
- use random blog posts as authority when official docs exist
- copy snippets that target a different major version
- introduce a dependency because it looks popular without a spike
- continue if desktop permissions or capture behavior is uncertain

## spike pattern

for uncertain libraries, create a small isolated spike before integrating.

a spike must answer:

- can this library do the required behavior?
- does it work on macos?
- does it work on windows?
- what permissions are required?
- does it expose unsafe capabilities?
- can it be tested deterministically?
- what is the smallest safe integration path?

record the spike result in the execplan.
