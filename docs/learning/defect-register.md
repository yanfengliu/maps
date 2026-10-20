# Defect register

## 2026-10-20 — Slow development startup

Symptom: the user reported slow loading with `npm run dev` after the Bay Area pivot. Investigation: cold Vite logs showed archived HTML/source discovery and unresolved Shibuya dependencies, despite a 225 ms server-ready message. Root cause: default dependency entry discovery included the retained `artifacts/` tree, and the default watcher also reloaded the active app for archived worktree edits. A second startup pass fetched tiles for a temporary camera before fitting the actual overview; remote font CSS also delayed styles.

Correction: pin Vite discovery to `index.html`, ignore this checkout's retained artifacts/data in its watcher, configure the overview before requesting tiles and remove the remote interface font dependency. Whole-class verification: a real Vite optimizer fixture first fails on an unavailable archived-only import with default discovery, then succeeds with the app configuration. A primary-checkout watcher probe ignores archived HTML changes while observing live public data. Cold headless desktop/mobile startup, early navigation and recovery pass. Bounds and measurements are in [the startup record](../work/0_bay-area-stanford/startup.md).
