# Review 10: integration

## Target

Repository `maps`, branch `claude/mapsort-benches-sculptures`, revision `8e45ed87f459b38bb077a362e369d26f68d3791a`, the repair of round 9's findings on `7dba7ab`. Both reviewers received `git diff 7dba7ab 8e45ed87` without `public/data/stanford-environment.geojson`, which they read from the checkout. The prompt misnamed the revision as `8e45ed8e`; both lanes reviewed the checkout at `8e45ed87`, and Codex noted that the misnamed prefix did not resolve.

## Reviewers and coverage

Both lanes had the same setup as round 9, with raw runs in `artifacts/mapsort/review-runs/r2/`. Both were told which findings the repair addresses and which docs work was still to come.

- Codex CLI 0.163.0, `gpt-6-astra` at `xhigh`, read-only sandbox. It ran 23 focused tests, TypeScript and `git diff --check`, and compared the whole data file with its parent's. It read `src/building-worker.ts:8` outside the diff. It ran no build, audit, regeneration or browser. Its log holds no DLL failure marker.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, with round 9's tool limits. The `system/init` event confirmed them, and `modelUsage` held only the pin. The limits refused `npm test` and inline Node, so it checked the data with `git` and `grep` and the geometry by hand. It did not delegate.

## Reports

Each report is kept as the reviewer wrote it, with its headings demoted under this section.

### Codex (`gpt-6-astra`)

**One should-fix and two minor findings remain. No blocking finding.** Reviewed checkout `8e45ed87f459…`, whose parent is `7dba7ab`; the supplied prefix `8e45ed8e` does not resolve.

1. **Should-fix — the facing filter excludes segments, not touching footpaths.** At [build-campus-environment.mjs:55](C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/tools/data/build-campus-environment.mjs:55), another segment of the same touching way can still win. An in-memory run of the generator reproduced this: a footpath through the bench, with a later segment one metre east, produces facing `90` toward that same footpath instead of the separate eligible path north. The shipped `node/5759657845` also rotates exactly 90° while retaining `orientationSource: way/663770758`. Given unchanged extracts and coordinates, this demonstrates selection of another segment of the rejected touching way. Exclude touching way IDs before choosing the nearest remaining path, and cover this with a generator fixture.

2. **Minor — the back stays on one side but has open joins at bends.** [campus-environment.ts:100](C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/src/campus-environment.ts:100) computes thickness offsets separately per segment. On actual `way/1509660899`, adjoining back edges miss by **3.99 cm and 4.28 cm**. Independent point-in-triangle checks confirm uncovered wedges in the top surface; the inner corners overlap. Use shared corner offsets or explicit joins. The new side-sign test does not detect these seams.

3. **Minor — the data README’s environment link remains plain text.** [public/data/README.md:34](C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/public/data/README.md:34) restores the reference as `docs/work/…/campus-environment.md`, without a Markdown link. From this directory, its link target should begin `../../docs/`. This concerns the claimed link restoration, not the deferred F5 work.

The complete [GeoJSON comparison](C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/public/data/stanford-environment.geojson:1) found these ten changed features. Source IDs below are way IDs.

| Feature | Facing: parent → repair | Orientation source change |
|---|---:|---|
| `node/5759657845` | −76.93 → −166.93 | Unchanged |
| `way/30775872` | 68.67 → 81.18 | Unchanged |
| `way/481335243` | 77.37 → −19.74 | 698374086 → 23693331 |
| `way/481335244` | 46.39 → 57.78 | Unchanged |
| `way/694955888` | −165.22 → 14.33 | 31711949 → 333370723 |
| `way/694955892` | 14.8 → −164.36 | 31711949 → 220971636 |
| `way/694955895` | 14.33 → −165.2 | 333370723 → 31711949 |
| `way/694955898` | 14.78 → −164.24 | 31711949 → 1167914902 |
| `way/1508655699` | −83.57 → −83.6 | Unchanged |
| `way/1509660899` | 0 → 15.16 | Unchanged |

Only facing estimates and five source references changed. All 1,002 features, ordering, coordinates, source tags and other properties are unchanged. The 249,293-byte asset matches its recorded SHA-256. There is no unexplained data change, but finding 1 prevents accepting every estimate as satisfying the stated rule.

The following repairs checked out:

- **F0:** 23 unknown-material ways emit only flat neutral markers; known materials retain their tones, and eight authored walls remain solid.
- **F1:** Code inspection confirms artwork navigation compacts the phone panel and preserves its card for Expand places.
- **F2:** Length-midpoint calculation and consistent back-side selection are correct, subject to the findings above.
- **F3:** Node-only retained counts balance exclusions correctly.
- **F4:** Added tests pass for direction strings, absent backs, wall closure, materials, side selection, zoom limits, sculpture vertices and input failures. Outside the diff, I inspected [building-worker.ts:8](C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/src/building-worker.ts:8): the tests exercise the actual input-specific HTTP, JSON and network error paths.
- Source URL escaping and the defect-register root-cause addition are sound.

**Verification:** 23/23 focused tests, TypeScript checking and diff whitespace checking passed. No files changed. Browser verification, production build, dependency audit and raw-extract regeneration were not run; mobile framing is therefore assessed by code inspection, not a fresh rendered observation.

### Claude (`claude-opus-5-5[1m]`)

#### Re-review of `8e45ed87` (repair of `7dba7ab`)

Most of the repair holds up. F0, F1, F3, F4, the F5 part, the escaped link and the F2 renderer change are correct. The F2 generator change is not. Its 5 cm guard changed one bench it wasn't meant to, and the one bench way with a back still has no real facing. That gives two should-fix findings and nothing blocking. I could not run any gate myself (see the last section).

##### 1. Should-fix: the 5 cm guard skips path segments, not the path the bench touches

`tools/data/build-campus-environment.mjs:55` drops any path *segment* closer than 5 cm and takes the next-nearest segment, even when it belongs to the same way. The code that builds the path list (`:49-52`, outside the diff) stores one entry per segment. The comment at `:53`, `public/data/README.md:34` and the provenance (`public/data/stanford-environment-provenance.json:41`) all promise the "nearest path it does not touch". Two regenerated features show the difference:

- **`node/5759657845`** is an unintended change, and the commit message doesn't mention it.
  - Its facing went from −76.93 to −166.93, a change of exactly 90.00°, with the same source path, `way/663770758`.
  - For a node, only the new guard can change the facing, so its old nearest segment was under 5 cm away. A new direction from the same path that is exactly perpendicular to the old one means the bench lies on that footway's line and now faces along it.
  - It has no material tag, so it is drawn as a 1.6 m flat marker whose long side is perpendicular to its facing (`src/campus-environment.ts:111-116`). The marker used to lie along the footway; now it lies across it. This is the only data change visible in the scene.
- **`way/1509660899`** still points along its own line.
  - The new 15.16° is the bearing from the way's length midpoint back along its own middle segment toward node 2; by hand I get ≈15.17°.
  - Its source is still `way/1509660417`, the footway its third node lay on (that was the old atan2(0,0)). So the footway runs along the bench's middle segment, and the new facing points along the bench too.
  - Against the way's overall line the cosine is 0.013. The back ends up on the outer side only because of the fallback at `src/campus-environment.ts:91`; the facing plays no part. The old value of 0 would also have used the fallback (cosine −0.2485), which is why no test went red for it.

**Bound:** the raw footway geometry isn't available here. This conclusion rests on the code path and on the exact 90.00° change from an unchanged source path.

**Fix:** for a bench lying on a path, I'd face it across the segment it lies on, as the node's old value did, and say so in the docs. The other option is to exclude touching ways by id, which is what the docs currently describe. Then regenerate and list each changed feature.

##### 2. Should-fix: no check covers the generator's facing estimate, but the defect register says the class is covered

`docs/learning/defect-register.md:7` says the checks "cover the class, each red with its defect put back". That class includes facing: the symptom at `:5` names road-derived facing, and review 9's F2 found the middle-node and atan2(0,0) facing.

But `modeledFacing` is a closure inside `buildCampusEnvironment` (`tools/data/build-campus-environment.mjs:54`), so no test can call it. The commit message admits the facing-0 defect is held only by the hash pin. A hash pin proves the bytes didn't change, not that they are right (R19), and that is how finding 1 got through.

**Fix:** export the estimate and add fixture tests for:
- a node lying on a path's line;
- a way that shares a node with a footway;
- a two-node way.

Then name those checks in the register (R17).

##### Regenerated data: what changed

I compared the file with the parent's using word diffs at token and property level. 15 tokens changed across 10 bench features, and they account for exactly the +11 bytes. No coordinates, ids, tags, versions or feature order changed, and both SHA-256 hashes match their pins.

| Feature | Drawn as | modeledFacing | Source path | Cause |
|---|---|---|---|---|
| node/5759657845 | flat point marker | −76.93 → −166.93 | same | 5 cm guard; unintended |
| way/1509660899 | concrete seat with back | 0 → 15.16 | same | midpoint and guard; still along its line |
| way/30775872, 481335243, 481335244 | flat, 2 nodes | 68.67→81.18, 77.37→−19.74, 46.39→57.78 | 481335243 changes | length midpoint, not the end node |
| way/694955888, 892, 895, 898 | flat, 2 nodes | flips of about 180° | all four change | length midpoint |
| way/1508655699 | flat closed ring | −83.57 → −83.6 | same | length midpoint |

The eight midpoint changes on flat ways are the intended estimate. They don't affect the picture, because flat markers ignore facing. The four way/6949558xx facings lie within about 1.2° of their own line, before and after.

##### Checked and found sound

- **F0:**
  - The way rule's solid set matches the point rule's (seat walls, stone, concrete, wood), and each material keeps its own tone.
  - The flat marker matches the point marker: 0.38 m wide, at 0.025 m, neutral tint.
  - The data counts match the READMEs: 23 of 25 ways have no material, and 5 of the 6 `backrest=yes` ways are among them. The 127 unknown points are 163 minus 30 wood, 1 concrete and 5 untagged teak.
- **F1:**
  - Compact mode hides the card (`src/styles.css:3`).
  - Every artwork entry point goes through `goTo` (`src/main.ts:139`, `:148`, `:209`, `:224`).
  - The phone flight centre is at y≈362 (`src/main.ts:114`). That is below the compact panel, which I estimate ends about 185 px down.
- **F2 renderer:**
  - The side signs and the 14.5° threshold are correct, and one side is chosen for the whole way.
  - By hand, the old per-segment code put `way/1509660899`'s back left, left, then right, so the new test really does go red on it.
- **F3:** each kind balances (726 = 728 − 2, 163 = 166 − 3, 80 = 81 − 1), and nothing else reads `retained`.
- **F4:**
  - The worker messages (`src/building-worker.ts:9-12`) match the new test patterns.
  - The sculpture renderer emits only triangles (`src/campus-sculptures.ts:39-41`), so the clearance test's stub is enough.
  - For a closed way both end normals use the same neighbours (`src/campus-environment.ts:75`), so the seam test checks something real.
- **Other:**
  - Inward-wound ribbon walls are harmless, because face culling is off and lighting uses `abs(dot)` (`src/building-details.ts:340`, `:54`).
  - The README restorations match the pre-merge wording (`d683dac`).
  - `escapeHtml` escapes both kinds of quote (`src/main.ts:80-82`).

##### Not run

This session's permission mode declined `npm test`, inline Node scripts and directory listings outside the worktree. So I didn't attempt the typecheck, build, audit or browser check. The commit's 64/64 tests and 17/17 browser checks are its own claims, not results I reproduced. I did the data comparison with git and grep, and the geometry by hand. Without the raw extracts I couldn't confirm the byte-for-byte rebuild or the footway geometry behind finding 1.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F14 | The 5 cm guard skipped path segments, not the path touching the bench, so another segment of the same footway could win. `node/5759657845` turned exactly 90° toward its own footway, and `way/1509660899`'s new facing still pointed along its own line. Codex: should-fix. Claude: should-fix. | Accepted. The docs promised the nearest path the bench does not touch. | `5c9f24b`: `estimateFacing` sets aside, by id, every path within 5 cm of any of the bench's nodes. Regeneration changed only those two features (Verification). |
| F15 | No test reached the generator's facing estimate, while the defect register said the class was covered. Claude: should-fix. | Accepted. A hash pin proves the bytes are unchanged, not that they are right. | `5c9f24b` exports `estimateFacing` with fixture tests for a node on a footway, a way sharing a node with one, a two-node way and two plain cases. Each facing mutation turns them red, and the register names them. |
| F16 | A bent way's back was offset segment by segment, leaving gaps of 3.99 cm and 4.28 cm at the bends of `way/1509660899`. Codex: minor. | Accepted. | `5c9f24b` centres the back on the seat's mitred edge, so segments share its corners. A test counts two top corners per node and goes red with unshared corners. |
| F17 | The data README's environment reference was plain text. Codex: minor. | Accepted. | `5c9f24b` links it. |

## Verification

Verified on the repair `5c9f24b`, Node 24.18.1: typecheck, 65/65 unit tests, build and audit with 0 vulnerabilities. Every check added in rounds 9 and 10 went red when its defect was put back: 15 mutations. They covered the segment-level guard, a middle-node midpoint, no guard at all, unshared back corners, the segment-by-segment side, no outer-side fallback, solid unknown-material ways, an open closing seam, the old backrest rule, ignored numeric strings, ways counted as retained, the old 19.5 zoom limit, a literal maximum zoom, a sculpture moved into a building, and a worker that names the wrong input.

The four hash-verified extracts give `c6d7e080…`, 249,292 bytes. Against `8e45ed87` two features changed: `node/5759657845` went from −166.93 toward `way/663770758` to 16.63 toward `way/601164991`, and `way/1509660899` from 15.16 toward `way/1509660417` to 164.61 toward `way/1509660898`. Against `7dba7ab` there are ten changes, all `modeledFacing` and `orientationSource`. The other eight are the length-midpoint estimates that round 10 confirmed.

The native headless check ran again on the repaired build inside met's gate lock and passed 17/17: held W with a right drag gave p95 6.5 ms over 289 frames, with the same mesh totals. 19 of its 27 captures are byte-identical to the round 9 run's. The 8 that differ were inspected at native size: the backed concrete bench, the three Angel views, the two views after motion and restoration, and a new phone view of the Inner Quad seating.

## Round outcome

No blocking finding. `5c9f24b` repairs both should-fix findings, F14 and F15, and both minor ones, F16 and F17. Round 11 re-reviews it.
