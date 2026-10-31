# Review 13: integration

## Target

Repository `maps`, branch `claude/mapsort-benches-sculptures`, revision `c5483cdefdb10a5c6e1fc12d5a8fe937df40bbc0`, which answered round 12's minor findings. Both reviewers received `git diff a2486a8 c5483cd`. The data file was unchanged.

## Reviewers and coverage

Same setup as round 9, with raw runs in `artifacts/mapsort/review-runs/r5/`.

- Codex CLI 0.163.0, `gpt-6-astra` at `xhigh`, read-only sandbox. It ran 468 rotated, scaled and translated tie probes and the 13 focused tests. It recalculated all 188 published facing and source pairs against the four extract hashes, and read `src/building-details.ts:54` and `:340` outside the diff. There were no DLL failure markers.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, with round 9's limits, which `system/init` confirmed. `modelUsage` held only the pin. Node was refused, so it worked by hand and with git. It did not delegate.

## Reports

Each report is kept as the reviewer wrote it, with its headings demoted under this section.

### Codex (`gpt-6-astra`)

No blocking or should-fix findings in `c5483cdefdb10a5c6e1fc12d5a8fe937df40bbc0`. Two minor documentation gaps remain:

1. **Minor — F21’s weak-estimate caveat never reaches the provenance.** [Provenance line 41](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/public/data/stanford-environment-provenance.json:41) describes exact ties but omits nearly aligned references. The caveat exists only in [the generator comment](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/tools/data/build-campus-environment.mjs:45). Readers cannot distinguish those especially weak side estimates. Add the caveat to the generated provenance text.

2. **Minor — F22/F23’s documented node rule still omits its exceptions.** [Provenance line 41](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/public/data/stanford-environment-provenance.json:41) says a node on a footway faces across it and names it as `orientationSource`. The repaired zero-length case instead faces and names the reference. Also, [the register](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/docs/learning/defect-register.md:7) still claims such nodes cannot face along their footway without recording the deferred bend/junction/spur limits. At a perpendicular junction, reversing contact order produces 0° versus 90°, each along another contacting segment. Document these bounds. Deferral is reasonable: the pinned published nodes do not reach them.

What I checked and found sound:

- **F21:** Reproduced the parent’s 102.26°/−77.74° discrepancy. The repair consistently chooses left; 468 rotated, scaled and translated tie probes passed, as did nearby non-tie checks.
- **F22:** Reproduced the parent’s zero-length 0° result; the repair returns 90° toward the reference. Mixed zero-length/nonzero contacts also behave correctly.
- **F23/F24:** Ordinary `orientationSource` cases, closed-ring description and next-path register correction match implementation. Generated and published provenance text agree.
- **F25:** The narrowed top-face claim matches the test. Independently confirmed the remaining inward seat walls/end cap. Outside the diff, [two-sided lighting](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/src/building-details.ts:54) and [disabled culling](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/src/building-details.ts:340) support deferring that existing issue.

All **13 focused tests passed** on Node 24.18.1. Verified all four extract hashes and recalculated all **188 published facing/source pairs**: none changed from the parent. No functional regression found.

Full build, full suite, audit and browser checks were not run. No files changed or browser/server processes launched.

### Claude (`claude-opus-5-5[1m]`)

I found nothing blocking or should-fix, and six minor findings. The main one: a repair the brief describes isn't in the data docs. The provenance has no "weak estimate" sentence.

I couldn't run any code. `node --test` and even `node -e` were refused in this session. So this review comes from reading the code, working the numbers by hand, and searching the revisions with `git grep` and `git diff`.

#### Findings

**1. Minor: the provenance never calls a nearly aligned side a weak estimate.** See `public/data/stanford-environment-provenance.json:41`, written by `tools/data/build-campus-environment.mjs:130`.
- The brief says the provenance now says this. Only the code comment at `tools/data/build-campus-environment.mjs:44-45` does.
- `git grep -i weak` finds nothing in `public/`, the data README or the register. The commit message doesn't claim it, so only the brief is wrong. But the brief offers that wording as the answer to not adopting the 0.25 band.
- The commit says the provenance "states the whole rule". Two gaps remain:
  - It says "nearest" without saying from where. The code measures from the node, or from the middle of a way's length (`:39`). The test at `:210-211` exists because those two give different answers.
  - The diff changed "a bench node lying on a path" to "lying on a footway". In OSM, footway means only `highway=footway`. The generator also counts pedestrian, path and cycleway (`:87`), and the same text calls the reference a "pedestrian path".
- Fix: add one sentence to `dimensions`, use one word for the path set, and regenerate.

**2. Minor: the 1e-9 tie bound is about the same size as the generator's own input noise, and its comment says the opposite of the code.** See `tools/data/build-campus-environment.mjs:64-65`; `:11` is outside the diff.
- The bound easily clears the fixture's noise. Its dot product is −1.4e-14, against a bound of 1e-9 × 23.24² ≈ 5.4e-7.
- Real inputs are noisier:
  - A 7-decimal longitude near −122.17 is stored with an error of up to 7.1e-15°.
  - `local` (`:11`) multiplies that by 88,400. So each node can be off by up to 6.3e-10 m east–west and 4e-10 m north–south.
  - Take a two-node bench about 1 m long, with its reference about 1 m from its middle. The resulting cosine error is around 1e-9, the size of the bound itself.
- So a tie that is exact in the mapped coordinates can still be decided by rounding, unless it runs along a line of latitude or longitude. Those are exact in binary.
- No published feature is near a tie. The smallest margin is `way/694955891` at 0.28°, a cosine of 4.9e-3.
- Fix: a bound of 1e-6 clears the noise by about 1,000 times, still decides every published feature, and leaves the data unchanged. A fixture written in degrees and projected the way `local` does would show the difference. The metre fixture at test `:217` can't.
- Wording: `:64` says "a dot product within 1e-9 of the lengths' product is a tie". Read literally, that is the case where the two vectors are parallel. The code actually tests for a cosine within 1e-9 of zero. The commit message and brief repeat the phrase.

**3. Minor: the fixtures can't tell the documented rule from an obvious alternative.** See `test/campus-environment.test.mjs:204`, `:217` and `:220`.
- Tie:
  - Round 12 noted that the other path in `:204`, `way/3`, lies on the left. So "take the left" and "take the next path's side" both give 0.
  - That is still true, and `:213` and `:217` have only one path each.
  - This was neither fixed nor listed as not addressed. Moving `way/3` to y = −4 keeps 0 under the documented rule but gives 180 under the alternative.
- Zero-length:
  - `way/13` consists only of the zero-length segment. So a filter that drops a whole path for containing one would also pass.
  - The code filters per segment (`tools/data/build-campus-environment.mjs:61`). A footway with a duplicated node therefore faces across the neighbouring real segment. That is better than the brief's "faces its reference path", but untested.
  - Adding a real segment to `way/13` would cover it.

**4. Minor: the deferred node limits are fairly scoped, but the test title and register still say they can't happen.** See `test/campus-environment.test.mjs:199` and `docs/learning/defect-register.md:7`.
- At a right-angle bend, both segments are 0 m from the node and the first one listed wins (`tools/data/build-campus-environment.mjs:62`). The node then faces along the footway's other segment.
- The test title says "never runs along a footway the bench lies on", and the register says "neither can face along itself". AGENTS.md R19 asks that a check's title state its limits, so record the limit there.
- The scope is fair. From `5c9f24b` to `a2486a8`, only one `orientationSource` in the data changed: `way/601164991` to `way/663770758`, on `node/5759657845`. So that is the only node lying on a footway, and it is drawn as a flat marker.
- The register also leaves out round 12's two forms of the defect:
  - rounding choosing the side;
  - a zero-length segment giving 0°, the same atan2(0,0) symptom the register records for `way/1509660899`.
- Its list of fixtures also leaves out the zero-length one.

**5. Minor: for closed rings, the back is not opposite the facing, and the renderer still lets rounding pick the side (the F21 defect).** See `public/data/stanford-environment-provenance.json:42` and `src/campus-environment.ts:88-91`, outside the diff.
- A ring's segment normals add up to zero, so the cosine is 0. The back then goes on the side `turn` picks, which is the ring's outside, whatever the facing.
- A ring's reference path usually lies outside the ring, so its facing points outward too. The back would then sit in front of the person sitting there. The provenance says it runs opposite the facing.
- `:90` tests `leftLength` for exactly zero. If the sum comes out as tiny rounding noise instead, that noise's direction picks the side. The generator uses a 1e-9 threshold for the same test (`tools/data/build-campus-environment.mjs:58`).
- Nothing published reaches this. The four mapped rings have no material and are drawn flat, and the eight seat walls have no backrest tag.
- Fix: say "an open way's" in the text, and give the renderer the generator's closed-ring test.

**6. Minor: F23 still drops the path that chose `node/5759657845`'s side.** See `tools/data/build-campus-environment.mjs:62`.
- The docs now say what `orientationSource` names, and that matches the code.
- But the path that chose this node's side, `way/601164991`, is no longer recorded anywhere. It was the node's `orientationSource` in `5c9f24b`.
- Round 12 pointed this out, and the brief doesn't list it as not addressed. Nothing looks different because the node is a flat marker, so listing it as a limit is enough.

#### Checked and found sound

- **F21 code:** it flips the side only when the cosine is below −1e-9, so moving or scaling the geometry doesn't change the result. A missing reference (`'unknown'`) still skips the flip.
- **F21 fixture:** the reference runs from 1.5 to 2.25 times along the bench direction (4.936, 22.712).
  - The left side gives −77.74°, and the flip gives 102.26°.
  - Round 12 measured the dot product at −1.42e-14, so the parent code's strict `< 0` flips. The fixture goes red with the defect put back.
- **F22:**
  - Comparing coordinates exactly is right for OSM input. Identical coordinates always project identically, and different 7-decimal coordinates are at least 8.8 mm apart.
  - The set of touching paths is built before the filter, so the zero-length footway still can't be chosen as the reference.
  - Under the parent code the fixture gives `{0, 'way/13'}`, so it goes red.
- **Existing fixtures, worked by hand under the new code:**
  - `:202` gives 180 from `way/1`, and `:204` gives 0 from `way/1`.
  - `:206`, `:208`, `:209` and `:211` give 180.
  - `:213` gives 0.
- **F23:** the generator comment, provenance and README all match the code. The source is set to the footway only on the node-on-footway branch.
- **F24:**
  - The provenance strings match `tools/data/build-campus-environment.mjs:130-131` exactly.
  - "A bent way's back takes its outer side, a straight way's its right" matches `src/campus-environment.ts:91`.
  - The register's round labels match the round 10 and 11 reports.
- **F25:**
  - The seat's long walls (`src/campus-environment.ts:95`) and its first end cap (`:108`) are wound inward, as stated.
  - That can't show on screen. The normal is used only inside `abs(dot(...))` (`src/building-details.ts:54`), culling is off (`:340`), and normals come only from winding (`src/building-geometry.ts:91`).
  - The register now claims only what the test at `:193-196` checks.
- **The "seven flat markers" count:**
  - I compared facings at `5c9f24b`, when each feature faced its reference path, with facings now. Exactly seven have a reference path inside the 0.25 band. Their margins are 0.28°, 0.68°, 0.83°, 1.07°, 1.18°, 2.52° and 3.56°.
  - The next two closest are 23.46° and 23.79°.
  - None of the seven has a material tag, so all are drawn flat (`src/campus-environment.ts:71`). That includes the two tagged `backrest=yes`.
- **Published output:** it is unchanged. The data file isn't in the diff, the provenance hash is the same, and no feature has `way/unknown` or a `direction` tag.

#### Not verified

- I couldn't run the tests, typecheck, build or generator. The 65/65 pass count, the claim that all 21 checks go red and the byte-for-byte regeneration all rest on the commit message. Of those checks, I confirmed by hand only that the two new fixtures go red.
- Whether `node/5759657845` sits at a bend, junction or spur end of `way/663770758`. Checking that needs the OSM extracts.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F26 | The provenance lacked the weak-estimate caveat, did not say where "nearest" is measured from, and mixed "footway" with "pedestrian path". The node rule's exceptions were undocumented, and the test title and register claimed a node can never face along its footway. Codex: minor, items 1 and 2. Claude: minor, items 1 and 4. | Accepted. | `649d7c2`: the provenance states the full rule, its weak estimates and the node limits. The test title and register state the limit, and the register adds round 12's forms and the zero-length fixture. |
| F27 | The 1e-9 tie bound sat at the input's own noise. 7-decimal coordinates projected by `local` carry about 1e-9 of cosine noise on a 1 m bench, and the comment described the bound wrongly. Claude: minor. | Accepted. | `649d7c2`: a cosine within 1e-6 of zero is a tie. On 96,666 random collinear benches of 1 to 2 m, the noise reached −9.5e-10. A fixture in projected 7-decimal coordinates on a 0.59 m bench reads −1.66e-9 and goes red at 1e-9. |
| F28 | The fixtures could not tell the documented rule from alternatives: in one, the other path lay on the left, and the zero-length path had no real segment. Claude: minor. | Accepted. | `649d7c2` moves that path south and adds a duplicated node beside a real segment. |
| F29 | A closed ring's back does not lie opposite its facing, and the renderer read a ring whose normals sum to rounding noise as a line. Claude: minor. | Accepted. | `649d7c2`: the provenance says a ring's back takes its outside. The renderer treats a normal sum under 1e-9 as closed, and a fixture ring with 8.9e-16 m of noise goes red without it. |
| F30 | For `node/5759657845`, the path that chose its side, `way/601164991`, is no longer recorded. Claude: minor. | Accepted as a limit. Nothing renders differently, since the node is a flat marker. | Documented in the generator comment, the provenance and design.md. |

## Verification

On `649d7c2`: typecheck, 65/65 unit tests, build and audit with 0 vulnerabilities. All 23 checks went red with their defect put back, including a tie bound shrunk back to 1e-9 and a ring with noise read as open. Regeneration reproduces `d9c056c5…` byte for byte. Nothing rendered changed: no published ring has a back.

## Round outcome

No blocking or should-fix finding. `649d7c2` answers F26 to F29, and F30 is recorded as a limit. That was the fifth and last repair R11 allows this merge. Review 14 reviews the integrated revision, `649d7c2` merged with `main` and its docs.
