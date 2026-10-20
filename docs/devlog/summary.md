# Development log

- 2026-10-20 — Fixed slow `npm run dev` startup by excluding archived projects from Vite discovery/watchers, initializing the intended map view before tile loads and using native interface fonts. Verified cold primary-checkout startup, desktop/mobile campus flows, retry and archive watcher isolation; 15 tests and required gates pass. [Evidence and limits](../work/0_bay-area-stanford/startup.md).

- 2026-10-19 — Replaced the fresh main scaffold with an Apple Maps-inspired Bay Area explorer and 648 source-based Stanford building footprints/parts. Added regional/Stanford navigation, local place search, building details, mobile controls, source provenance and reproducible campus conversion. Kept the previous Shibuya project on its archive branch. Verification and limits: [integration record](../work/0_bay-area-stanford/integration.md).
