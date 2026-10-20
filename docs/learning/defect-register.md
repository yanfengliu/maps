# Defect register

## 2026-10-20 — Embedded browser reports a crashed localhost map

Symptom: the user sees a blank map/loading indicator followed by “This page crashed. Localhost crashed unexpectedly.” in the built-in browser; Chrome loads the app. Scoped host diagnostics record `IAB browser page unresponsive` for `http://localhost:5173` at 16:21:07.696Z and 16:22:10.981Z. The host uses its crash screen for unresponsiveness as well as process termination. No matching process-gone, GPU-crash or out-of-memory diagnostic was found in the inspected logs; the underlying hang cause remains unproven.

Bounded mitigation: defer custom campus shader allocation and compilation until approach zoom 12, instead of running it during the initial regional view. A mock-WebGL regression fails against the old renderer at zoom 9 and passes with deferred setup; separate tests cover approach initialization, asynchronous completion, context recovery and cleanup. This proves removal of unnecessary regional GPU work, not the host hang's root cause. Direct inspection of the built-in tab is blocked by browser security policy, and actual embedded-browser recovery remains unverified. Investigation, remaining limits and integrated checks are tracked in [the navigation/startup record](../work/0_bay-area-stanford/navigation-startup.md).

## 2026-10-20 — Slow development startup

Symptom: the user reported slow loading with `npm run dev` after the Bay Area pivot. Investigation: cold Vite logs showed archived HTML/source discovery and unresolved Shibuya dependencies, despite a 225 ms server-ready message. Root cause: default dependency entry discovery included the retained `artifacts/` tree, and the default watcher also reloaded the active app for archived worktree edits. A second startup pass fetched tiles for a temporary camera before fitting the actual overview; remote font CSS also delayed styles.

Correction: pin Vite discovery to `index.html`, ignore this checkout's retained artifacts/data in its watcher, configure the overview before requesting tiles and remove the remote interface font dependency. Whole-class verification: a real Vite optimizer fixture first fails on an unavailable archived-only import with default discovery, then succeeds with the app configuration. A primary-checkout watcher probe ignores archived HTML changes while observing live public data. Cold headless desktop/mobile startup, early navigation and recovery pass. Bounds and measurements are in [the startup record](../work/0_bay-area-stanford/startup.md).
