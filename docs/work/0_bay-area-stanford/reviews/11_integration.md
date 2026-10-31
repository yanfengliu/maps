# Review 11: integration

## Target

Repository `maps`, branch `claude/mapsort-benches-sculptures`, revision `5c9f24b592173bf0176dd1dae3469210e5781d7a`, the repair of round 10's findings. Both reviewers received `git diff 8e45ed87 5c9f24b` without `public/data/stanford-environment.geojson`, which they read from the checkout.

## Reviewers and coverage

Same setup as round 9, with raw runs in `artifacts/mapsort/review-runs/r3/`.

- Codex CLI 0.163.0, `gpt-6-astra` at `xhigh`, read-only sandbox. It reproduced its finding in memory, ran 13 environment tests, TypeScript and `git diff --check`, and compared the data file with its parent's. It read `src/building-details.ts:54` and `:340` outside the diff. It ran no build, audit, regeneration or browser. There were no DLL failure markers.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, with round 9's tool limits, which the `system/init` event confirmed. `modelUsage` held only the pin. The limits refused every test and Node command, so it worked by hand and with git. It did not delegate.

## Reports

Each report is kept as the reviewer wrote it, with its headings demoted under this section.

### Codex (`gpt-6-astra`)

Reviewed `5c9f24b592173bf0176dd1dae3469210e5781d7a`. **One should-fix and one minor finding; no blocking finding.**

1. **Should-fix — midpoint intersections regain arbitrary facing.** At [build-campus-environment.mjs:44](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/tools/data/build-campus-environment.mjs:44), the previous distance guard is removed, but the exclusion set checks only original bench nodes. For bench `[[0,0],[10,0]]`, a footpath from `[5,-1]` to `[5,1]` crosses its midpoint without approaching either node. With another path three metres south, the parent returns `180°` toward that southern path; this revision selects the crossing path and returns `0°` from `atan2(0,0)`. I reproduced both results. Include the calculated midpoint in whole-path exclusion and add this fixture. This is a generator regression, not a demonstrated error in the two changed production features.

2. **Minor — right-side backrests have inward winding.** At [campus-environment.ts:101](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/src/campus-environment.ts:101), vertex order stays unchanged when `side` switches to `-1`, reversing the backrest’s face normals. For actual `way/1509660899`, all six top triangles now have normal `[0,0,-1]`; the parent produced `[0,0,1]`. Reverse winding for right-side backs and check both sides. This currently causes **no visible shading/culling defect**: outside the diff, [building-details.ts:54](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/src/building-details.ts:54) uses absolute-dot lighting and [line 340](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/src/building-details.ts:340) disables face culling.

The requested node-contact exclusion works by whole path ID, and length-midpoint calculation is preserved. F15 now directly exercises the generator. F16’s shared-corner repair works: the actual bent back has eight unique top corners, down from twelve. F17’s link resolves.

The GeoJSON comparison confirms exactly the two stated feature changes, unchanged coordinates/tags elsewhere, **249,292 bytes**, and the recorded SHA-256. All **13 environment tests**, TypeScript checking and diff whitespace checking passed.

No files were changed. Full-suite/build/audit/browser checks and raw-source regeneration were not run; the extracts were unavailable.

### Claude (`claude-opus-5-5[1m]`)

I found two should-fix problems and nothing blocking. Both are in the F14 repair: it does what its updated docs say, but it doesn't remove the symptom it was for, and it drops a guard the parent had. F15, F16 and F17 are correct. This session's permissions blocked every test and Node command, so all checks below are by hand or with git (see the end).

#### 1. Should-fix: `node/5759657845` still faces along its own footway

- **What the code does:** `tools/data/build-campus-environment.mjs:40,44` sets the touching footway aside by id, then takes the nearest remaining path. For a bench sitting on a footway, that is usually the next path along the same route.
- **The three published facings show it:**
  - In `7dba7ab` it faced −76.93°, across `way/663770758`.
  - The exact 90.00° turn to −166.93° in `8e45ed87` puts that footway's line at 13.07°/193.07°.
  - The new 16.63° is only 3.56° off that line.
- **What you see:** the node has no material, so it is drawn as a 1.6 × 0.38 m flat rectangle whose long side runs across its facing (`src/campus-environment.ts:109-114`, outside the diff).
  - A rectangle looks the same turned 180°, so the marker is now only 3.56° from where `8e45ed87` put it: lying across its own footway.
  - That is the visible problem round 10 reported. In `7dba7ab` the marker lay along the footway.
  - The commit message's "not its own footway" is true of the source id, not of how the bench is turned.
- **Reproduction (worked by hand):** `estimateFacing([[0,0]],[{id:'1',a:[-2,0],b:[2,0]},{id:'2',a:[2,0],b:[6,0.3]},{id:'3',a:[-5,4],b:[5,4]}])` returns `{modeledFacing:90, orientationSource:'way/2'}`.
  - The bench faces along footway 1, toward the path that continues it, even though `way/3` runs parallel 4 m north.
  - Fixture 1 (`test/campus-environment.test.mjs:198`) only puts its second path parallel, so it can't catch this.
- **Lost evidence:** fixture 2 (`:200`) sets aside a footway passing 0.5 m in front of the bench, only because it shares the bench's end node.
- **Fix:**
  - Face a bench that lies on a path across the segment it lies on, as round 10's first option suggested. Use the nearest path it doesn't touch only to pick which side, and say so in the docs.
  - For ways, the renderer only uses facing to pick a side (`src/campus-environment.ts:87-91`). So the generator could output the way's overall normal, pointed toward the nearest path it doesn't touch, and a facing along the bench could never come out.
  - Add the fixture above, regenerate, and list each feature that changes.

#### 2. Should-fix: the guard at a bench way's middle was dropped

- **What changed:** `8e45ed87` skipped any segment within 5 cm of the point it measures from, which for a way is the middle of its length. `estimateFacing` now tests only the bench's nodes (`:40`), then measures from the middle with no guard (`:44`).
- **What happens:** a footway that crosses a bench way between its nodes is neither set aside nor skipped.
  - If it crosses at the middle, the result is atan2(0,0) = 0. That is the exact defect the register records for `way/1509660899`.
  - By hand, `estimateFacing([[0,0],[4,0]],[{id:'9',a:[2,-1],b:[2,1]},{id:'10',a:[0,-3],b:[4,-3]}])` returns `{modeledFacing:0, orientationSource:'way/9'}`. The parent's rule gives 180 toward `way/10`.
  - A steep crossing near the middle gives a facing along the bench, the other form of F14.
- **Docs claim too much:** "sets aside every path a bench touches" (`docs/learning/defect-register.md:7`) and the test name "every path through the bench" (`test/campus-environment.test.mjs:195`) both say more than the code does.
- **Effect on the current data:** any bench way hit by this would have changed against `8e45ed87`, and only `way/1509660899` did.
  - Its `8e45ed87` value means no other path lay between 5 cm and 4.58 m from its middle.
  - So `way/1509660898` is either at least 4.58 m away or within 5 cm. Only the raw extracts can tell.
- **Fix:** decide "touching" by distance from the bench's segments (under 5 cm, segment to segment) rather than from its nodes, and add the crossing fixture.

#### Worth checking in the extracts (not a finding)

- `way/1509660899`'s new 164.61° is within 1.8° of the bearing from its middle to its own last node (8.16 m away, at 166.4°).
- If `way/1509660898` passes within about 0.3 m of that node, the facing is again set by a path that runs into the bench, just outside the 5 cm guard.
- Nothing would look different: both the facing and the outer-side fallback put the back on the right.

#### Checked and found sound

- **Data:**
  - Word diffs against `8e45ed87` show exactly two changed features, `node/5759657845` and `way/1509660899`, and only `modeledFacing` and `orientationSource` changed in each. No coordinates, tags, ids or feature order changed.
  - The 1-byte shrink is exactly those two edits.
  - The file is 249,292 bytes with SHA-256 `c6d7e080…`, matching the provenance (`stanford-environment-provenance.json:113-114`), the README and the test pin (`:23`).
  - None of the 188 benches has an `unknown` source or a facing of exactly 0.
- **F14 code:**
  - Setting paths aside by id works as described.
  - The midpoint loop matches the inline code it replaced.
  - Single-node benches and zero-length segments are handled.
  - Both call sites (`:83`, `:97`) pass local metres, using the path list built at `:62-66` (outside the diff).
- **F15 tests:** worked through by hand, all five fixtures pass on this code. Each goes red on the defects claimed: the segment-level guard, no guard, and measuring from the middle node.
- **F16 back:**
  - Neighbouring segments compute their shared back corners from the same inputs, so the corners are bit-for-bit identical.
  - Closed ways share the normals at their seam (`src/campus-environment.ts:75`).
  - The old code makes 12 top corners on `way/1509660899` against the 8 the test expects, so the test does go red on it.
  - The triangle winding now flips with the side. That is harmless because face culling is off (`src/building-details.ts:340`) and lighting is two-sided (`:54`).
- **Backrest test:**
  - Worked by hand, `way/1509660899` bends left. Its facing points to the left of the way's overall line with a cosine of 0.497, so the back goes on the right.
  - On the bent fixture, facings of 58° and 238° run along the way, so the outer-side fallback applies.
  - Choosing the side per segment, or dropping the fallback, makes the test fail.
- **F17:** the README link resolves. The provenance (`:41`), README (`:34`) and generator comment (`:33-38`) match the code. `git diff --check` is clean.

#### Not run

This session's permissions blocked `npm test`, `node --test`, inline Node scripts, and reads outside the worktree. That includes the cached extracts at `artifacts/bay-area-stanford/stanford-source/`.

So the typecheck, the 65 tests, the build, the audit, the browser check and the byte-for-byte regeneration are the commit's claims, not results I reproduced.

I took the `7dba7ab` facings from round 10's reports in the ignored `tmp/review-runs/r2/`, then confirmed them with git. I edited no files.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F18 | Only the bench's nodes decided which paths touch it. A footway crossing a way between its nodes was not set aside, and one crossing at the middle gave atan2(0,0) = 0. Codex: should-fix. Claude: should-fix. | Accepted. | `a2486a8`: a path is set aside whole when any of its segments comes within 5 cm of any bench segment, crossings included. Fixtures cover a crossing at the middle and a steep crossing near it, red with nodes-only touching. |
| F19 | `node/5759657845` lies on `way/663770758` and still faced along it, toward the next path on the same route, so its flat marker lay across its own footway. Claude: should-fix. | Accepted. Two guard patches had not held, so the rule changed shape. | `a2486a8`: a node lying on a footway faces across that footway's segment, and a way faces across its own length-weighted line. The nearest untouched path only picks the side, so neither can face along itself. The node now faces 103.07, its marker along the footway, as at `7dba7ab`. A test checks that every open mapped way's facing crosses its line. |
| F20 | A back mirrored to the right had its winding reversed: all six top triangles of `way/1509660899` pointed down. Codex: minor. | Accepted. It was invisible under two-sided lighting, but wrong. | `a2486a8` lists the faces the other way round on the right, and a test checks that top faces point up on both sides. |
| — | Claude noted that `way/1509660899`'s facing of 164.61 nearly pointed at its own last node. | Superseded: under `a2486a8` it faces 104.39, across its own line. | None. |

## Verification

On `a2486a8`, Node 24.18.1: typecheck, 65/65 unit tests, build and audit with 0 vulnerabilities. All 19 checks went red with their defect put back. Four of them were new: touching judged by nodes only, a way facing its reference path, a node on a path facing its reference path, and unflipped winding.

The four hash-verified extracts give `d9c056c5…`, 249,297 bytes. Against `5c9f24b` only facings changed, in 22 features: the node and 21 ways. The native check passed 17/17 again inside met's lock, with p95 7.0 ms over 292 frames. 22 of its 27 captures are byte-identical to the previous run's, and the 5 that differ were inspected at native size.

## Round outcome

No blocking finding. Two should-fix findings, F18 and F19, and one minor, F20, were repaired in `a2486a8`. Round 12 re-reviews it.
