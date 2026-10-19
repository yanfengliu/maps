# First-person local walk — 2026-10-18

Owner: Codex first-person walk integration. Base: `464fdc0`. Implementation owner: `implement_walk`, isolated at `artifacts/first-person-walk/worktree`, branch `codex/first-person-walk`.

The owner clarified that local walking is for them to experience in first person and explicitly chose control of both walking and looking. The current Start walking button releases an automated pedestrian while the camera stays in OrbitControls. Deliver a prominent manual Start walking / Overview action, eye-level movement and mouse look. Keep the existing pedestrian prototype distinctly named and preserve the initial overview.

Acceptance: enter through the real button; move forward/back/sideways relative to look direction at walking speed; look without orbiting; keep eye height above actual supported ground; refuse unsupported edges and obvious building passage; stop held input on focus/visibility loss; exit with Escape or Overview and restore the overview; reenter and dispose without input or DOM leaks. Preserve ordinary orbit/pan/zoom, styles and noon/dusk rendering. No changes to map data, gait, packet provenance, population targets or rendering quality criteria.

Verification: focused actual-handler CPU tests, all five primary code gates, headless production real-input walking/look/exit/reentry and style checks, native first-person views and existing Satellite regression originals, then independent source/native review. No new dependencies. The read-only harness may observe state but never set it. Browser and preview ownership must close in finally paths and final census.

Primary's seven inherited LF-only source/test changes belong to prior work and remain untouched. The work-document allocator refused a new allocation because historical `af4403654cfa2917c17bc52caf838da61939770e` names allocation 0 `unreal-shibuya`, conflicting with the current registry's `shibuya-1km`. Preserve that refusal; this increment belongs to the existing Shibuya camera item 14 and does not repair the unrelated registry.

Status: implementation dispatched; gates and review not yet run. No first-person acceptance yet.
