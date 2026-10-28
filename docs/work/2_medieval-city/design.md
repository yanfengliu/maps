# Medieval city contracts

These are the fixed interfaces between the workers on `codex/medieval-city-20261027`. The orchestrator owns this document; a worker that needs a change asks instead of diverging.

## Toolchain

Blender 5.2.0 LTS at `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe`, Unreal Engine 5.8 at `C:/Program Files/Epic Games/UE_5.8`, and the system CPython 3.13. Every script checks the version it runs under and refuses a different major version rather than producing silently different output. Python uses the standard library only; no package is installed and no npm dependency is added.

Three Pythons run here and they are not the same. The launchers run the system CPython 3.13. Blender runs its own interpreter. The editor-side scripts run the engine's Python, which is 3.11.8 in this install, so syntax newer than 3.11 is a runtime error inside the editor rather than a compile error anywhere you would notice — a nested same-quote f-string is the one that nearly landed. Editor-side files are parsed with `Engine/Binaries/ThirdParty/Python3/Win64/python.exe` before they are run.

## World frame

Blender authors in metres with Z up. Unreal works in centimetres with Z up, so one authored metre is 100 Unreal units.

An asset's origin sits at the centre of its footprint with its lowest point at Z equal to 0, so a placement location is a point on the ground. Plus Y is the asset's front: the facade that faces the street at yaw 0. The town centre is the world origin and the ground plane is Z equal to 0.

The import step does not assume the engine's glTF scale. It measures each imported static mesh's bounds and requires them to equal the inventory's metre bounds times 100 within 1 cm, and it fails with the measured and expected numbers when they differ.

## Layout and Unreal frames

The layout frame is right-handed with Z up, in metres: x is east, y is north. It is the same frame the assets are authored in, so yaw 0 points an asset's front along plus Y, which is north. Yaw is degrees counter-clockwise seen from above, so the front vector at yaw t is (-sin t, cos t). The player start, the vantages and the walk probe headings use that same convention as a forward direction.

Unreal is left-handed with Z up and X forward, and its yaw turns the other way. The mapping below was measured against this engine install, and it replaces an earlier nominal guess in this document that was wrong in two ways; the guess is recorded here because the correction is the useful part.

An authored metre point (x, y, z) arrives as the Unreal centimetre point (100x, -100y, 100z). There is no axis swap: only Y is negated. That follows from two composed conversions, each read from source rather than assumed. Blender exports with plus Y up, writing an authored (x, y, z) as glTF (x, z, -y). The Interchange glTF reader's `GLTF::ConvertVec3`, in `Engine/Plugins/Interchange/Runtime/Source/Parsers/GLTFCore/Private/GLTF/ConversionUtilities.h`, returns {Vec.X, Vec.Z, Vec.Y}. Measured confirmation: `house_a` imports with bounds x plus or minus 357.0 cm against an authored plus or minus 3.57 m, and y plus or minus 308.075 cm against an authored plus or minus 3.080755 m.

So the earlier guess of (100y, 100x, 100z) was wrong, and an asset's authored plus Y front arrives as Unreal minus Y, not plus X. Unreal yaw equal to minus the layout yaw was right and stands.

A camera heading is not an actor yaw. A camera's forward is its local plus X while an asset's front is its local minus Y, so the two differ by 90 degrees.

For a layout heading t in degrees, the Unreal camera yaw is `-(t + 90)`: add 90 first, then negate the sum. It is written as a formula because the prose form is ambiguous, and `-(-t + 90)` is wrong. Anything that aims a camera or a walk direction from layout headings uses that; actors use the `-t` rule above.

None of this is an assumption to build on. The level builder measures it: after placing the first asset it reads the actual world transform and bounds back, and it checks the invariant that each house's front direction points at the street it stands on within 25 degrees. A measured mapping that differs from what is written here is reported with both, not silently accommodated.

Importing also needs Nanite turned off. Interchange enables it by default, and with Nanite on, LOD0 is a decimated fallback: the ground imported with 5659 triangles against the inventory's 12168 and `house_a` with 2882 against 3264. Complex-as-simple collision uses that fallback, so a character would walk on half-resolution ground. With Nanite off both counts match the inventory exactly, which is what the bounds and triangle checks require.

The sun angles pass straight through as the Unreal directional light's pitch and yaw.

## Asset inventory

`tools/blender/build_assets.py` writes one glTF binary per asset into ignored `assets/generated/medieval/`, plus `inventory.json`. Names are exact; the layout generator and the importer read them.

| asset | what it is | footprint m | height m | max triangles |
| --- | --- | --- | --- | --- |
| `house_a` | timber-framed two storeys, jettied upper floor, gable roof | 7.0 x 6.0 | 8.5 | 6000 |
| `house_b` | narrow three-storey townhouse | 5.0 x 6.5 | 11.0 | 6000 |
| `house_c` | wide two storeys with a shopfront awning | 9.0 x 6.0 | 8.0 | 7000 |
| `cottage` | single storey under thatch | 6.0 x 5.0 | 5.0 | 4000 |
| `wall_segment` | eight-metre curtain wall, crenellations and walkway | 8.0 x 1.6 | 6.0 | 3000 |
| `wall_tower` | round wall tower with a conical roof | 4.5 x 4.5 | 9.0 | 4000 |
| `gatehouse` | arched gate between two flanking towers | 10.0 x 5.0 | 12.0 | 8000 |
| `church` | chapel with a west tower and buttresses | 18.0 x 10.0 | 19.0 | 10000 |
| `well` | stone well, timber roof, bucket | 2.4 x 2.4 | 3.0 | 2500 |
| `market_stall` | timber stall under a striped canopy | 3.0 x 2.4 | 2.6 | 2000 |
| `cart` | four-wheeled wooden cart | 3.2 x 1.6 | 1.6 | 2500 |
| `barrel` | banded barrel | 0.8 x 0.8 | 1.0 | 800 |
| `crate` | plank crate | 0.9 x 0.9 | 0.7 | 400 |
| `sack_pile` | three stacked sacks | 1.2 x 1.0 | 0.8 | 900 |
| `brazier` | iron fire basket on legs | 0.7 x 0.7 | 1.3 | 1200 |
| `tree` | trunk and canopy | 4.0 x 4.0 | 7.0 | 2500 |
| `fence` | three-metre wattle fence | 3.0 x 0.2 | 1.2 | 600 |
| `ground` | 220 m square ground with cobbled centre, dirt streets, grass outside | 220 x 220 | 0.8 | 14000 |

Footprint and height are the envelope, not an exact size: the check accepts a footprint within 15 per cent and a height within 20 per cent of the declared value, so the shapes stay human-scaled without being rigid. A door opening is at least 2.0 m tall. The ground's height figure is its vertical relief, and its lowest point is Z equal to 0.

The ground is exactly flat at Z equal to 0 over the box x within plus or minus 60 and y within plus or minus 64 layout metres, so every building and prop sits seated rather than floating or sunk. Its 0.8 m of relief begins beyond that box, where nothing is placed.

Those two numbers are the contract between the ground asset and the layout: the flat box must contain every non-ground footprint with margin. The real inventory puts the corner towers at x plus or minus 58.82 and y plus or minus 61.73 and the gatehouse front at y 62.25, which the box covers. The asset generator checks that every ground vertex inside the box is at Z equal to 0 within 1 mm, and the layout check confirms every footprint lies inside it.

## Street and plaza regions

The ground's painted regions and the layout's streets are one shared fact, so both the ground asset and the layout generator use these rectangles in layout metres. They were proposed by W3 from its street plan and are fixed here by the orchestrator.

| region | extent | surface |
| --- | --- | --- |
| plaza | x from -19 to 19, y from -19 to 7 | cobbles |
| main street | x from -3.5 to 3.5, y from 7 out to 68 | dirt |
| cross street | y from -9.5 to -2.5, x across the flat box | dirt |
| outside the ring | everything beyond the wall, apart from the road apron | grass |

Cobbles may bleed a little into the street mouths; a hard edge is not required. Grass may appear in the gaps between buildings inside the ring.

The main street runs through the gate and a short apron beyond it, to y equal to 68, because a road that stops dead at the wall looks wrong from outside. That apron is the one place dirt appears outside the ring.

Material names are exact, because the importer creates one Unreal material per entry: `M_Plaster`, `M_Timber`, `M_RoofTile`, `M_Thatch`, `M_Stone`, `M_Cobble`, `M_Dirt`, `M_Grass`, `M_Wood`, `M_Iron`, `M_Canvas`, `M_Leaf`.

Each mesh is triangulated, carries normals and one UV set, has its modifiers and scale applied, is a single object per asset with its material slots kept, and exports no camera, light or armature. Generation is deterministic: seeded randomness only, sorted iteration, so two runs produce identical bytes.

## Inventory schema

`assets/generated/medieval/inventory.json`, sorted keys, two-space indent, LF endings:

```json
{
  "schema_version": 1,
  "generator": "tools/blender/build_assets.py",
  "blender_version": "5.2.0",
  "units": "metres",
  "axis": "Z up, +Y front, origin at footprint centre with the lowest point at Z=0",
  "materials": { "M_Stone": { "base_color": [0.56, 0.55, 0.52], "roughness": 0.85, "metallic": 0.0 } },
  "assets": {
    "house_a": {
      "file": "house_a.glb", "sha256": "...", "bytes": 0,
      "bounds_min_m": [0, 0, 0], "bounds_max_m": [0, 0, 0],
      "footprint_m": [7.0, 6.0], "height_m": 8.5,
      "triangles": 0, "materials": ["M_Plaster"]
    }
  }
}
```

## Layout schema

`tools/medieval/build_layout.py` reads `inventory.json` and writes `assets/generated/medieval/city_layout.json` from a fixed seed, so the town is reproducible and reviewable as text:

```json
{
  "schema_version": 1,
  "generator": "tools/medieval/build_layout.py",
  "seed": 20261027,
  "units": "metres",
  "inventory_sha256": "...",
  "extent_m": { "min": [-110, -110], "max": [110, 110] },
  "wall_ring_m": [[0, 0]],
  "placements": [{ "id": "house_a_01", "asset": "house_a", "location_m": [0, 0, 0], "yaw_deg": 0, "tag": "house" }],
  "player_start_m": { "location": [0, 0, 0], "yaw_deg": 0 },
  "vantages_m": [{ "name": "plaza", "location": [0, 0, 1.6], "yaw_deg": 0, "pitch_deg": -5 }],
  "sun": { "pitch_deg": -38, "yaw_deg": 125 },
  "walk_probe_m": { "open_run_start": [0, 0], "open_run_heading_deg": 0, "wall_run_start": [0, 0], "wall_run_heading_deg": 0 }
}
```

Tags are `ground`, `wall`, `tower`, `gate`, `house`, `church`, `prop` and `tree`. The town is a wall ring about 120 m across with one gatehouse, a market plaza holding the well and stalls, the church on the plaza, houses lining two or three streets, and props and trees dressing the edges. Twenty to thirty-five buildings is the target; this is a proof of concept, not a city.

Layout invariants, checked by `tools/medieval/test_layout.py`: no two footprints overlap, every building sits inside the wall ring, the ground covers the whole extent, the player start is on open ground at least 1.5 m from any footprint, `open_run_heading_deg` from `open_run_start` has at least 12 m of clear street, and `wall_run_start` faces a wall or building within 4 m.

## Unreal project

`MedievalCity.uproject` at the branch root, engine association 5.8, one runtime C++ module `MedievalCityRuntime`, with `Source/MedievalCity.Target.cs` and `Source/MedievalCityEditor.Target.cs`. Enabled plugins are the ones the import and scripting steps actually need, verified against this engine install rather than assumed.

Generated package paths: static meshes at `/Game/Generated/Meshes/SM_<asset>`, materials at `/Game/Generated/Materials/<material>`, the level at `/Game/Maps/MedievalCity`. All of `Content/`, `Binaries/`, `Intermediate/`, `Saved/` and `DerivedDataCache/` are ignored by Git and reproduced by the command sequence.

Nothing tracked in Git is a Blueprint, an input asset or any other binary package. Input actions and the mapping context are built in C++ at runtime, and the third-person avatar is assembled from engine primitive shapes, so the tracked project is text.

## Character and input

`AMedievalCharacter` has a capsule 34 cm in radius and 88 cm in half height, a first-person camera 72 cm above the capsule centre, and a spring arm 50 cm above the capsule centre with a 320 cm arm, camera lag and collision test, carrying the third-person camera. Exactly one camera is active at a time.

In first person the character yaw follows the controller and the avatar is hidden. In third person the avatar is visible and turns toward its movement direction.

Movement: 300 cm/s walking, 600 cm/s sprinting, 420 cm/s jump impulse, 1500 cm/s/s acceleration, 2000 cm/s/s braking.

The avatar is a blocky figure of engine primitives with a procedural walk cycle driven by horizontal speed, so no skeletal mesh or animation asset is needed.

Keys, mapped through Enhanced Input objects created in code: W, A, S and D move, mouse X and Y look, Space jumps, Left Shift sprints while held, V toggles the camera mode, Escape quits.

## Verification

`tools/medieval/run_probe.py --mode city` starts the real game with `-MedievalProbe=<directory>` and the probe actor runs one fixed sequence: settle, capture, hold W for three seconds in third person, toggle to first person, hold W again, look with the mouse, jump, a paced walk against a paced sprint, one run for each of W, A, S and D, a run into a wall, a walk through the gate arch, and finally each layout vantage, before requesting exit. Without `--mode city` it runs `smoke`, a bare test floor that shows none of the town and skips the gate step.

Movement input is injected as real key events through the player controller, so the Enhanced Input bindings are exercised. Vantage captures move the character directly and are recorded as placement, not as evidence about the controls.

`probe.json` records, per step, the key injected, the character's start and end location, its speed, where the rendered view was and which camera the character calls active, and each screenshot's name and SHA-256. The probe fails when movement under held input is 3 m or less; when a movement key moves the character less than 150 cm along its own direction or more than 60 cm across it; when the rendered view moves less than 100 cm between the camera modes; when the rendered view sits more than 5 cm from the camera component the character calls active; when the view was never compared at all, which a sample count makes distinguishable from a clean pass; when sprinting covers less than 1.4 times the walking distance over the same time; when the character leaves the ground envelope; when pushing into a wall moves it more than 1 m; or when it fails to clear the gate line by 200 cm.

The rendered view is read from the player camera manager, not from the camera components, because a check that branches on the same flag it is checking proves only that the flag flipped. The opening sample of each step is discarded: the step opens in the same tick as a placement, after the camera manager has already run, so it would read the pre-placement view.

The wall test is two steps under one held key, because the layout only promises a wall within 4 m of the run start: an approach that must itself cover at least 25 cm, so a character that never moved cannot be reported as stopped by a wall, then a measured push of at least 1.5 s more, which must move it no more than 1 m. The ground envelope is measured as clearance above the surface under a downward trace rather than absolute Z, so the ground's relief cannot break it. A vantage names where the camera goes, so the capsule is placed 72 cm below it, matching the first-person camera offset.

The gate step places the character on the main street short of the gatehouse and holds W until it is through. It shows that this gatehouse's arch admits a colliding character at this placement; it is not a claim about gate passability in general.

Sprint is part of the sequence: holding Left Shift with W must cover meaningfully more ground than W alone over the same time. The Escape binding exists but the probe exits through the engine's own exit request, so Escape stays unexercised and is reported as such.

Screenshots are 1280x720 and are inspected at native resolution; acceptance is bound to the digests in `probe.json`.

## Gates

| Gate | Command | Bound |
| --- | --- | --- |
| Assets | `python tools/medieval/test_assets.py` | Inventory completeness, metre envelopes, triangle budgets, declared materials, byte-identical repeat run. No claim about appearance. |
| Layout | `python tools/medieval/test_layout.py` | Overlap, containment, flat-box containment, player start clearance, and the probe's run clearances, including the 20 m of clear street the two walks consume. No engine claim. |
| Native build | `python tools/medieval/build_native.py --target both` | That both targets are current and their binaries post-date every source file. An ordinary run may compile nothing and says so; `--rebuild` is the run that compiles, and it records to its own filename so an ordinary run cannot overwrite the evidence. No runtime claim. |
| Level | `python tools/medieval/build_level.py --verify` | Imported mesh bounds and triangle counts against the inventory, every layout placement present at its mapped transform, no undeclared actor of any class, house fronts facing their streets, and the world actors present. Ground under the player start is traced on the Pawn profile; the axis-sign probes use Visibility. |
| Probe | `python tools/medieval/run_probe.py --mode city` | Real game, injected keys, per-key movement direction, the rendered view in both camera modes with a sample count, sprint against walk, ground contact, a wall that stops a character that actually approached it, the gate arch, and non-blank captures. Not a performance or appearance claim. |
| Repository | `npm run build`, `npm run typecheck`, `npm test`, `npm run audit` | The Bay Area map product on this branch is unchanged and still passes. |

Each script owns and closes the processes it starts, terminates only its own process tree, and writes evidence under ignored `artifacts/`.
