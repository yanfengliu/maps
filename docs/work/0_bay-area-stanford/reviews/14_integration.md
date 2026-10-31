# Review 14: integration

## Target

Repository `maps`, branch `claude/mapsort-benches-sculptures`, revision `15e542303dedefbd96cf43bda6ea7fdd38dc8a67`, the integrated revision for `main` at `e33e75f4442aa4a2c09ba207ad649c2c01df029a`. Round 13 reviewed `c5483cd`. Three commits followed it unreviewed:

- `649d7c2` answers round 13's findings F26 to F29 and records F30 as a limit.
- `59467b6` merges `main` at `e33e75f`, which adopted `docs/work` into the fleet work-docs allocator. It merged without a conflict and changes no code.
- `15e5423` changes docs only. It folds the three notes into [design.md](../design.md) and adds the records of rounds 9 to 13. It also updates [plan.md](../plan.md), the links in the two READMEs and the defect register, and the devlog.

Both reviewers received `git diff c5483cd 649d7c2` and `git diff 59467b6 15e5423`, without the five new review records, which they read in the checkout. They were also pointed at the raw reports of rounds 9 to 13, to check the records against them.

## Reviewers and coverage

Both lanes ran from the ignored run folder `artifacts/mapsort/review-runs/r6/`, outside the reviewed worktree, with the same prompt. The worktree's status and `git diff HEAD` were empty before and after both runs, and neither lane's logged tool calls wrote a file.

- Codex CLI 0.163.0, `gpt-6-astra` at `xhigh`, read-only sandbox, ephemeral session. Its one attempt to start a subagent failed (`collab spawn failed`), so it worked alone. It ran TypeScript, the 63 unit tests that write no files, skipping the two that do, and `git diff --check`. It regenerated both environment files in memory from the four hash-verified extracts and compared them byte for byte. It reproduced its F33 ring through the actual renderer. It read `src/styles.css:3` and `src/campus-environment.ts:69` and `:121` outside the diffs, and the ten raw reports. It ran no installation, build, audit, browser or mutation. The runbook's Codex check found no failed command in its log.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, with the runbook's current limits. Its tools were Read, Glob, Grep, Task and Bash, with Bash allowed only `git diff`, `git log` and `git show`. It ran in `dontAsk` mode with no settings files, MCP off, and subagents held to the lane's model in the foreground. The `system/init` event showed those five tools, `dontAsk` and no MCP servers, and `modelUsage` held only the pin. `dontAsk` refused 15 of its 58 Bash calls, among them `node`, `git ls-tree`, `git merge-tree` and hashing the extracts. Claude Code ran the rest, which it counts as read-only, such as `git status`, `git grep` and `sha256sum` inside the worktree. So it ran no tests, gates, generator or browser. It did not delegate.

## Reports

Each report is kept as the reviewer wrote it, with its headings demoted under this section. Links in the Codex report point into the integration worktree, which is removed after the push; the paths after `artifacts/mapsort/wt/` are repository paths.

### Codex (`gpt-6-astra`)

Reviewed `15e542303dedefbd96cf43bda6ea7fdd38dc8a67`. **One should-fix and six minor findings; no blocking finding.** I found no regression affecting the shipped data.

1. **Should-fix — the recorded data comparison uses the wrong baseline.** [design.md:121](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/docs/work/0_bay-area-stanford/design.md:121) says that, against `554f290a…`, only facings and one node’s `orientationSource` changed. The actual comparison with `7dba7ab` shows **23 changed facings and six changed way references**, with no net node-reference change. The affected ways are `481335243`, `694955888`, `694955892`, `694955895`, `694955898` and `1509660899`. Related summaries omit reference changes at [review 9:158](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/docs/work/0_bay-area-stanford/reviews/9_integration.md:158) and [review 11:120](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/docs/work/0_bay-area-stanford/reviews/11_integration.md:120). Correct these summaries; coordinates, source tags, versions and ordering are preserved.

2. **Minor — a closed ring’s back is not guaranteed to take its outside.** [campus-environment.ts:92](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/src/campus-environment.ts:92) uses a weighted turn sum that omits the closing corner, rather than polygon winding. A counterclockwise ring with local-metre vertices `[(1.6,0),(2.9,8.8),(-0.6,0.4),(-7.8,-5.6),(0.3,-1)]` receives an inside back. Rotating its starting vertex to the third vertex moves the back outside. I reproduced this through validation and the actual renderer using Stanford coordinates rounded to seven decimals. F29 fixes the rounding-noise case, but the unconditional outside claim remains too broad. Use signed area for closed-ring winding or document the limitation. No shipped ring has a rendered back.

3. **Minor — F26 still omits the zero-length exception from provenance.** [Provenance:41](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/public/data/stanford-environment-provenance.json:41) says a node lying on a path faces across it and records that path. With only a zero-length touching segment, the code instead faces and names the reference: the existing fixture returns `{90, "way/14"}`, not `way/13`. Specify “nearest nonzero touching segment,” and the reference fallback when none exists. The implementation is correct.

4. **Minor — the amendment’s missing-backrest rule excludes an existing exception.** [design.md:105](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/docs/work/0_bay-area-stanford/design.md:105) says an absent backrest tag produces no back. All five photographed Bing benches lack that tag but receive backs through [campus-environment.ts:121](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/src/campus-environment.ts:121). Qualify the statement to preserve the explicitly photo-supported family exception.

5. **Minor — the review record incorrectly says the closed-ring threshold gap was eliminated.** [Review 12:121](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/docs/work/0_bay-area-stanford/reviews/12_integration.md:121) says `649d7c2` closed that gap. The renderer’s seam/cap classification still uses **1 cm** at [campus-environment.ts:69](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/src/campus-environment.ts:69), while the generator uses **1e-9 m**. The repair aligned the normal-sum checks only. No published way reaches the remaining gap.

6. **Minor — the devlog overcounts worktrees receiving commits.** [summary.md:3](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/docs/devlog/summary.md:3) says uncommitted work in 44 worktrees was committed. The retained records show **43 commits across 44 inventoried worktrees**; [table.tsv:44](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/fold-drafts/records/table.tsv:44) identifies the remaining worktree as clean. The 41 removals and rounded 29.0 GiB figure are supported.

7. **Minor — completion statements precede the recorded actions.** [plan.md:65](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/docs/work/0_bay-area-stanford/plan.md:65) says the increment merged to `main`, which remains at `e33e75f`. [Review 9:9](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/docs/work/0_bay-area-stanford/reviews/9_integration.md:9) says this integration worktree was removed, although it remains registered and hosts this review. Record those actions as pending until completed. I treated the explicitly anticipated review-14 links as allowed.

What checked out:

- All three historical notes match exactly after the specified heading demotion and five space restorations. All ten raw reviewer reports are preserved with headings demoted; rounds 9–13 contain all six required sections.
- All 17 frozen documents match their registered hashes. Only `design.md` is newly added at the unit root. The work-document checker passes.
- `59467b6` changes no code and preserves both sides’ local-rule additions. Changed local links resolve, apart from the permitted review-14 links.
- Both generated environment files reproduce byte for byte from the four hash-verified extracts, with writes captured in memory.
- F27’s projected tie and F29’s rounding-ring fixture distinguish the old behavior. F28’s fixtures distinguish the stated alternatives. F30 is explicitly bounded. The sole published node touching a path lies mid-segment, supporting the deferred junction limits.
- Retained browser reports and capture hashes support the 17/17 results. I inspected both mobile artwork captures and the backed-bench capture. Outside the diffs, [styles.css:3](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/src/styles.css:3) confirms compact mode hides the card.

**Validation:** 63/63 tests that avoid filesystem writes and TypeScript checking passed. I skipped the two filesystem-writing startup tests, installation, build, audit, fresh browser runs and the full mutation campaign. `git diff --check` reports two preserved Markdown hard-break spaces in the copied Codex report.

No files were edited or browser/server processes launched.

### Claude (`claude-opus-5-5[1m]`)

No blocking finding. Two should-fix and seven minor findings, all in documents. The code repairs in `649d7c2` are correct, the merge `59467b6` is clean, and the work-docs rules hold. Permissions blocked `node` and `npm`, and shell access outside the worktree, so I ran no tests, gates, generator or browser. I checked everything else with git, hashes, reading and the OSM extracts. I did not delegate, since any agent would have had the same limits.

#### Should-fix

**1. `docs/work/0_bay-area-stanford/design.md:121` misstates what changed in the data.** It says that against `554f290a…` "only `modeledFacing` changed, and for one node `orientationSource`". A word diff of the geojson from `7dba7ab` to the tip shows otherwise:
- 23 facing values changed.
- Six ways changed `orientationSource`: `way/481335243`, `way/694955888`, `way/694955892`, `way/694955895`, `way/694955898` and `way/1509660899`.
- `node/5759657845`'s source went to `way/601164991` and back to `way/663770758`, so no node's source changed.

This is the canonical record of how the data relates to the note's pin. Suggested text: "23 `modeledFacing` values changed, and `orientationSource` for six ways." The rest of the bullet holds: the only numeric changes are the 23 facings.

**2. `docs/work/0_bay-area-stanford/plan.md:73` credits the integrated revision with a native 17/17 pass that no record shows.**
- The last native run was on `a2486a8` (`reviews/11_integration.md:120`).
- It was not rerun on `c5483cd` (`reviews/12_integration.md:129`).
- `649d7c2`'s message says "Nothing rendered changes" and records no native run, though it changed `src/campus-environment.ts:91`.

Under R19 and the work-docs rule, coverage stays with its named target. Either run the native check on the final revision and record it in review 14, or say it last passed on `a2486a8` and nothing rendered changed after it. The devlog (`docs/devlog/summary.md:3`) and `design.md:134` have the same gap, without naming a revision.

#### Minor

**3. The claim that a closed ring's back "always takes its outside" is too strong.** It appears in `public/data/stanford-environment-provenance.json:42` (generated at `tools/data/build-campus-environment.mjs:135`), in `design.md:104` and in the comment at `src/campus-environment.ts:87`.
- For a ring, the side comes from `turn` (`src/campus-environment.ts:89,92`). That is a length-weighted sum of cross products that leaves out the closing vertex.
- Its sign matches the ring's direction for convex rings, like the test's diamond, but not always. Take the counter-clockwise U shape (0,0)→(10,0)→(10,10)→(9,10)→(9,1)→(1,1)→(1,10)→(0,10)→(0,0). Its area is +28, but `turn` is −6, so the back goes inside.
- Nothing published is affected. The four mapped rings have no material (`test/campus-environment.test.mjs:241-242`), and the seat walls have no backrest.
- Fix: use the signed area for rings, or say "a convex ring's".

**4. `design.md:114`: "Seven flat markers have such a margin"**, after "a fraction of a degree". The seven margins run from 0.28° to 3.56° (`reviews/12_integration.md:45-53`, `reviews/13_integration.md:119`), and only three are under 1°.

**5. Some documents still miss limits that F26 added to the provenance.**
- `public/data/README.md:34` still says "nearest" without saying measured from where. It also says a point on a footpath "faces across it", with no bend, junction or spur limit. Round 12 named this exact line (`reviews/12_integration.md:62`).
- The provenance and `design.md:113` leave out the zero-length case Codex raised (`reviews/13_integration.md:24`): such a node faces, and names, its reference. Only a path made entirely of coincident nodes reaches this.
- `design.md:149` says a spur-end node "can face along the wrong segment". At a spur end it faces across its only segment (`build-campus-environment.mjs:43-44`).

**6. Two claims in `docs/devlog/summary.md:3` overreach.**
- "It now always crosses one or the other" brings back the unbounded claim that F26 removed from the register and test title. At a bend or junction, a node crosses one segment and can run along the other.
- "44 leftover worktrees … 41 removed" doesn't match the refs:
  - There are 43 branch tips named "Park the uncommitted work left in …", plus `584733e` for the main checkout.
  - `git worktree list` still shows three of the parked worktrees (commercial-corner, 1110 and 1111), so 40 were removed.
  - I could not check the 29.0 GiB.

**7. Some statements in the review records don't match the code, the data or the other records.**
- `11_integration.md:120` says "only facings changed". The node's `orientationSource` also changed: the word diff has 23 changed values, as `13_integration.md:77` says.
- `12_integration.md:121` says the gap between the two closed-ring thresholds was closed in `649d7c2`. Only the side test got the 1e-9 threshold (`:91`). The renderer's `closed` flag at `src/campus-environment.ts:69` is still under 1 cm.
- `12_integration.md:122` implies `c5483cd` recorded the bend, junction and spur limits. `git grep` finds them nowhere at `c5483cd`; they came in `649d7c2` (F26).
- `9_integration.md:144` says "four spaces". `design.md:3` restores five, since "from150,000 to160,000" is two.
- `9_integration.md:9` and `:16` say the worktree `artifacts/mapsort/wt` was "since removed". It is the checkout under review, and the coordinator removes it only after the push.

**8. Finding IDs F0–F2 are now used twice in unit 0 (low priority).** The frozen reviews 005, 006 and 007 already use them (`005_held-input.md:40`, `006_architecture.md:47-48`, `007_simultaneous-input.md:31-33`), and round 9 starts again at F0. The fleet rule (`fleet/docs/work-docs.md:128`) says IDs are assigned once per work unit. One line in the local rules saying that rounds from 9 number their own series would remove the ambiguity.

#### Checked and sound

**The `649d7c2` repairs (F26–F30):**
- F27: the 1e-6 bound is sound. The F27 fixture is exactly collinear in degrees: a 0.589 m bench projected with the generator's own `local` (`:11`). Worked by hand, it goes red at 1e-9, given the stated −1.66e-9 cosine.
- F28: worked by hand, both fixtures tell the documented rule from the alternatives (0 against 180, and `way/13` against `way/14`).
- F29: the ring fixture goes red without the threshold.
- No published facing can change, since the smallest margin, 4.9e-3, is far above 1e-6.
- No test was weakened.

**The published node limit:** `node/5759657845` lies about 0.2 mm off one segment of `way/663770758`. It sits 34.5% along a 45.6 m segment and about 15.7 m from the nearest vertex, and is not a vertex of any way. Its facing, 103.07, is the segment's bearing of 13.07° plus 90°.

**Against the OSM extracts (read outside the diffs):** both sculpture pins match their extracts in id, version and coordinates. The extracts hold 27 bench ways.

**The merge `59467b6`:** main-only files equal `e33e75f`, and branch-only files equal `649d7c2`. `local-rules.md` keeps both additions, and the merge brings in no code. On its own, `59467b6` still has the three notes at the unit root; the tip removes them.

**`design.md`:** a git diff of each note's `7dba7ab` blob against `design.md` differs only in the heading lines and the five named spaces.

**The interface amendments match the code outside the diffs:**
- `src/main.ts:126` compacts the phone panel.
- `src/main.ts:146` escapes `sourceUrl`.
- `src/places.ts:22` sets `MAX_MAP_ZOOM`, which `main.ts:387` uses and `test/places.test.mjs:51` tests.

**The mesh totals:** 153,765 triangles still holds. After `8e45ed8`, only the back's construction changed in `src/`, with the same number of faces.

**Review records 9–13:**
- Each has the six sections.
- Each embedded report matches its raw file word for word. Claude's headings are two levels lower, and Codex's reports have none.
- Every raw finding has a row, and IDs run F0–F30 without gaps.
- Each target matches its run's `head-before.txt`.
- Reviewer versions, models, sandbox, tool limits and `modelUsage` match the run logs.
- The Codex logs hold no DLL-failure markers.
- Test counts are 60, 64 and 65 at `7dba7ab`, `8e45ed8` and `5c9f24b`, as the records say.

**Work-docs rules:**
- All 17 frozen documents hash to their registry digests.
- The unit root holds only the 8 frozen notes, `plan.md` and `design.md`.
- Reviews run 9 to 13 with stage `integration`.
- The registry and `.gitattributes` are unchanged from main.

**Data and links:**
- The geojson is 249,297 bytes with SHA-256 `d9c056c5…`, and the sculpture file is 610 bytes with `751a0f69…`.
- Provenance counts balance.
- Every changed link resolves to an existing file and GitHub heading. Only `reviews/14_integration.md` dangles, as expected.

**Not verified because the runs were blocked:** the typecheck, the 65 tests, build and audit on the final revision, the work-docs `check`, the regeneration, the mutation counts and the native results. These rest on the records and commit messages.

## Findings and disposition

Rounds 9 to 14 number their findings in a series of their own, F0 to F40, apart from the frozen reviews' IDs (F40). After this round, a docs-only follow-up commit fixed F31 and F34 to F38 (Round outcome).

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F31 | `design.md:121` says that against `554f290a…` only `modeledFacing` changed, and for one node `orientationSource`. In fact 23 facings changed, and the `orientationSource` of six ways: `way/481335243`, `way/694955888`, `way/694955892`, `way/694955895`, `way/694955898` and `way/1509660899`. The source of `node/5759657845` changed in `5c9f24b` and changed back in `a2486a8`. Review 9's Verification says the first repair made "no other change", and review 11's says "only facings changed": both missed source changes. Codex: should-fix. Claude: should-fix, and minor for review 11. | Accepted. A feature-by-feature comparison confirms it (Verification). Every coordinate, tag, version and the feature order are unchanged, as design.md says. | Not repaired: R11's five repairs for this merge are spent. This row is the correction. design.md's sentence awaits a docs-only fix: "23 `modeledFacing` values changed, and `orientationSource` for six ways". |
| F32 | `plan.md:73`, `design.md:134` and the devlog credit the integrated revision with a 17/17 native check, but no record tied a run to it. The last recorded run was on `a2486a8`, and `649d7c2` changed `src/campus-environment.ts:91`. Claude: should-fix. | Accepted as a gap in the record. The check ran on `15e5423`'s tree before that commit and passed 17/17, as its commit message says. | This record's Verification. |
| F33 | A closed ring's back does not always take its outside, as `design.md:104`, the provenance and the comment at `src/campus-environment.ts:87` claim. The side comes from a length-weighted turn sum that leaves out the closing corner (`src/campus-environment.ts:89`, `:92`). It follows the ring's winding for convex rings, but not always otherwise: Codex's five-vertex ring and Claude's U shape, both counter-clockwise, get an inside back. Codex: minor. Claude: minor. | Accepted as a limit. No published ring has a back: the four mapped rings have no material, and the seat walls have no backrest. | Not repaired (R11). The ring's signed area would fix it. |
| F34 | Some documents miss limits that F26 put in the provenance, or state them wrongly. A node whose only touching segment has zero length faces and names its reference path, which the provenance (`:41`) and `design.md:113` leave out. `public/data/README.md:34` says "nearest" without saying from where, and gives no bend or junction limit. `design.md:149` counts a spur end among the cases that can face along the wrong segment, but a node there faces across its only segment, as the generator's comment says. Codex: minor, the zero-length case. Claude: minor. | Accepted. The code is right; the documents are incomplete. | Not repaired (R11). |
| F35 | `design.md:105` says a seat whose backrest tag is absent gets no back. The five photographed Bing benches have no backrest tag and get backs from the photo-supported family (`src/campus-environment.ts:121`), which the bench note allows. Codex: minor. | Accepted. The amendment needs that exception. | Not repaired (R11). |
| F36 | `design.md:114` says seven flat markers have a margin of "a fraction of a degree". Their margins run from 0.28° to 3.56°, and only three are under 1°. Claude: minor. | Accepted. | Not repaired (R11). |
| F37 | Three statements in the review records are wrong. `reviews/12_integration.md:121` says `649d7c2` closed the gap between the generator's and the renderer's closed-ring thresholds, but only the side test took 1e-9. The renderer's `closed` flag at `src/campus-environment.ts:69` still uses 1 cm, where the generator uses 1e-9 m, though no published way falls between them. `reviews/12_integration.md:122` credits `c5483cd` with recording the bend, junction and spur limits, which came in `649d7c2` with F26. `reviews/9_integration.md:144` counts four missing spaces, and design.md restores five. Codex: minor, the thresholds. Claude: minor. | Accepted. | Not repaired (R11). This row is the correction. |
| F38 | The devlog line overreaches. "It now always crosses one or the other" restores the unbounded claim that F26 removed: at a bend or junction a node can run along the other segment. "Uncommitted work in 44 leftover worktrees was committed" is one too many: `shibuya-unreal-5.8/worktree` was clean, so 43 parking commits were made, besides `584733e` for the main checkout. Codex: minor. Claude: minor, counting 40 removals. | Accepted in part. 41 removals is right: 44 worktrees less the three commercial-corner worktrees kept. Claude's 40 left out the clean worktree, which needed no parking commit. | Not repaired (R11). |
| F39 | Statements written before the actions: `plan.md` says the increment merged to `main` while `main` was at `e33e75f`, and `reviews/9_integration.md:9` and `:16` say the integration worktree was removed while it hosted this review. Codex: minor. Claude: minor. | Accepted as timing. They describe the state this push lands in: the push and the removal follow this record's commit. | None. |
| F40 | Finding IDs F0 to F2 now occur twice in unit 0. The frozen reviews 005, 006 and 007 use them, and round 9 started again at F0, while fleet's work-docs rule assigns IDs once per unit (`fleet/docs/work-docs.md:128`). Claude: minor, low priority. | Accepted. The frozen reviews cannot change. | Not repaired. An ID in rounds 9 to 14 never refers to a finding of the frozen reviews. |

## Verification

On `59467b6`, before its commit: typecheck and 65/65 unit tests on Node 24.18.1.

On `15e5423`, Node 24.18.1: typecheck, 65/65 unit tests, build with only the MapLibre chunk-size warning, and audit with 0 vulnerabilities. Fleet main's work-docs check, at fleet `3d5db7c`, passes with one unit. It checks the 17 frozen documents against their digests. Before the check, every tracked `docs/work` file in the worktree was rewritten from its committed bytes. The worktree predates `docs/work/.gitattributes`, and Git's `core.autocrlf` had left CRLF line endings in its checkout of those files. No content changed.

The native check ran on this tree's production build inside met's gate lock and passed 17/17. It ran in system Chrome at 1920×1080 and 390×844, with ANGLE on an RTX 4090 and Direct3D 11. Held W with a right drag gave a p95 frame interval of 6.7 ms over 285 frames, with a maximum of 8 ms. The mesh held 153,765 triangles and 23,987,340 bytes in two draws. 22 of its 27 captures are byte-identical to the previous run's, on `a2486a8`. The 5 that differ were inspected at native size: the low Burghers view, the Angel's flight and turned views, and the two views after motion and restoration. The run logged no page error. Its one console warning is MapLibre's notice that a custom layer is not restored automatically.

F31 was checked feature by feature on `public/data/stanford-environment.geojson`:

- `7dba7ab` to `8e45ed8`: 10 facings and the sources of 5 ways.
- `8e45ed8` to `5c9f24b`: 2 facings and 2 sources.
- `5c9f24b` to `a2486a8`: 22 facings and the source of `node/5759657845`.
- `7dba7ab` to `15e5423`: 23 facings and the sources of 6 ways.

No geometry, other property or feature order changed. F35's exception, F37's thresholds and F38's counts were checked against the code and the triage records. For F33, Claude's U-shaped ring was recomputed here: its turn sum is −6 against a signed area of +28.

After this record was added, fleet main's work-docs check passed again.

## Round outcome

No blocking finding, so by the agreed plan the merge proceeds: this record's commit, on `15e5423`, is pushed to `main`, and the integration worktree is removed after the push. Of the two should-fix findings, this record answers F32. F31 is accepted and left unrepaired, because R11's five repairs for this merge are spent: `8e45ed8`, `5c9f24b`, `a2486a8`, `c5483cd` and `649d7c2`. Eight minor findings, F33 to F40, are accepted, F38 in part. None is repaired here: F39 needs no repair once the push lands, and the others wait for the same reason. None changes what renders or what the data holds. The integrated revision is therefore not fully verified while F31 stays open. Its docs-only fix and the minor corrections await the coordinator's decision.

Follow-up, 2026-10-30: the coordinator ruled that record corrections like these are follow-up work, not a sixth repair. The commit that adds this paragraph changes docs only, with no code or data, and fixes:

- F31: the data sentence in [design.md](../design.md).
- F34: the zero-length case and the spur end in design.md. In `public/data/README.md`, where "nearest" is measured from, the zero-length case, and the bend and junction limit.
- F35 and F36: design.md.
- F37: reviews 9 and 12, each correction marked in its row.
- F38: the devlog line.

The provenance's `dimensions` text still leaves out F34's zero-length case and still makes F33's ring claim. `tools/data/build-campus-environment.mjs` writes that text, so changing it is a code and data change. Reviews 9 and 11 keep their data counts, which F31 corrects. F33 and F40 stay open as recorded. F39 needs nothing now that the push has landed.
