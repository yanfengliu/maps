# Review140 — offline rail candidate and bounded support decision

**Status: partial implementation, not admitted to the running scene.** Source-aligned rails, sleepers, ballast and the provisional support union are generated and pass their stored Float32 topology checks. The Y14 building cuts still have new open seams, and the long-span structure/foundations require the coordinator's choice from `SUPPORT-DECISION.md`. No appearance or whole-candidate acceptance is claimed. This lane is frozen for that choice; the independently owned Y14 cut investigation may continue from its immutable inputs.

Worktree: `C:/Users/38909/.codex/worktrees/shibuya-quality/maps`, detached base `0ec3dd03831b605235302212b7d140cb35297071`. Changes are uncommitted and unmerged. Primary source/data, simulation, network, runtime scene, renderer and shared capture binder remain untouched by this worker. No browser, GPU, server, install, full repository gate or Git write ran in this lane.

## Implemented and checked

`tools/scene/build-rail-candidate.ts` is an explicit offline writer confined to fresh ignored `run-N` folders. It reads the four fixed historical centreline chains, preserves source X/Z and joins, clips at the canonical AOI, and uses Review128's authored common profile. It inventories ten final leaves/80,534 faces and refuses source objects outside the ten approved IDs. OSM-derived inputs, source identities, atlas hashes and authored recipe remain identifiable external disk files. New runs preserve their exact generator files before writing derived outputs.

`tools/scene/rail-plan.ts` implements Review142's restricted authored-plan route: source-node ribbons first, physical union before horizontal/terrain subdivision, positive exact Float32 orientation and interior-overlap checks, and a bounded unchanged-boundary retessellation. It never moves coordinates or applies the support repair to source building faces. The original five folded cells and failed run04/run05 edges remain preserved. The previous kernel/producer bytes used by Review142 are retained in `review142-frozen/`; their hashes and relocation are recorded there.

The source-node correction also fixes the rail loft. Intermediate sections interpolate the original mitered segment instead of changing the offset normal near a source node. Actual I-section rails retain the authored 1.067 m inner-head gauge, and 6,585 sleepers use one 0.65 m arc-length cadence across source-way joins. The 3.0 m ballast top is generated with an explicit 0.12 m vertical edge above the complete 3.4 m structural shoulder. The new vertical edge is an authored candidate choice, not a surveyed ballast slope.

The optional offline decoder result carries original indices, normals and UV0. Default results remain unchanged. A narrow exact-byte copy fixes Node Buffer views: the original copy failed both real primitives while ordinary Uint8Array input passed. `decoder-proof.json` retains the old failing mutant and matching subject. The opt-in decoder exactly reproduces all 148 data503 triangles in frozen Review130's independent source record for placed positions, normals, UV, source/batch identity and material. New source-cut returns now have geometric normals instead of zero placeholders.

Six focused unit controls pass, covering real source decoding/material/UV/placement, the exact opposite-panel exception with equal-winding and separated negatives, the actual Review142 inverted star, and absent/duplicate/reversed/interior-overlapping plan refusals. Focused TypeScript checking covers the rail source files, the test and imported dependencies; this is distinct from the required future full repository gates.

## Actual stored output

These are `run-09` bytes, decoded again after writing. Each listed mesh has zero degenerate, boundary, nonmanifold and wrong-winding counters. Positive topology is a bounded geometric result, not visible-quality or structural-capacity evidence.

| Asset | Stored triangles | SHA-256 |
|---|---:|---|
| rails.mesh | 198,560 | `59d34f06112d3aec178ad72bba9adae9b0b1cda1f6ddca1be0a3928897fc0457` |
| sleepers.mesh | 79,024 | `e46709c92db03185cfdb4d68f33d72e7a5b71819960187a5b18f25b4eb253d48` |
| supports.mesh | 119,492 | `303caf7a6fccf306e6aedfba8f3ba7471fc78d53568399925825abdccc8608e7` |
| ballast.mesh | 74,984 | `f98a321c488560162030f572a7a46528aac2e6af271ccffd65c0ab27bd18da1d` |

The support mesh still uses the provisional global 8 m span margins, including a 99.256 m interval. Its 0.4 m deck is **not** accepted as a plausible support solution. `SUPPORT-DECISION.md` replaces the broad assumption with actual floor/body polygons, source/cap obstructions and two dimensioned narrow structural alternatives. No chosen truss, girder or pier mesh has been generated yet.

## Material remaining blockers

1. **Y14 source cuts.** Current boundary counts by building suffix are 20234796:0, 5db01781:3, d7fb4726:199, 1e7ccbe9:6, 5e342582:3, 140d14bc:263, c8c721d8:3, bc689157:19, feb33dea:0, and 780bc11d:14. The d7fb source already had six inherited boundary keys; that does not excuse new ones. The 1e7 source had five inherited nonmanifold edges; the candidate has six plus eleven wrong-winding edges. Fresh cut owner `rail_topology_fresh` is independently prototyping a shared-event construction. `y14-cut-frozen-inputs.json` proves all fifteen relevant run09 source/recipe/cut files are byte-identical to run07 and pins the immutable matching generator/kernel dependencies supplied to that owner. Full outside-cut position/UV/material preservation and closed new returns remain required.
2. **Structural choice and foundations.** No broad cross-corridor beam is allowed. The actual source tracks are widely separated. Candidate foundations must avoid every protected floor and source shell; columns on Y14 returns need proved full closed-cap/retained-solid continuity. The finite alternatives fit a 3.2 m total side-band width and Y20.25..23.85, leaving nominal margins inside the approved 4 m/Y14..24.9 cut. Three centre-arc gaps are about 48.79–49.48 m; the eastern gap remains 85.77 m. Both alternatives have zero measured retained-source/floor surface intersections in their complete side-band volumes. That is not an engineering or foundation proof. Root must choose a reviewed trial or retain this specific unresolved span condition.
3. **Complete generated-geometry and runtime acceptance.** After those two dependencies, generate and check the final supports/bearings/returns and all source/floor/body interactions. Then independently review the exact candidate. Runtime loading/material wiring and a new exact scene-file capture binding are not implemented. Keep OSM-derived bytes outside the bundle and preserve the old binder; the new binder must explicitly add every new admitted scene file. Only then may root authorize the reserved real-control native views and moving observations. H0/H1 were not used for tuning, and diagnostic rays do not replace native evidence.

## Rejected counterevidence and scope correction

The initial writer silently widened the lower cut bound from reviewed Y14 to Y8. This was wrong and is corrected in the current producer. `cut-lower-bound-audit.json` proves the wider cut additionally removed 88 source faces/1,723.369517 m² on four objects, with visible above-terrain portions. All Y8 outputs remain rejected. Any Y14 support/source conflict must be named locally; it cannot justify lowering the cut again. The immutable recipe records the approved Y14 limit.

Run06 rail edges were also red and remain retained; source-miter correction, not a wider welding tolerance, resolves them in run07–09. The initial stored support was incidence-green but inverted one face; the exact unchanged-boundary retessellation and overlap controls now cover that failure. The apparent intermediate eastern foundation opportunities were not promoted after failing complete cap coverage. The preliminary signed-floor result mixed upper decks with floors below; its raw result is retained and the final diagnostic separately checks above/below/intersecting geometry. A missing diagnostic import and one shell-quoting preparation failure were corrected without changing a geometry criterion.

## Handoff and reproduction

The generated results above are reproducible with `node tools/scene/build-rail-candidate.ts --evidence C:/Users/38909/Documents/github/maps/artifacts --output artifacts/rail-aoi-prototype-20260927/run-N` from this worktree, using a new empty run. This currently exports known-red building diagnostics; exit0 is not candidate admission. The focused unit command is `node node_modules/vitest/vitest.mjs run test/rail-geometry.test.ts --maxWorkers=1`. The support decision's scripts and exact input hashes are retained beside this report. `freeze.json` seals the source, reports and essential receipts; run09's own input pins and snapshots bind its generator/data.

No task-owned process remains. Retained outputs are required for unresolved geometry, independent cut repair and coordinator design choice; none is presented as disposable cleanup. Do not commit generated task evidence. Root owns canonical documentation promotion, full gates, native review and integration.
