# maps — repo-only rules

## Stack

Vite, three.js and TypeScript, on Node 24 pinned in `.nvmrc`. Decided in the Shibuya plan (`docs/work/0_shibuya-1km/plan.md`) and built in Phase 0.

Map data sources are not chosen yet in code. The plan settles them — PLATEAU LOD2 (CC-BY 4.0), OpenStreetMap (ODbL) and GSI — and Phase 1 records the terms here when it loads them.

## The world frame is a contract, not a convention

Scene units are metres, Y is up, the world origin is the Shibuya Scramble Crossing, +X is east and +Z is south. It lives in `src/world/frame.ts` and every system that places anything reads it from there.

Nothing carries an EPSG:6677 coordinate into the browser. The origin subtraction happens where the data is loaded, so coordinates in the scene stay inside a kilometre of zero and a float32 vertex buffer still has centimetres of resolution left.

## The visual harness drives the controls; it never sets state

`tools/visual/` synthesises pointer and wheel events on the canvas through Chromium's own input path. It may read `window.__mapsHarness`, which is frozen and has no setter. It may not assign `camera.position`, call `controls.setAzimuthalAngle`, or call the render function.

This is the fleet canon's rule, not a local preference, and `src/harness/bridge.ts` enforces it structurally rather than asking for it. Widen that bridge with another observation when a later phase needs one; never with a mutation.

## Servers bind 127.0.0.1 on ports that are not the Vite defaults

Dev is 5319, preview is 4319, both `strictPort`, both with an explicit host.

Every repo in the fleet would otherwise want 5173 and 4173. During Phase 0 a sibling project's `vite preview` was found holding 4173, and the visual gate attached to that app and waited ten minutes for a bridge it was never going to publish. Separately, a preview left on the default host bound `[::1]` only and refused every connection to `127.0.0.1` while plainly running.

Three things now stop it: the ports above, `reuseExistingServer: false` in `playwright.config.ts`, and the `app-id` meta tag the harness checks before it captures anything.

## Gate artifacts live in `artifacts/`

That directory ignores itself. `npm run visual` wipes and rewrites it, so nothing in it is ever evidence for a run other than the last one. Promoting a frame to a fixture or a golden moves it out of there; it does not get un-ignored in place.
