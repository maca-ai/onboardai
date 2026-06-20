# native capture adapter spike

## purpose

This note records what is verified before introducing native capture dependencies.

The current proof uses deterministic fixture capture materialization. It writes local raw marker artifacts under ignored `captures/raw/` paths, then normalizes those records into shareable `flow.md` and `captures/normalized/*/manifest.json`.

This is not native OS capture.

## verified documentation

Source: Context7, `/websites/v2_tauri_app`, queried on 2026-06-20.

Verified Tauri v2 facts:

- Tauri v2 uses capabilities and permissions to expose commands to windows and webviews.
- Capability files live under `src-tauri/capabilities`.
- Tauri plugins can expose Rust commands and generate allow/deny permissions.
- Tauri v2 has a global shortcut plugin for registering shortcuts, supported on Windows, macOS, Linux, Android, and iOS.
- Tauri window configuration documents transparent windows, workspace visibility, and window effects with platform-specific limits.

## missing evidence

The documentation check did not verify a complete official Tauri v2 path for all required capture inputs:

- screen recording on macOS and Windows
- frame extraction from screen recording
- full keyboard event logging, not only global shortcuts
- full mouse event logging
- permission prompts and recovery paths for macOS and Windows
- deterministic test strategy for native capture
- native overlay behavior that can highlight but never mutate target tool state

## decision

Do not add a native capture dependency yet.

Keep the current fixture adapter as the only executable capture adapter. Native adapters must pass the `assertNativeCaptureReady` gate in `packages/capture` before being used as proof.

## next experiment

Verify a candidate native adapter stack through official docs or Context7 for the exact installed versions, then create a small spike that writes:

- raw screen recording under `captures/raw/`
- keyboard event log under `captures/raw/`
- mouse event log under `captures/raw/`
- redacted frame metadata under `captures/normalized/`
- normalized capture manifest under `captures/normalized/`

The spike must not use APIs, DOM inspection, browser selectors, target-tool MCP, backend access, database access, computer-use automation, embeddings, or vector search.
