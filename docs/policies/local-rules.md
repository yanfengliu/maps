# maps — repo-only rules

## Stack

Vite, three.js and TypeScript, on Node 24 pinned in `.nvmrc`. Decided in the Shibuya plan (`docs/work/0_shibuya-1km/plan.md`) and built in Phase 0.

## Map data, and what its licences oblige

Three sources, settled in Phase 1. Provenance, URLs and measured constants are in `docs/work/0_shibuya-1km/design.md`; the exact credit strings are in `src/world/sources.ts`.

**PLATEAU Shibuya-ku FY2025** supplies buildings, terrain, road surfaces and street furniture. PDL 1.0, with CC BY 4.0 expressly permitted. No share-alike, commercial use allowed. Copyright sits with the local authority, not with MLIT.

**OpenStreetMap** supplies the road, sidewalk and crossing topology. ODbL 1.0.

**GSI** elevation tiles are a cross-check on PLATEAU's terrain and nothing else is drawn from them. PDL 1.0, category 2, so attribution alone and no Survey Act application.

Three rules follow, and each of them is cheap now and expensive later.

**Both PLATEAU and GSI require two lines, not one.** A source credit, and a separate statement that the data was edited or processed. This project reprojects, clips, retextures and converts, so the second line is required and neither may be dropped for space.

**The OSM-derived network graph stays in files of its own.** The rendered scene is a Produced Work with no share-alike attached, but the Phase 6 lane, sidewalk and crossing graph is a Derivative Database, and publishing the app obliges offering recipients that graph or a description of how it was made — ODbL section 4.6. Fusing it into the PLATEAU geometry risks having to offer the whole thing. This is recorded as a constraint on plan item 23.

**Nothing fetched enters Git.** `data/` is ignored, holds about 620 MiB downloaded and 1.4 GiB unpacked, and is regenerable by `npm run data:fetch`. The repository holds the recipe and the checksums. The two files under `test/fixtures/` are the exception and were promoted deliberately: they are real cut-down bytes from GSI and PLATEAU, both under 256 KiB, and `test/fixtures/README.md` records where each came from and under what terms.

## Fetching data is a script, not a set of instructions

`npm run data:fetch`. It pins the PLATEAU archive by exact length and SHA-256, checks the length first so a truncated download says "N bytes short" rather than "hash mismatch", and re-downloads anything that fails. Overpass output cannot be hashed because OSM changes daily, so it is pinned by the `timestamp_osm_base` the script records in `data/provenance.json`.

The one operational trap worth repeating here: `overpass-api.de` answers HTTP 406 to any User-Agent containing a parenthesised comment, which is exactly the form OSM convention asks contact details be given in, and 406 is documented as meaning "rate limited". Use a bare token.

## The world frame is a contract, not a convention

Scene units are metres, Y is up, the world origin is the Shibuya Scramble Crossing, +X is east and +Z is south. It lives in `src/world/frame.ts` and every system that places anything reads it from there.

Nothing carries an EPSG:6677 coordinate into the browser. The origin subtraction happens where the data is loaded, so coordinates in the scene stay inside a kilometre of zero and a float32 vertex buffer still has centimetres of resolution left.

The box itself lives in `src/world/aoi.ts` and is stated once: bounds, centre, projected extent, the EPSG:6677 origin, the mesh codes, and the Overpass bbox. `frame.ts` takes the world origin from it, `tools/data/manifest.ts` builds the archive member list from its mesh codes, and `tools/data/overpass-query.ts` builds its query from the same bounds. Restating the box in a fourth place makes it a fourth box.

Two axis traps meet in this projection: CityGML's `posList` is latitude-first and EPSG:6677 is northing-first. Flip either and Shibuya renders perfectly and mirrored, and no frame review here would catch it. `test/aoi.test.ts` gates the whole chain against measured coordinates, and it has been made to go red.

## The visual harness drives the controls; it never sets state

`tools/visual/` synthesises pointer and wheel events on the canvas through Chromium's own input path. It may read `window.__mapsHarness`, which is frozen and has no setter. It may not assign `camera.position`, call `controls.setAzimuthalAngle`, or call the render function.

This is the fleet canon's rule, not a local preference, and `src/harness/bridge.ts` enforces it structurally rather than asking for it. Widen that bridge with another observation when a later phase needs one; never with a mutation.

## This repo pins its own preview port and checks app identity before it captures

Dev is 5319, preview is 4319, both `strictPort`, both bound to an explicit 127.0.0.1. The harness reads the page's `app-id` meta tag and refuses the run before the first screenshot if it is not this app's.

Why: every repo in this fleet takes Vite's 5173 and 4173 defaults, and several have a server up at any time, so "something answered on the port" is not "our app is running" anywhere in the fleet. During Phase 0 a sibling project's `vite preview` was found holding 4173, and the visual gate attached to that app and waited ten minutes for a bridge it was never going to publish. Separately, a preview left on the default host bound `[::1]` only and refused every connection to `127.0.0.1` while plainly running.

Three things stop it now: the ports above, `reuseExistingServer: false` in `playwright.config.ts`, and the `app-id` check. The third has been made to go red on purpose — see `docs/learning/gate-proofs.md`.

This rule fixes this repo's exposure only. Every other visual gate in the fleet has the same one, and whether that becomes a fleet rule is the owner's call, not this repo's.

## Gate artifacts live in `artifacts/`

That directory ignores itself. `npm run visual` wipes and rewrites it, so nothing in it is ever evidence for a run other than the last one. Promoting a frame to a fixture or a golden moves it out of there; it does not get un-ignored in place.
