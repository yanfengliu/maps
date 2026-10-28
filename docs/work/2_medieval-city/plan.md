# Medieval city walk-around proof of concept

Status: active
Owner: Root orchestrator (Claude Opus 5 session, 2026-10-27)
Created: 2026-10-27
Updated: 2026-10-27

## Problem and outcome

The owner asked for a small medieval city built with Unreal Engine and Blender, walkable in both first and third person, as a proof of concept on a new branch.

The outcome is an Unreal Engine 5.8 project on `codex/medieval-city-20261027` that opens into a walled medieval town of roughly 120 m by 120 m, authored from procedural Blender meshes, where a player walks the streets in first or third person and switches between the two with one key.

## Scope

Included: procedural Blender assets, a deterministic town layout, Unreal import and level assembly, a C++ character with both camera modes, daylight and fog, collision, a scripted verification run with screenshots, and the documented command sequence that reproduces all of it.

Excluded: a large or historically accurate city, interiors, NPCs, AI, combat, quests, sound design, a packaged build, photorealism, downloaded or purchased assets, and publishing. The branch is not merged into `main`; `main` keeps the Bay Area map product.

Dependencies: Unreal Engine 5.8 and Blender 5.2.0 LTS, both already installed on this machine, and CPython 3.13 from the system. No third-party Python package, no new npm dependency.

Ownership: the root orchestrator owns this plan, the contracts in [design.md](design.md), integration and acceptance. Workers own bounded deliverables named under implementation steps and do not run Git commands; the orchestrator commits.

## Approach

Blender authors every mesh procedurally from a script, so the assets are reproducible text rather than committed binaries, and exports one glTF binary per asset plus an inventory of bounds, triangle counts and material names.

A seeded Python script places those assets into a town layout as JSON, which keeps the city's shape reviewable as text and independent of the engine.

Unreal editor Python imports the glTF assets into generated static meshes and materials, then builds and saves the level from the layout. Every generated package stays outside Git, as the earlier Unreal work in this repository already did, because fleet rule R23 keeps binaries over 512 KiB out of ordinary Git.

The player is a C++ character with a first-person camera and a spring-arm third-person camera, an avatar assembled from engine primitive shapes with a procedural walk cycle, and Enhanced Input actions built in code. Nothing in the project needs an authored Blueprint or input asset, so the whole tracked project is text.

Verification injects real key events into the player controller, so the input bindings themselves are exercised rather than bypassed, and captures screenshots from the running game for inspection at native resolution.

## Acceptance criteria

- `python tools/blender/build_assets.py` writes the full asset inventory in [design.md](design.md), and `tools/medieval/test_assets.py` passes: every asset present, bounds within the declared metre envelope, triangle budget respected, declared materials present, and two consecutive runs byte-identical.
- `python tools/medieval/build_layout.py` writes a layout that `tools/medieval/test_layout.py` accepts: no two footprints overlapping, every placement inside the wall ring, the player start on open ground, and a walkable path from the player start through the gate.
- `python tools/medieval/build_native.py --target both` compiles the Editor and Game targets of `MedievalCity.uproject` with no error.
- The Unreal import step asserts each imported static mesh's bounds equal the Blender inventory bounds times 100, and the level build saves a map containing every layout placement, a player start, a directional light, a sky and height fog.
- `python tools/medieval/run_probe.py --mode city` runs the real game, injects W, A, S, D, mouse look, sprint, jump and the view-toggle key through the player controller, and records: the character moved more than 3 m under held movement input, each movement key moved it along its own direction and not sideways, the rendered view changed between the two camera modes, sprinting covered meaningfully more ground than walking, the character stayed on the ground, walking into a wall stopped it within 1 m after a real approach, and it walked through the gate arch. Without `--mode city` the probe runs `smoke`, a bare test floor that shows none of the town.
- The probe writes non-blank 1280x720 screenshots of both camera modes plus town vantage captures, and the orchestrator inspects each at native resolution and binds acceptance to the inspected bytes' digests.
- `npm run build`, `npm run typecheck`, `npm test` and `npm run audit` still pass, proving the branch left the Bay Area map product untouched.
- An independent read-only review of the integrated revision reports no unresolved material finding.

## Implementation steps

- Contracts and branch setup — orchestrator, done: worktree, branch, ignore rules, this plan and [design.md](design.md).
- Blender asset generator and asset check — W1, done: 18 assets, 36334 triangles, gate proved red on 14 defect classes.
- Town layout generator and layout check — W3, done: 193 placements, 26 buildings, 16 checks proved red on 27 corruptions.
- Unreal project, C++ character, both camera modes, Enhanced Input, probe and native build — W2, done, with a correctness fix in progress.
- Unreal import and level assembly through editor Python — W4, done: 18 meshes, 12 materials, 193 actors, level gate passing.
- Probe mapping fix, sprint coverage and exposure calibration — W2, in progress; it holds the only GPU gate, so it runs alone.
- Integration, repository gates, independent review, devlog and commit — orchestrator.

Decisions and findings worth keeping, recorded as they were settled:

- The flat-ground box is x within plus or minus 60 and y within plus or minus 64 metres. W3 found the first numbers too small for the real inventory, W1 implemented the widening, and both now check it.
- The glTF frame mapping in this document was wrong until W4 measured it. Authored (x, y, z) arrives as Unreal (100x, -100y, 100z) with no axis swap, and camera headings need a further 90 degrees. The measured mapping replaced the guess, and the probe is being corrected to match.
- Interchange enables Nanite by default, which makes LOD0 a decimated fallback and would have given a walking character half-resolution collision geometry. The importer turns Nanite off; triangle counts then match the inventory exactly.
- Unreal 5.8 cannot build any Editor target without a .NET Framework SDK. The owner chose to install it; that install needs elevation this session could not obtain, so a non-persistent AutoSDK presence marker stands in and reports itself. See [local rules](../../policies/local-rules.md).
- W4's introspection probe saved eight actors into the engine's own default map. The owner authorised a targeted repair, which the orchestrator ran after taking a backup: the eight were destroyed, the engine's original PlayerStart survived, and the map was verified clean.

## Outcome

The town is built and walkable. `codex/medieval-city-20261027` carries an Unreal Engine 5.8 project that opens onto a market plaza inside a walled medieval town of about 120 m across, where a player walks the streets in first or third person and switches with V. Everything tracked is text: 39 files, the largest 60 KB, no binary package, no Blueprint, no input asset. The town is reproduced from nothing by the five README commands.

Verified by the orchestrator on the integrated revision, not from worker reports: the thirteen-step acceptance script ran green end to end, covering the five README commands, the four medieval gates and the four repository gates.

- Assets: 18 glTF binaries, 36334 triangles, byte-identical across runs. The gate measures the exported container and has been observed red on 17 defect classes.
- Layout: 193 placements, 26 buildings, 16 of 16 checks, observed red on 27 corruptions.
- Level: 193 actors placed and verified, worst location error 0.00000 cm, worst yaw error 0.00001 degrees, 25 of 25 house fronts facing their street, mesh bounds within 0.00008 cm of the inventory times 100, no undeclared actor of any class.
- Build: a rebuild for the record compiled 10 and linked 2 for the Editor target, 9 and 1 for the Game target, in a file ordinary runs cannot overwrite.
- Probe, driving real injected key events: third person walk 871.0 cm, first person 871.6 cm, each movement key moving along its own direction with about 1e-5 cm sideways, rendered view 352.5 cm apart between camera modes over 26 compared samples, sprint 1.856 times walking at exactly 300 and 600 cm/s, 325.8 cm approach then 2.53 cm of push against a wall, ground held throughout, and a walk through the gate arch ending 771.3 cm past the gate line.
- Repository: `npm run build`, `npm run typecheck`, `npm test` (51 of 51) and `npm run audit` (0 vulnerabilities) all pass; the tracked diff touches no map product code.

Reviewed independently in two rounds, both recorded in [reviews](reviews/). Round 0 found 15 findings, 5 material, including that neither documented route actually opened the town and that the camera-mode check would have passed with the camera switch deleted. Round 1 confirmed 14 repairs and found 2 further material defects, one of them introduced inside a repair. All 17 were accepted and repaired, each material one observed going red on the defect it names.

Known limits, not defects to chase: the Escape binding exists but is unexercised; the smoke floor is the engine's near-white material, so the exposure claim rests only on the town's own cobble; one shaded street vantage is genuinely dark under fixed exposure; the camera separation figure fails for an incidental reason while the view-to-camera check is the structurally sound half; the import step opens the engine map it once polluted, protected by spawning nothing rather than by a guard; and the red-proof harnesses live under ignored paths, so those proofs cannot be re-run from the repository.

Not done: this stays on its branch and is not merged to `main`, which keeps the Bay Area map. The Unreal Editor target still builds through a non-persistent AutoSDK presence marker, because the .NET Framework SDK install the owner chose needs an elevated shell this session could not obtain.

Blocker recorded at allocation: the fleet work-docs allocator refuses to reserve an ID in this repository because `docs/work/registry.json` does not exist beside the existing `0_bay-area-stanford` folder, and the tool has no migrate command. ID 2 was taken by hand after checking every branch in the repository, where `0` and `1` are both already used on divergent branches and `2` is unused. Creating that registry is a `main`-owned migration and is not part of this proof of concept.
