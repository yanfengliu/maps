# The terrain cap and the census gate: fourteen holes closed, and the gate that would have caught them

2026-09-18. Phase 1 of two. Branch `worker/f1-terrain-cap` off `main` at `4efaea6`, worktree `artifacts/f1-cap/wt` (junctions `node_modules` and `data`, both read-only in this phase; no `data:*` command ran and nothing under `data/` was written). Two commits: `f1b3bc9` the cap, the gate and the payload record, cherry-picked from `phase-b-terrain-cap` at `0c76789`; `38bb0ac` the TIN reader fix. Not merged — the moving pins need the pavement-input review, and the lead lands it.

## What the branch was, and what did not survive the move

The branch was one commit, 33 behind `main`, and the cherry-pick applied with offsets only. Three things in it did not work on current `main` and are part of `f1b3bc9`:

- `SceneManifestInputs.terrain` in `tools/scene/scene-manifest.ts` never declared the two new fields, so the branch did not typecheck. The fields reached `sceneManifest()` through an object literal and `tsc --noEmit` rejects excess properties; `test/scene-manifest.test.ts`'s fixture needed them too.
- `tools/scene/build.ts` decoded `terrain.bytes` — the array the builder still held — and called that the gate. That is the builder agreeing with itself: `buildTerrain` already runs the same census on the same arrays before it returns, so the build.ts call could never fire on a mesh that reached disk by any other route. It now reads `data/scene/terrain.mesh` back off disk and verifies those bytes, and `test/terrain-watertight.test.ts` holds the wiring by source shape.
- The register row records the cap's byte cost as 3,164 B. It is 3,060 bytes, and that is arithmetic rather than a new observation: 14 vertices x (3 position + 3 normal) floats x 4 bytes = 336, plus 227 triangles x 3 indices x 4 bytes = 2,724.

## The measurement, on the real DEM

`node artifacts/f1-cap-probe/rebuild.ts` builds the ground both ways from the pinned 360.6 MB `533935_dem_6697_op.gml`, in process, writing only to a path this lane owns:

| arm | source triangles | triangles | vertices | cap triangles | rim edges | rims | holes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| uncapped | 1,101,033 | 183,123 | 92,269 | 0 | 1,441 | 15 | 14 |
| capped | 1,101,033 | 183,350 | 92,283 | 227 | 1,214 | 1 | 0 |

The cap adds 218 triangles facing up and 9 down, all nine on the two rims that double back on themselves (H1's 54-vertex serpentine has 47/54 up, H2's 28-vertex one 26/28) — both in the south-east, away from the area of interest. `artifacts/terrain-holes/mesh-doctor.mjs` over the three meshes:

| mesh | triangles | duplicate= | nonManifold(>2 faces)= | boundary edges | loops |
| --- | --- | --- | --- | --- | --- |
| served `data/scene/terrain.mesh`, pre-fix reader | 183,188 | 65 | 195 | 1,441 | 15 (14 holes) |
| rebuilt uncapped, fixed reader | 183,123 | 0 | 0 | 1,441 | 15 (14 holes) |
| rebuilt capped, fixed reader | 183,350 | 0 | 0 | 1,214 | 1 |

**Before/after pair each for the three numbers phase 2 must compare:** the served scene is 117 files / 301,674,209 bytes at `sceneTreeDigest 1ebda662…` (certificate `e6b7b9d8de0faf69`), and the three certificate-pinned build files hash `dist/index.html a73d718a…`, `dist/assets/index-DRmtpVMl.js c890299c…`, `dist/assets/index-dvQKBZaf.css 11dd032c…`. A build of this branch reproduces all three byte-for-byte (measured in the worktree), which is what the type-only `src/world/scene-data.ts` change predicts; the unpinned `dist/assets/index-DRmtpVMl.js.map` will differ because it embeds that file's source text.

## The reader: 384 triangles counted twice, and the check that the census did not move

`streamTinTriangles` kept its inter-chunk tail from the last `<gml:Triangle>` *opening* tag. When a read ends exactly on a closing tag that tag belongs to a triangle already yielded, so it was parsed again on the next chunk: the document's own count is 1,101,033 and the reader returned 1,101,417. The tail now keeps only what cannot be parsed yet — the last unclosed opening tag, or the trailing characters that could begin one. `StreamTinOptions.chunkSize` is test-only and exists so `test/plateau-tin-stream.test.ts` can put a boundary exactly on a closing tag; its first case carries the pre-fix rule as its own red control, so it fails if the fixture ever stops reproducing the defect.

The check the lead asked for — stop and report if the reader fix moves the hole census — comes out negative: 14 interior rims and 1,441 rim edges before and after, so the cap needed no adjustment.

## What the phase-1 unit suite could not see, and the case that fixed it

The first version of `test/terrain-watertight.test.ts` drove `capTerrainHoles` and `verifyTerrainIsWatertight` directly. Removing the cap from `buildTerrain` — `options.leaveHolesOpen === true` replaced by `true` — left all seven cases **green**. A suite that tests the function and not the pipeline cannot see the pipeline stop calling it, and this is the same class the canon names: a check built from the same symbol as the thing it checks.

The case that closes it drives `buildTerrain` over a small fixture `dem:TINRelief` written by the test itself: an 8x8 grid of 5 m cells about `AOI_CENTRE_WGS84` with the cell at (2,2) left out, so the clipped ground carries exactly one interior rim. It asserts the default arm's bytes carry none, that the cap cost exactly one vertex and four triangles there, and that the `leaveHolesOpen` arm of the same build still carries the rim and is refused by name — so the case cannot pass by the control arm quietly losing its hole. Under the mutation the default arm's own refusal is what fires.

Six mutations, each exit status 1, all recorded with their exact messages in `docs/learning/gate-proofs.md`: the cap removed (above), the census skipping a rim (6 of 8 cases red), the reader's old tail rule (all 3 reader cases red), the scene gate verifying the builder's array again (the wiring case red), the manifest's rim records unrounded, and the manifest's cap-fact consistency guard disabled.

## What the gate claims, and where the invention is

The claim is topological and now reads that way in all three places the lead named: the module header of `tools/scene/terrain-watertight.ts`, the docstring of `verifyTerrainIsWatertight`, and the manifest's own field documentation. It says the ground is closed and that the outer rim is the only rim left. It does not claim the fan's surface resembles the source (the apex is the rim's own vertex mean and the triangles around it need not lie on the TIN), does not check that the projection is covered, cannot see a hole whose rim was welded into a seam, and says nothing about the outer silhouette.

`manifest.json`'s `terrain.closedRims` carries one record per closed rim — vertex count, perimeter, apex position, projected area, measured before the fan — beside `closedHoleCount` and `capTriangleCount`, so the invention is nameable rather than simply appended after the source vertices. `sceneManifest` refuses to publish the three when they disagree with each other, and `test/scene-manifest.test.ts` pins the fourteen records against the real census.

## The self-invalidating case, handed over deliberately

`test/terrain-watertight.test.ts`'s served-mesh case asserts the **pre-batch** state: `data/scene/terrain.mesh` is still the uncapped ground, the F1 rim is among its interior rims, and the gate refuses it by name with all fourteen listed. This is what keeps phase 1 green instead of shipping a red suite, and it is also what makes the case invalidate itself the moment `npm run data:scene` writes a capped scene. That is the safe direction. Phase 2 flips it to assert the new state — watertight, one loop, the manifest's `closedHoleCount` 14 and `capTriangleCount` 227, and the fourteen `closedRims` records matching a re-derived census — and must not relax it into an assertion that passes in both states.

## Phase 1 — not done in that phase, and why

No `data:*` command ran, `npm run visual` was not run, and `data/scene` was not regenerated: the flicker lane held the GPU and the primary's served scene must not move under its certificate. The four non-visual gates were run in the worktree: build, typecheck, `npm test` (72 files / 525 tests) and audit, all exit 0. The end-to-end `npm run data:scene` refusal is proven at the unit level (fixture pipeline case, disk-read case, wiring case) and by reading the code; it has not been watched firing inside a real `data:scene` run, because that run is phase 2's.

One process note worth keeping: three of the phase-1 edits were lost mid-session when a mutation was reverted with `git checkout -- <file>` against a file whose D10/D11 edits were still uncommitted, and they had to be rewritten. Commit before mutating, or restore from a copy rather than from git.

# Phase 2 — the regeneration, and the markings defect it found

2026-09-18. Branch `phase2-regen` in the primary checkout (the batch is `7ad6ed0` + `d5ead63`, the pin re-binding). The condition on starting was that every browser-lane port was free, because `cleanSceneGeometry` deletes the served geometry before rebuilding it and a lane loading the app in that window gets a 404. Ports were confirmed free immediately before the first destructive command.

## The chain

`npm run data:scene` first **refused at the pavement binding**, exactly as the brief predicted: `Error: Pavement input terrain.mesh has SHA-256 c39d49edd405e266373e0b48e0202967a01f546e7d11d2dffd5497c14d692773, outside the reviewed C5 source binding`. The cap's terrain and roads had already been written, so the two new digests were readable; `REVIEWED_INPUTS` was re-bound to them and the command completed in 34.5 s. Then `data:markings` **refused** (below), `data:decorations` used its cached source, `data:vehicles` re-baked the fleet to the byte-identical manifest `5b29efc7…`, `data:vehicles:verify` and `data:hardware` passed, and a second `data:scene` run (33.5 s) closed the determinism pair: **all 117 files byte-identical, `09105dd7…` both times**.

The gate's positive path, on the real file: `ground rims: 1441 rim edges, outer rim 1214 vertices / 6061.3 m, 14 holes closed with 227 triangles, 218 facing up / 9 down` and `watertight: 1214 rim edges, one outer rim of 1214 vertices / 6061.3 m, no holes`. The refusal path was deliberately **not** staged on the real file: it is unit-proven, and a temporary flag to watch it would have become a shipped option.

## The pavement binding moved 21x further than the brief predicted

`pavements.mesh` went 461,912 → **464,525 triangles**, where the brief's section 4 said a moved pavement digest "can only come from the road polygons that now drape over the fourteen holes" — 123 triangles. `pavement-source.json` did not move, so the source/layer selection is unchanged, and the mechanism that fits is ground support: capping the rims gives terrain under pavement source paths that previously had none. The reviewer's claim is therefore restated, not inherited. The roads half of the mechanism is measured cleanly: all eleven seam probes survive re-derivation with every identity moved by **exactly +123** (`roads:54518:0` → `roads:54641:0`), which is what an insertion before index 54,518 looks like. Pavement `degenerate` is 25,448 before and after, so the delta added no new class of defect.

## The markings defect

`data:markings` refuses because `hero-paint.ts:30` requires the OSM extract to hash to the network's recorded `9923a9ae…`, and the extract on disk is today's `976d848e…` — the 2026-09-18 restoration re-fetched it from live Overpass and destroyed the reviewed one. A dated Overpass query does not help here: the endpoint answered with `osm_base 2026-09-18T04:11:19Z` and a third digest `7805b653…`. The reviewed authored pair survives in exactly one ignored artifact tree (`artifacts/network/app-motion/candidate/data/scene/`), and **not** in `artifacts/scene-backup-20260917/scene/`, whose markings are the unauthored `4daa4283…` — a correction to the instruction that sent me there. The pair was restored byte-identically, and the inheritance was measured rather than assumed: 204 authored-paint vertices, 0 missing, maximum |old − new| **0.000000000 m** on both ground and roads. Both facts, and the fragility that `data:setup` on a clean checkout now loses the authored paint, are in `docs/learning/defect-register.md`; the full digest table and the reviewer's falsifiable claim are in the evidence pack (`artifacts/f1-cap/EVIDENCE-review34.md`, ignored task evidence).

## What the batch leaves

The primary checkout's `HEAD` is `phase2-regen` at `d5ead63`, which is where the batch lives; `main` (`17052eab`) has moved on independently and the landing is a merge of `phase2-regen` into it once review 34 clears. The lane worktree `artifacts/f1-cap/wt` is at `7ad6ed0`, clean and fully contained in `phase2-regen`, and is removed after the landing; `worker/f1-terrain-cap` is likewise redundant. The 44-frame re-capture and its native re-inspection are owed behind the merge, and the measured cost of that re-capture is 273.9 s, not the three hours the older notes carry.

# Phase 3 — the landing, the four record corrections it owed, and the re-capture

2026-09-18. `main` at `3f1fb77`, the reviewer's round 34 merged, five batch commits off `4efaea6`.

## The merge

`phase2-regen` was merged into `main` as **`400065a`** (second parent `0e7d683`), a real merge commit naming what it brings; the branch was not rebased and `main` was not moved. Two conflicts, both newest-first logs that both sides had prepended to, and both resolved by keeping every entry from both sides: `docs/devlog/summary.md` (main's flicker bullet and the batch's terrain-cap bullet, both retained at the head) and `docs/learning/defect-register.md` (main's five new flicker entries, then the batch's three, then the shared entries). Nothing was resolved by taking a side, and the same pass applied the record corrections below rather than landing first and correcting afterwards, because review 34's acceptance was conditional on the record.

Two other lanes advanced `main` while this work ran — `0531984`, `930f6a9` (the stall lane's lesson, three docs files) and `d5f516f`, `1a7eb51` (round 35 of the flicker review) — none touching `src/`, `tools/`, `test/`, `package.json` or the harness, so the gates below were not invalidated by them.

## The four corrections, and the one that was a real error

**Blocking finding B1, and the batch's headline sentence was false.** The register, the devlog bullet, `plan.md` and `handoff.md` all said a clean `data:setup` "would produce the unauthored markings from live OSM and silently lose the authored west-approach paint". It would not, and each of the three code paths was read before the sentence was rewritten: `package.json:27` runs `data:network` before `data:markings`; `tools/network/build.ts:28` records `osmSha256` for the extract it just read; so `tools/scene/hero-paint.ts:30`'s guard passes on a clean checkout and the paint is re-derived from that survey, not dropped. The silent loss is one command earlier: `tools/scene/build.ts:159` calls `writeMarkings()` with no argument and `tools/scene/build-markings.ts:82` defaults `includeAuthored` to `false`, so **`npm run data:scene` alone overwrites the authored pair with the unauthored one** — which this batch's own two determinism runs did (`after1.json`/`after2.json`, `markings.mesh 4daa4283…`), and `final.json` restored afterwards. `npm run data:markings` alone refuses by name. All three now read separately in the register, and the correction is recorded where the record is read rather than by rewriting `0e7d683`.

**The inheritance proof is reproduced, not cited.** `node artifacts/f1-cap/probe-inheritance.mjs` in the primary on the merged revision: `authored vertices sampled: 204`, `ground: 0 with no terrain on one side`, `roads: 0 with no road on one side`, max |old − new| `0.000000000 m` on both, paint height difference `0.000000000 m`. `plan.md` and `handoff.md` no longer call it owed, and the numbers in the record are the ones this session produced.

**`control-hardware.json` was attributed to the wrong review.** `reviews/30_implementation.md:132` records `e6b3e1d3…`, not the `5f710c5b…` the batch credited to it; the two differ in exactly `.inputs.vehicles` (`4cd6e59b…` against the accepted `5b29efc7…`), so Review 30's value predates the 2026-09-16 vehicles restore. The batch's own move holds: `5f710c5b… → a65058ee…` is 134 leaves, the two mesh digests and 132 `records[*].evidence.*Triangles` indices, with no position, status or count moved.

**Two live reference documents published pins that had moved.** `docs/reference/pavement-recipe.md` now carries the current `inputs.adaptiveBase` `c1ce290c…` at 11,706,564 bytes and marks `bf44e124…` as the previous binding's base. `docs/reference/network-contract.md` no longer presents `fef57d09…`/`3fe126cd…` as the current meshes, and its "missing terrain removes 47.196 m" sentence now carries the re-measurement: independently sampled with the shipping `surfaceSampler`, all three recorded points are **ABSENT on the pre-cap mesh** and read **12.194 / 12.817 / 12.913 m** on the served ground — the reviewer's three figures reproduced exactly rather than copied.

## The gates on the merged revision, and the re-capture

Run in the primary on `main`: `npm run build` 0 (the three certificate-pinned files `a73d718a…`, `c890299c…`, `11dd032c…`), `npm run typecheck` 0, `npm test` **74 files / 535 tests, 0 failed**, `npm run audit` 0 (2 moderate, 0 high), `npm run visual` 0.

The visual run is the batch's owed re-capture and it ran in the primary, not a worktree: certificate **`aa2e07e9902a5dc9`**, `startedAt` `04:43:05.663Z` → `completedAt` `04:47:44.715Z`, 44 frames, the pixel and lifecycle lanes both on the RTX 4090 at driver 616.64, bound to `sceneTreeDigest dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c` over 117 files / 301,782,754 bytes. All 44 certified frames were verified against the files on disk by recomputing their SHA-256 (44 match, 0 missing, 0 mismatched). It replaces `e6b7b9d8de0faf69`, the pre-batch certificate. What is still owed, and it is the inspection rather than the capture: opening those 44 frames at native resolution, starting at H1's fan spill (+3.25 m / ~42 m²; H2 +1.74 m / ~19 m² over surveyed ground) at the azimuths where the hole was a 789 px background blob (`az000`) and 204 px (`az300`).
