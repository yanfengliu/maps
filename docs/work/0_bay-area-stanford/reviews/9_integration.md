# Review 9: integration

## Target

Repository `maps`, branch `claude/mapsort-benches-sculptures`, revision `7dba7abe2b70f1ce0d594f753080ce3b1e4958d1`. It merges `parked/campus-sculptures-20261020` (`584733e9560bb3a17a7c01fc70bc9fb6239bac01`) into `main` at `d683dac3f56821b508d23a41e47fde509dfdbf30`. Scope: the 22 files of the Stanford bench accuracy and campus sculpture increment, written on 2026-10-20 and neither gated nor reviewed before this round. Its three notes, `bench-accuracy.md`, `benches-statues.md` and `campus-sculptures.md`, now form [design.md](../design.md). `git show 7dba7ab:docs/work/0_bay-area-stanford/<name>` recovers each one as reviewed. Both reviewers received `git diff d683dac 7dba7ab` without `public/data/stanford-environment.geojson`. That file is one 249,282-byte line, and they read it from the checkout.

## Reviewers and coverage

Both lanes got the same prompt: seven acceptance criteria drawn from the notes and the local rules, a request to read code outside the diff, and no file edits. Both ran from the integration worktree `artifacts/mapsort/wt`, since removed. Their raw runs are kept, ignored, in `artifacts/mapsort/review-runs/r1/`.

- Codex CLI 0.163.0, `gpt-6-astra` at `model_reasoning_effort=xhigh`, read-only sandbox, ephemeral session. It read files inside and outside the diff, among them `src/building-details.ts:298` and `src/keyboard-pan.ts:30`. It ran 58 of the 60 unit tests, TypeScript and `git diff --check`, and restored the old facing formula in memory to see six fixtures fail. It ran no installation, build, audit or browser. Its log holds no `STATUS_DLL_INIT_FAILED` or `-1073741502`.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max. Its tools were Read, Task, and Bash limited to `git diff`, `git log`, `git show` and read-only commands. It ran in `dontAsk` mode with no settings files and no MCP servers. The run's `system/init` event confirmed these limits, and its `modelUsage` held only the pin. Those limits refused `node`, so it ran no tests, package gates or browser, and it did not delegate.

## Reports

Each report is kept as the reviewer wrote it, with its headings demoted under this section. Links in the Codex report point into the removed worktree; the paths after `artifacts/mapsort/wt/` are repository paths.

### Codex (`gpt-6-astra`)

Reviewed `7dba7abe` against `d683dac`. **Two should-fix findings remain.**

1. **Should-fix — Unknown-material bench ways receive invented solid geometry.**  
   [src/campus-environment.ts:67](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/src/campus-environment.ts:67) defaults every non-stone line to the concrete palette, emits raised geometry, then returns before the unknown-material fallback. This affects **23 mapped ways**. For example, `way/30775872` has no material but receives a 0.45 m concrete-colored block. Five unknown-material ways also receive 0.91 m backs. This violates acceptance criterion 2. Preserve their paths as neutral flat markers; retain the separately evidenced Quad interpretation. The material test at [test/campus-environment.test.mjs:92](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/test/campus-environment.test.mjs:92) covers only points.

2. **Should-fix — Mobile sculpture flights hide the artwork behind its card.**  
   [src/main.ts:144](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/src/main.ts:144) expands the sidebar, while the shared flight padding at line 114 places the target around `(178, 362)` on a 390×844 viewport—inside that panel. Retained [Burghers capture](/C:/Users/38909/Documents/github/maps/artifacts/campus-statues/verification/integrated/output/playwright/24-mobile-burghers.png) and [Angel capture](/C:/Users/38909/Documents/github/maps/artifacts/campus-statues/verification/integrated/output/playwright/25-mobile-angel.png) show neither artwork visible. The relevant `main.ts` and place metadata hashes match this checkout; these are historical captures, not a fresh browser run. Adjust the mobile panel or flight framing and assert that the artwork remains visible. The retained mobile check tests only horizontal overflow.

What I checked and found sound:

- **Source preservation:** All 969 original points retain coordinates, versions and existing tags. All 1,002 environment features match the four hash-verified OSM extracts. All 33 added paths preserve their coordinates. Both sculpture identities, versions, coordinates and retained source tags match.
- **Geometry:** The integrated mesh contains **154,087 triangles / 24,037,572 bytes**, within both caps. Tests pass for building clearance, wall crossings, sculpture normals, six plinths, kind `12` and index `-2`. All eight seat-wall closing seams independently measured zero gap.
- **Facing regression:** All six numeric/cardinal fixtures pass; restoring the old formula in memory makes all six fail.
- **Loading/recovery:** Parallel worker fetches each use a 15-second timeout. Errors reach Retry. Outside the diff, I inspected [building-details.ts:298](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/src/building-details.ts:298), its cache and sliced-upload paths, and the two draw calls. No new eager regional fetch was found.
- **Interface/navigation:** Both artworks are searchable. Card text is escaped; source URLs are fixed HTTPS literals. I also read the unchanged overview, selection, [keyboard-pan.ts:30](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/src/keyboard-pan.ts:30) and mouse-tilt paths. No additional static regression was identified.
- **Documents:** Recorded asset counts, sizes and hashes match. Derived seat walls retain interpretation labels and ODbL attribution.

**Validation:** 58 tests, TypeScript and `git diff --check` passed. No existing assertion was weakened beyond the explicitly approved triangle-budget increase. I did not run installation, build, the filesystem-writing startup tests, network audit, or fresh browser/performance verification in this read-only session. The historical captures do not verify the complete current revision.

No files were edited; no browser or server was launched.

### Claude (`claude-opus-5-5[1m]`)

#### Verdict

Not ready to accept. There is one blocking failure against criterion 2, and the native and mobile checks the repository requires were never run on this revision. There are also five should-fix items and some minor ones.

**What I could and could not run.** This session's permission mode refused `node`, `npm test`, `npm run typecheck`, `npm run build` and any file write. So I did not re-run the package gates. The merge message reports 60/60 tests, and `test/` does hold 60 top-level tests (51 in the parent); I read the new tests and found no reason they would fail. I checked the data with `git diff --word-diff` and `grep` on the committed files. The raw OSM extracts are not in the repository, so I could not re-derive the ways or nodes from them. I ran no browser. I did not delegate, because a subagent would have had the same restrictions.

#### Blocking

**1. Bench ways with no material tag get a solid, concrete-coloured design.** `src/campus-environment.ts:67-80`
- **What happens:** the line branch always builds a solid ribbon, 0.48 m wide and 0.45 m tall, coloured `[0.73,0.72,0.67]`. That is the same colour a `material=concrete` point bench gets; only `stone` changes it.
- **Scale:** 23 of the 25 mapped ways have no material tag. Of those, 14 have no `barrier=block` either: `way/694955888`–`898` and `way/1508655696`–`699`.
- **Why it blocks:** criterion 2 says an unknown material gives a flat neutral marker, not an invented design. It also contradicts `README.md:45` ("Known seating materials and photo-supported forms have solid geometry"). This is the same kind of defect the owner reported.
- A wood-tagged way would also come out concrete-coloured, though none exists today.

#### Should-fix

**2. Backrests on bent or two-node bench ways land on an arbitrary side.** `src/campus-environment.ts:83-85`, `tools/data/build-campus-environment.mjs:53-56,87`
- **Cause:** the generator estimates a line's facing from one vertex, `points[floor(n/2)]`. For a two-node way that is the end node. It does not guard against zero distance. The renderer then picks the back's side segment by segment from that single direction.
- **`way/1509660899`** is the concrete backed bench that `bench-accuracy.md` cites as verified. Its `modeledFacing` is exactly 0. That is what `atan2(0,0)` returns when the vertex lies on its orientation path; this is an inference, because I could not check node sharing without the extracts. Its back runs along the inner edge for two segments, then jumps to the outer edge at the third vertex, with no end caps at the break.
- **`way/694955891` and `way/694955892`** both have tagged backrests and are about 10 m long. Their facings are within 0.3° of their own long axis, so the side comes down to dot products of about ±0.005.
- **Suggested fix:** estimate facing from the way's true midpoint, reject zero distance, and choose one side for the whole way.

**3. Provenance counts mix mapped and authored seating.** `public/data/stanford-environment-provenance.json:66,71`, generator `:90`
- `beforeExclusions.bench` is 166 (nodes only) and three bench nodes are excluded, yet `retained.bench` is 196.
- The extra 33 are the 25 ways plus the eight authored seat walls. So retained no longer equals before minus excluded, and the authored walls are counted as retained source features.
- `test/campus-environment.test.mjs:27` locks this in.

**4. Changed behaviour the tests would not catch.**
- **Backs on untagged seats:** putting back the old `backrest!=='no'` rule passes every test. No fixture has a known material with `backrest` absent (`test/campus-environment.test.mjs:79,92-98`).
- **Direction as a string:** OSM supplies `direction` as a string, but only JS numbers and compass names are tested (`:81`). The numeric-string branch at `src/campus-environment.ts:34` is never exercised.
- **Seat-wall joins:** `:126` checks only triangle count and heights, so a wrong miter at the closing vertex still passes.
- **Missing entirely:** tests for backrest placement on line benches, sculpture clearance from buildings, the environment input's own failure messages, and the max zoom covering the 21.1 flights.
- `bench-accuracy.md` says emitted geometry "proves" the material/backrest distinctions and the closed seat-wall joins; that overstates these tests.

**5. Documents disagree with the code or are stale.**
- `docs/learning/defect-register.md:3-5` gives no root cause and names no check. It points to `benches-statues.md`, which still says "Implementation pending" (lines 7–8) and "Review 009 will check" (line 9). No review 009 exists.
- `benches-statues.md:14,16` has missing spaces: "to21.5", "at21.1", "from150,000 to160,000", "the24MiB".
- Both READMEs dropped their link to `campus-environment.md`, and `README.md` dropped "it is a local index rather than an internet geocoder".
- No note records the combined totals: 154,087 triangles and 24,037,572 bytes.
- There is no `docs/devlog/summary.md` line, which the fleet rules require for behaviour changes.

#### Blocking for acceptance (missing evidence, not a code defect)

**6. Nobody has checked this revision in a real browser.** Both work notes hand the native gate, the motion sample and the combined review to the coordinator, and the merge message lists only package gates. `AGENTS.md` and the local rules require real-control headless checks, mobile views, Retry, graphics-context restoration and a 60 fps sample. Criterion 5 (mobile layout, other flows after raising the zoom to 21.5) cannot be accepted from code alone. One concrete risk: on phones, `showSculpture` expands the panel (`src/main.ts:144`, and `:125` skips collapsing it), so it may cover the sculpture the flight lands on. Searching for a building behaves the same way.

#### Minor

- **Sculpture modelling frames** (`src/campus-sculptures.ts:48,111,120,125`):
  - Head tilt and the feet and hand ellipsoids use the group's axes, not each figure's own rotation.
  - The pose rotated by −1.35 rad rolls its head 26° sideways, and its feet point across its stance. The pose rotated by 3.05 rad tilts its head back.
  - Each tube segment builds its own frame (`:59-60`), which leaves cracks at elbows.
  - Two plinths, at (−0.12, 0.50) and (0.68, 1.55), are only 3 cm apart and will read as one base on screen.
- **Sculpture pins only agree with themselves:** no tool or check ties `node/5648594207` v4 or `node/6477042804` v1 to the pinned extracts. The test compares three hand-written copies (`test/campus-sculptures.test.mjs:14-27`).
- **Unescaped link:** `href="${place.sourceUrl}"` is not escaped (`src/main.ts:146`). The values are constants and `test/places.test.mjs:42` pins them to `https://news.stanford.edu/`, so this is not exploitable today.
- **Very high zoom visuals:** road widths stop scaling at zoom 18 (`src/style.ts:10`). At 21.1 a footpath is about 5 px (≈0.14 m), narrower than the bench ribbons. Regional tiles are now over-zoomed 7.5 levels anywhere in the Bay.
- **Seat-wall tags:** the seat walls carry the planting's `leaf_type` and no general "authored" flag. The existing `authored===undefined` assertion (test `:31`) still passes with eight authored features present.
- **Coupled failure:** a bad 610-byte sculpture file now disables all campus 3D detail (`src/building-worker.ts:17-20`). The error message and Retry do work.
- **Bench-way exclusions:** bench ways skip the road-clearance check that point benches get. Ways with a missing or off-campus node are dropped without being listed in `benchLines.excluded` (generator `:79,:84-85`).

#### Checked and sound

- **Original point records:** the word diff against `d683dac` removes only the 163 `modeledOrientation` values. All 969 points keep their id, version, coordinates and tags, and tree and lamp records are byte-identical. Points gained `modeledFacing` and `orientationSource`, the five teak benches gained `benchModel` and `benchEvidence`, and four wood benches gained `armrest=no` (5766887421, 13793099427, 13793099428, 13797673593).
- **Bench data:**
  - The census matches the notes: 30 wood and 1 concrete point, no direction tags, 5 teak benches, 25 mapped ways and 8 seat walls.
  - The seat walls carry no material tag and are labelled with `benchModel`, `benchEvidence` and `sourceNatural`.
- **Hashes and sizes:**
  - Environment input: 249,282 bytes, SHA-256 `554f29…`, 12,862 bytes under 256 KiB.
  - Sculpture input: 610 bytes, SHA-256 `751a0f…`.
  - Both match the docs, provenance files and tests.
- **Point bench facing:** the maths is correct and the back sits behind the seated person. The facing test fails both the old 90° formula and a sign flip. The miter at a closed ring's closing vertex is correct.
- **Worker and recovery:**
  - Both inputs load in parallel, each with a 15 s timeout, and give specific messages.
  - Failures reach Retry through `src/main.ts:304`.
  - Context loss reuses the cached mesh (`src/building-details.ts:229,278-279`; `src/main.ts:311-316`).
  - The worker starts only at zoom 14 or closer and within 6 km of campus (`:295-298`). No new eager fetch was added.
- **Sculpture rendering:**
  - Kind 12 gets plain shading, and index −2 never matches the selected building (`src/building-details.ts:55,79`).
  - Culling is off and lighting uses `abs()` (`:54,:340`), so winding does not matter.
  - Normals are finite, and there are six plinths.
  - The nearest building edge is about 9 m from the Burghers anchor. There is no building vertex near the Angel, and no tree, bench or lamp within about 20 m of either anchor.
- **Budget:** 154,087 triangles against the 160,000 cap (5,913 to spare) and 24,037,572 bytes against 24 MiB, still in two buffers, two draws and the same sliced upload.
- **Interface:**
  - Search finds both works by name, by "rodin" and by "sculpture".
  - The card escapes name, description, material and artist, and states the modelling limits.
- **Max zoom 21.5:** nothing depends on the old 19.5 limit.
  - Held-key movement works in screen pixels (`src/keyboard-pan.ts:11`).
  - Middle-mouse tilt changes pitch only (`src/mouse-tilt.ts:29`).
  - `src/input-handler.ts` has no zoom bounds.
  - The Bay overview caps at zoom 10 (`src/main.ts:106`), and building search uses zoom 18.
- **Tests:** none was weakened beyond the approved 160k limit and the data refresh.
- **Branches:** the two `codex/*` parked commits hold 8 and 11 files, all identical to the merge, so no newer fix was left behind.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Bench ways with no material tag became solid 0.45 m seats in the concrete tone, and five also got 0.91 m backs: 23 of 25 mapped ways. A wood way would also have come out concrete-toned. Claude: blocking. Codex: should-fix. | Accepted. It breaks the increment's own rule that an unknown material gives a flat neutral marker, not an invented design. | `8e45ed8`: unknown-material ways are 0.38 m flat neutral markers on their mapped path. Wood, concrete and stone ways stay solid in their own tone, and the seat walls are unchanged. The test "bench ways of unknown material…" goes red with the old rule. |
| F1 | On a 390×844 phone the artwork card expanded the panel over the flight centre, about (178, 362), and hid the work. Codex: should-fix. Claude: a risk under its item 6. | Accepted. Codex saw it in the original worker's retained captures. | `8e45ed8`: on phones, artwork flights keep the panel compact, and Expand places opens the card. The native check asserts that the panel leaves the flight centre uncovered for both works. |
| F2 | A bent way's back switched sides between segments. The generator estimated a way's facing from its middle node and did not guard against zero distance, so `way/1509660899` got facing 0. Claude: should-fix. | Accepted. | `8e45ed8`: the generator measures from the middle of the way's length and skips paths within 5 cm, and regeneration changed 10 facings. The renderer puts one back along the whole way, opposite the modeled facing. Where that facing lies along the way, the back goes on a bent way's outer side. The test "a tagged backrest runs one side…" goes red with the segment-by-segment rule. |
| F3 | Provenance `retained.bench` counted the 25 ways and 8 authored walls as retained source nodes: 196 against 166 before and 3 excluded. Claude: should-fix. | Accepted. | `8e45ed8`: `retained` counts nodes only, 163. A test asserts retained equals before less excluded for each kind, and goes red with 196. |
| F4 | Test gaps: an absent backrest, numeric-string direction, the seat walls' closing seam, backs on ways, sculpture clearance, the environment input's failure messages and the zoom limit for the 21.1 flights. The bench note's "proves" overstated the tests. Claude: should-fix. | Accepted. | `8e45ed8` adds a test for each, and each goes red with its defect put back: 10 of 11 mutations. The eleventh, a data-only facing of 0 on `way/1509660899`, gives the same side, and the data's hash pin holds it. [design.md](../design.md) corrects the overstatement in its integration amendments. |
| F5 | Documents: the defect register entry had no root cause or check. `benches-statues.md` said "Implementation pending" and "Review 009 will check", and lacked four spaces. Both READMEs dropped their `campus-environment.md` link, and the README dropped its local-index sentence. No note recorded the combined totals, and there was no devlog line. Claude: should-fix. | Accepted. | `8e45ed8`: the defect register and both READMEs. The docs change after it folds the notes into [design.md](../design.md) with amendments and the four spaces restored. It also records status and totals in [plan.md](../plan.md) and adds the devlog line. |
| F6 | Nobody had checked the revision in a real browser. Claude: blocking for acceptance. | Accepted. | A native check through real controls on the repaired tree passed 17/17 (Verification). |
| F7 | Sculpture modelling frames: head tilt and the feet and hand ellipsoids use the group's axes. The pose turned −1.35 rad rolls its head 26° and its feet point across its stance, and the pose turned 3.05 rad tilts its head back. Tube segments crack at elbows, and two plinths stand 3 cm apart. Claude: minor. | Deferred. This is the quality of a stylized model, not a source fact or a correctness defect, and design.md records it as a limit. | None in this increment. |
| F8 | The sculpture pins agree only with themselves: nothing ties `node/5648594207` v4 or `node/6477042804` v1 to the pinned extracts. Claude: minor. | Accepted as a bound. The raw extracts are not a repository input, so tests cannot read them. | Checked by hand on 2026-10-29 against the four hash-verified extracts: both ids, versions and coordinates match. |
| F9 | The card's `href` was not escaped. Claude: minor. | Accepted. | `8e45ed8` escapes it. |
| F10 | At zoom 21.1, road widths stop scaling at zoom 18, and regional tiles are over-zoomed 7.5 levels anywhere in the Bay. Claude: minor. | Deferred. It is visual quality at extreme zoom, with no functional break. | None. |
| F11 | The seat walls carry the planting's `leaf_type` and no general authored flag. Claude: minor. | Rejected. They carry `benchModel`, `benchEvidence` and `sourceNatural`, and provenance names them authored interpretations. `leaf_type` is a retained source tag of the mapped way. | None. |
| F12 | A bad sculpture file disables all campus 3D detail. Claude: minor. | Accepted as designed. Both inputs are pinned local files, the error names the failed input, and Retry recovers, which the native check exercised. | None. |
| F13 | Bench ways skip the road-clearance check, and a way with a missing or off-campus node is dropped without a `benchLines.excluded` record. Claude: minor. | Deferred. The extracts hold 27 bench ways. 25 are kept and 2 lie wholly outside the campus boundary, which points outside it also leave unrecorded. None has a missing node or crosses the boundary. | None. |

## Verification

Before review, on `7dba7ab` with Node 24.18.1: `npm ci`, typecheck, 60/60 unit tests, build (only the known MapLibre chunk-size warning) and `npm audit` with 0 vulnerabilities.

On the repair `8e45ed8`: typecheck, 64/64 unit tests, build and audit with 0 vulnerabilities. The parent's generator reproduces `554f290a…` byte for byte from the four extracts, which match their pinned SHA-256. The repaired generator gives `c49c2f66…`, 249,293 bytes, with 10 changed facings and no other change. Mutation checks put each defect back in turn: 10 of 11 turned their test red.

A native headless check through real controls ran on the repaired tree's production build, in system Chrome at 1920×1080 with DPR 1 and at 390×844 (ANGLE on an RTX 4090, Direct3D 11). It ran inside met's gate lock and passed 17/17:

- a regional start with no detail request;
- HTTP 503 and malformed-JSON failures of the sculpture input, each naming the input, then Retry to the full mesh: 153,765 triangles and 23,987,340 bytes in two draws, with 196 seating assemblies and both works;
- search and card flights to both works at zoom 21.1 within 1 m of their anchors;
- four bench targets brought under the camera by drags and zoomed to 21.5;
- held W with a right drag: 308 frames, p95 interval 7.2 ms, maximum 10.1 ms;
- `WEBGL_lose_context` restoration from the cached mesh with no new input request;
- the phone panel leaving both works uncovered, with the card shown by Expand places.

All 26 captures were inspected at native size. The run logged no page error. Its one console warning is MapLibre's notice that a custom layer is not restored automatically; the app re-adds the layer itself.

## Round outcome

Neither lane accepted `7dba7ab`. Claude raised one blocking code finding (F0) and one blocking evidence gap (F6), and both lanes raised should-fix findings. `8e45ed8` repairs F0 to F6 and F9. The docs part of F5 follows in the docs change that adds this record. F7, F10 and F13 are deferred with reasons, F8 and F12 are accepted as bounds, and F11 is rejected. Round 10 re-reviews the repair.
