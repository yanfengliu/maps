# The Phase B appearance batch: a detail tile, a probe seam, a manifest without a clock

2026-09-17. Branch `phase-b` off `b7fc563`: `68a4775` (the tile), `4e71f19` (`guardrailPosts`), `d2babb8` (the probe seam), `ddb87ac` (the manifest). The F1 terrain cap is not in this batch; it sits on `phase-b-terrain-cap` (`adb9d4f`) and the reason is below.

## What the batch had to avoid

Every item here moves what the certificate pins. The tile and the seam change the built bytes, so `dist/assets` hashes move; the manifest change alters a served file, so `sceneTreeDigest` moves; `guardrailPosts` is a `src/` change that alters the entry chunk. They land together, the five gates run once, the 44 frames are captured once and re-inspected once. The browser work is the coordinator's to sequence.

## The tile

`terrain.ts:48` and `roads.ts:52` were bare `MeshStandardMaterial`s. The ground's only albedo variation was a ±3% sinusoid at about 20 m and the road's grain faded out above 0.015–0.08 m/px, so at mid and far distance both surfaces were flat. `src/scene/surface-detail.ts` generates a 128×128 tile from `createRng` with a fixed seed: six octaves of wrapping value noise with the coarse octave dominant, then centred on the multiplier's neutral and scaled to fill the range. `surface-materials.ts` samples it at `worldXZ / metresPerTile`.

Two decisions are worth the ink.

**The distance fade is the mip chain, not a smoothstep.** The old road shader multiplied its grain by `1 - smoothstep(0.015, 0.08, fwidth(metres))`, which turns the structure off as the camera pulls back — the surface is guaranteed flat exactly where the overhead frames look. A mip chain does the opposite: it averages the finest octave away first and leaves the coarse ones, so the surface keeps structure at every distance and only loses the detail that has become sub-pixel. The tile is set up for that explicitly, because `DataTexture` arrives with `generateMipmaps` off and nearest filtering.

**The scale came from the camera, not from taste.** 55° vertical at 1280×720 puts one ground pixel at 1.374 m at the overhead sweep's 950 m, 0.318 m at the block's 220 m and 0.065 m at the plaza's 45 m. The ground tiles at 8 m — 5.8 px overhead, so its 8 m and 4 m octaves are resolved — and the road at 4 m, 2.9 px, still resolved and finer than the ground so asphalt does not simply repeat it. A 2 m tile is 1.5 px there and mips to flat, which is the defect, so `test/surface-detail.test.ts` asserts the tile against that metres-per-pixel arithmetic: changing the ground tile to 2 m was watched red.

One thing the first version got wrong and the test caught: the octave sum's mean sat 5.1 of 255 off neutral, so the tile tinted the surface instead of texturing it. Rather than loosen the assertion, the generator now centres the sum exactly and scales it to fill the range, which also makes `SURFACE_DETAIL_STRENGTH` the only thing that sets contrast.

## The probe seam

The frame-budget lane could never measure the delivered build because the seam did not exist on `main`. `index.html` now loads `tools/frame-budget/probe-entry.ts` ahead of `/src/main.ts`, and the module installs nothing unless the URL carries `?frameBudgetProbe=1`, exactly. `probe-switch.ts` holds that predicate and both sides import it, so the page's gate and the lane's URL builder cannot disagree about the spelling. Without the switch there is no `requestAnimationFrame` wrapper, no `RenderLoop` wrapper and no `globalThis.__frameBudgetProbe` — which matters because the seam ships: ungated, every appearance frame the certificate photographs would be drawn through a wrapped frame boundary. A lane that forgets the switch now fails by name in `readProbe` instead of reporting intervals nothing observed.

Measured on the build: `dist/index.html` 2,049 → 2,365 bytes, and the entry bundle renamed `index-D7By1MWG.js` (975,237 bytes) → `index--jFOWFey.js` (976,145), because Vite merges the probe into the entry chunk. The CSS is unchanged.

**The case caught its own flaw before it landed.** Its first draft matched the bare path `"/src/main.ts"` to find the app's script, and the HTML comment above the seam names that path in prose — so `indexOf` found the comment, and the assertion reported the order backwards while the tag was correctly ahead of the app. It now matches whole script tags. That is the second time this lesson has cost this repository something, so it is recorded in the gate-proofs entry rather than only here.

## The manifest

`data/scene/manifest.json` is served, so `sceneTreeDigest` folds its bytes into the certificate's scene binding, and it carried `builtAt`. That is why the 2026-09-17 junction incident's certificate binding was unrecoverable by construction: the digest was a build identity, so any rebuild moved it with byte-identical geometry and a reviewer could not tell a rebuild from a real content change.

Two fixes were available and the timestamp was dropped from the served payload rather than normalised out of the digest. Normalising puts a second place in the repository that knows about `builtAt`, and a later timestamped field would reintroduce the defect silently; dropping it makes the artifact itself reproducible and leaves `sceneTreeDigest` with no special case at all. `tools/scene/scene-manifest.ts` now builds the manifest from the measured facts alone, and the served file is 1,562 → 1,521 bytes. Reintroducing the clock was watched red against both halves of the test: the same-bytes case and the digest-agreement case.

Then the claim was checked on the real payload rather than only on the fixture, because a unit case over two synthetic files is not evidence that Shibuya's own scene is reproducible. Two consecutive `npm run data:scene` runs in the isolated worktree, with `sceneTreeDigest` taken after each, return the same digest: `7f2bab4bf61ba94e0bb96fee5307e75017ed4fc848d063b1c00f1683d290ee63`, 117 files, 301,665,257 bytes. That is the property the incident needed and did not have — a rebuild that re-derives the digest a certificate binds — and it is what makes the coming re-capture's scene binding recoverable afterwards. The scene's reviewed pins hold through both runs: `terrain.mesh` `fef57d09…`, `roads.mesh` `3fe126cd…`, `pavements.mesh` `5d2a9150…`.

## `guardrailPosts`

`createStreetDetails` returned `counts.guardrailPosts: 0` as a literal while every sibling in that object was tallied from live records, so it read as a measurement of this scene and was a count of nothing. Nothing read it, and it misled a criterion note into recording guardrails as unmet. Guardrails are built in `src/scene/vegetation.ts` from the four `guard_rail` ways `data/scene/decorations.json` carries, 364–460 m from the crossing. The field is gone from the interface and the literal.

## The F1 cap left the batch, and why

The cap works and its census gate refuses a holed ground by name. It is not here because closing the ground moves more than the ground: the roads are draped onto the terrain, and the A/B — same code, same tran GML, only the terrain sampler differing — measures `roads.mesh` at 79,244 triangles and 461 dropped polygons with the uncapped ground against 79,367 and 338 with the capped ground. The uncapped arm reproduces the standing pin `3fe126cd…`, which is what makes the comparison sound.

That moves `REVIEWED_INPUTS` in `tools/scene/pavement-recipe.ts`, binds a reviewed Candidate 5 artifact and the digest its recipe doc records, and breaks the Review 10 pins `test/paint-support.test.ts` holds for roads and pavements. Moving a reviewed pin needs that review, so the coordinator sequenced the work onto its own branch. The cap's commit message carries the finding, and its last test case cannot pass until the scene is rebuilt with the cap, which cannot happen until the binding is reviewed.

## What is not verified

The frame set. A materials change is appearance work, and no assertion in this batch can say whether the tinted, lit, tone-mapped ground and road look better or worse — the plaza's near-field wash-out and the mid-ground flatness are things to look at in the captured frames, not to infer from a test. The tile's own cases bound themselves to properties of the generated bytes and the chosen scale, and say so. The visual gate has not been run; the coordinator sequences it.

The gates that did run, on `phase-b` at `ddb87ac`: build 0, typecheck 0, unit tests 64 files and 470 tests green, audit 0. The isolated scene rebuild that the source-dependent tests need was run in the worktree against a real `data/scene` with read-only junctions for `data/plateau`, `data/3dtiles` and `data/network`; the primary's 116 scene files hashed identical before and after.
