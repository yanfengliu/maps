# Medieval city branch rules

These rules apply only on `codex/medieval-city-20261027`, which carries a medieval city proof of concept beside the map product. The map rules below are unchanged and still govern every map file.

The owner asked on 2026-10-27 for a small medieval city in Unreal Engine with Blender assets, walkable in first and third person, as a proof of concept on a new branch. Keep it on that branch; integrating it into `main` needs a later owner decision. The Bay Area map stays the product on `main` and this branch does not change it.

Nothing tracked in Git is a binary Unreal package. No Blueprint, input asset, skeletal mesh or animation asset, because fleet rule R23 keeps binaries over 512 KiB out of ordinary Git. Enhanced Input objects are built in C++ at runtime and the third-person avatar is assembled from engine primitive shapes, so the tracked project is text and the generated content is reproduced by the command sequence in the README.

Blender authors in metres with Z up; Unreal works in centimetres. An asset's origin is its footprint centre with the lowest point at Z equal to 0, and plus Y is its front. The importer measures imported bounds against the Blender inventory rather than assuming the engine's glTF scale.

Verification injects real key events through the player controller so the input bindings are exercised. Moving the character directly is placement, not evidence about the controls. Screenshots are inspected at native resolution and acceptance is bound to their digests.

Assets are authored procedurally and deterministically: seeded randomness only, sorted iteration, two runs byte-identical. No downloaded, purchased or third-party asset, and no Python package outside the standard library.

Unreal 5.8 cannot build any project's Editor target on a machine with no .NET Framework SDK, because `SwarmInterface.Build.cs` throws when it finds no NetFxSDK directory and `UnrealEd` depends on it unconditionally. The Editor target is not optional here: the Game binary refuses to start on uncooked content, so the game runs as `UnrealEditor-Cmd.exe <uproject> <map> -game`, and importing assets and saving a level are editor work too.

The owner chose installing the Windows SDK ".NET Framework 4.x SDK" component as the standing answer on 2026-10-27, and it is installed: `Microsoft.Net.Component.4.8.SDK` and `Microsoft.Net.Component.4.8.TargetingPack` were added to the `18` BuildTools instance, registering NETFXSDK 4.8 in the 32-bit HKLM view of `Microsoft SDKs`. The Editor target builds from that SDK and records `netfx_autosdk_marker: false`. A `vs_installer` run that exits 1 reporting a truncated `installPath` is a caller quoting bug rather than a wrong component ID, because PowerShell `Start-Process -ArgumentList` does not quote array elements containing spaces. `build_native.py` keeps the fallback for a machine where no SDK is registered: it checks the registry and, only then, creates an AutoSDK presence marker under ignored `artifacts/` and sets `UE_SDKS_ROOT` for that single UnrealBuildTool subprocess. Nothing is installed, no registry key is written and nothing persists. UnrealBuildTool only checks that the marker file exists, and an installed engine never recompiles SwarmInterface, so the paths derived from it are never read. The build records `netfx_autosdk_marker` per target so the workaround is never silent, and it goes inert by itself once the real SDK is registered.

# Current map direction

The product is a map inspired by Apple Maps, beginning with the San Francisco Bay Area coastline and regional context. Stanford University's main campus is the only area with 3D buildings. Keep the regional-first view and a clear Stanford flight. Moving around the map should offer smooth pan, zoom, rotation, tilt, compass reset and useful local place search.

Route planning, turn-by-turn directions, satellite imagery, live traffic and other cities' 3D buildings are outside the first increment. Do not claim pixel-identical Apple behavior or photorealistic Flyover. Use public sources and authored styling, not Apple's imagery or credentials.

MapLibre GL owns map navigation and projection; Vite and TypeScript own the application. Regional vector tiles come from public OpenFreeMap. Local Stanford GeoJSON comes from real OSM footprints within the mapped campus perimeter. Preserve coordinate precision and courtyard holes. Keep mapped heights, floor-count estimates and missing-height defaults distinguishable. Source pins and ODbL attribution live with `public/data/`; data changes require source review and relevant data checks.

Simultaneous held-key and middle-mouse input composes with MapLibre's native handler deltas. Its internal compatibility adapter is deliberately limited to the pinned 6.15 handler registration/scheduling/owned cleanup and a cloned scroll-zoom anchor. Keep runtime version/shape checks and real combined-input regression coverage when upgrading MapLibre. Do not replace native navigation, mutate native handlers or reintroduce pointer/wheel pauses as a concurrency fix.

Keep the sandstone/terracotta map palette as architectural detail grows. Derived roofs and facades are stylized estimates; preserve source heights/geometry. Generate detail off the main thread only near campus, batch it, and measure the 60 fps target during real camera motion at a named resolution/GPU. Shader compilation and buffer upload belong in the loading/frame budget. Context restoration must recreate custom layers even when their standard source already exists.

The frozen `window.__bayMap` observer is read-only. Verification drives real controls and reads observations, never assigns camera state. Treat remote loading and local campus data as separate readiness conditions; errors need working recovery. Review desktop/mobile framing, repeated overview returns, search focus, selected building details and source-failure recovery when those paths change.

Run `npm run build`, `npm run typecheck`, `npm test` and `npm run audit` before code commits. Keep meaningful visual/control evidence under ignored `artifacts/`; do not commit temporary captures or raw source XML. Independent review must inspect the integrated changes. Retain plans, authored review rounds and conclusions in `docs/work/0_bay-area-stanford/`. The old Shibuya archive and retained resources remain separate from this direction.
