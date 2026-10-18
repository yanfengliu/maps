# Setup and cached inputs

This is the operational guide for the current Vite application. [The Shibuya plan](../work/0_shibuya-1km/plan.md) owns acceptance; [local rules](../policies/local-rules.md) own requirements. Commands below describe existing scripts, not a new successful setup run.

## Run the prepared scene

Use Node 24 (`.nvmrc`) and `npm ci`. Restore the reviewed `data/scene/`, `data/network/` and admitted `data/rail/` cache into real owned directories. The local walker also needs its source inputs and five-file packet below. Then use:

`npm run dev` → `http://127.0.0.1:5319`

`npm run build`, then `npm run preview` → `http://127.0.0.1:4319`

Vite configuration requires both admitted rail and walker packets even for a city-only query. Ports bind 127.0.0.1 with `strictPort`; they do not silently advance to another port. Build does not fetch or produce map/agent data. A missing resource produces a named error rather than authorizing a substitute cache.

## Startup and query options

| Option | Behavior |
| --- | --- |
| No query | Satellite, dusk, seed 5970698, zero generic pedestrians/vehicles. With the admitted packet, one local walker starts held until **Start walking** is enabled and pressed. |
| `?style=satellite` or `cartographic` | Selects the initial registry style. The World style control changes it without reloading or resetting progress and updates the URL. |
| `?time=` | `dawn`, `morning`, `noon`, `afternoon`, `golden`, `dusk`, `night`; unknown names refuse. These are fixed lighting presets, not a live time control. |
| `?seed=` | Overrides deterministic world/population seed. The default local walker requires 5970698; other seeds do not select it automatically. |
| `?agents=0` | Generic population off and default local walker omitted; appearance inspection. |
| `?agents=1` | Requests 3,000 generic pedestrians and 200 vehicles. This is a request, not proof of active/drawn counts, behavior or 60 fps. |
| `?pedestrians=N&vehicles=M` | Non-negative whole counts; an omitted count uses its generic default. Cannot accompany `agents=0`. |
| `?local-walk=1` | Explicitly requests the admitted singleton at seed 5970698 with zero generic actors. Missing packet, another value/seed or a nonzero generic population refuses. |

Combine options with `&`, for example `?agents=0&time=noon`. Explicit generic population/count options suppress automatic singleton selection. Use the real Start button to release the held walker; camera orbit/pan does not steer or follow it. The population/performance target remains 3,000/200 at 60 fps and 1920×1080.

## Produce or restore data

Fresh remote preparation and reproducing the reviewed scene are different operations. `npm run data:setup` runs this sequence:

1. `data:fetch` downloads pinned PLATEAU/GSI sources and cached live OSM; `data:scene` builds/reconciles terrain, roads, placed buildings and pavements.
2. `data:textures:verify`, `data:network`, `data:paint-reference`, `data:markings`, `data:decorations` verify textures and produce the movement database, paint and decorations.
3. `data:vehicles`, `data:hardware`, `data:local-walk` prepare vehicles, supported control hardware and the walker packet.

This chain requires additional cached human/source inputs and Blender for offline stages. It does not call the human baker or install the external rail packet. Live OSM changes; the source-dependent network/walker checks admit exact reviewed source vintages and refuse unknown changes. Do not replace historical fixtures or update their pins merely to make a fresh remote run pass. `npm run data:fetch -- --skip-osm` preserves an already restored extract. Preserve diagnostic/partial output before retrying a refusing producer.

The accepted A11 reconstruction is [1632](../work/0_shibuya-1km/reviews/1632_integration.md): a clean checkout of `e1de28244694e7ecedbd75ea045ff49e80026ca3` regenerated 89 served files from retained raw inputs. Another 67 files were restored external prerequisites: 34 rail and 33 human/animation assets. All 156 served files matched the reviewed baseline (364,250,437 bytes). This bounds cached reconstruction, not future remote service availability, fresh-data equality or public snapshot distribution.

### External rail and human assets

Restore the admitted 34-file rail packet, then run `npm run data:rail -- --from <path/to/manifest.json>` after restoring its three original building tiles. `src/world/rail-trial.ts` owns the manifest digest; `tools/scene/install-rail.ts` verifies source/assets, accepts an exact existing directory and refuses partial, different, foreign or linked destinations. [344](../work/0_shibuya-1km/reviews/344_worktree_retention.md#completed-unlink-and-managed-archival) retains the recovery source. There is no rail download/generation step in `data:setup`.

Human source blends, manifests, GLBs and VAT buffers remain ignored. Restore the reviewed assets for current reproduction. `npm run data:agents` is the separate offline human-source/baking pipeline, with MPFB/MakeHuman and Blender requirements described in [Agent assets](agent-assets.md); regenerating it does not inherit current walker or crowd acceptance. `data:vehicles` also requires Blender 5.2, selected with `MAPS_BLENDER_PATH`. Ordinary scene viewing starts neither Blender nor PowerShell.

### Cached local walker

Run `npm run data:local-walk` after the reviewed scene, network, vehicle assets and control hardware are ready. The npm script selects `fresh-1695-bounded-generation`. An exact existing packet is verified/reused; a missing packet is generated from the reviewed cache. Partial or changed output refuses and is preserved. Preserve an earlier `data/agents/local-walk/reference/` and packet run before retrying generation.

Required inputs include `data/scene/agents/commuter-female-source.blend`, its manifest and three delivered GLB/position/normal LODs, plus exact source tuples in `tools/agents/local-walk/profile.mjs` and `input-contract.mjs`. They bind the scene/network, obstacles, baker and current gait implementation. Historical and current-776 tuples remain distinct and strict. Restoring a packet alone does not bypass live source hashes, exact route edges or all-junction authority checks.

Generation requires an explicitly selected Blender 5.2 executable through `MAPS_BLENDER_PATH` (or the command's `--blender` option). On Windows put PowerShell 7+ `pwsh.exe` on `PATH`. Missing/old PowerShell refuses before Blender extraction. The Windows extractor owns a process job, requires it empty at completion, and refuses timeouts/interruption. It extracts references from the cached blend without calling the human baker. [811](../work/0_shibuya-1km/reviews/811_walker-cached-reproduction.md) and [812](../work/0_shibuya-1km/reviews/812_walker-packet-review.md) preserve the earlier reproduction bounds.

The packet stays at ignored `data/scene/local-walk/packet/`. Its producer retains `productionReady:false`, competing-height refusals, conservative obstacle overlap and provenance caveats. Source correspondence does not establish continuous terrain contact, collision safety, natural gait, crowd behavior or target FPS.

## Serving the production build

`dist/` contains the application, not the complete world. Vite dev/preview install these services:

| Route | Source |
| --- | --- |
| `/scene/` | `data/scene/`, excluding the walker subtree |
| `/network/` | Separate OSM-derived `data/network/` database |
| `/draco/` | Installed three.js Draco decoder |
| `/rail-trial/` | Finite admitted rail whitelist |
| `/local-walk/` | Five hash-verified packet files; receipts and `/scene/local-walk/` aliases refuse |

A different host must provide equivalent mounts and verification; there is no standalone deployment target. Preserve attribution and the OSM database's separate identity. Vite binds rail/walker availability during configuration, so prepare them before starting dev or building the production application.

## Test prerequisites

Source-dependent tests intentionally require ignored reviewed data. They never download implicitly or treat missing inputs as skipped success. Before a full unit run, restore the current scene/network/agent/rail inputs plus the retained fixtures below. Individual tests own exact accepted byte pins; [Fixture provenance](../../test/fixtures/README.md) describes promoted inputs.

- Nine retained packet files: `artifacts/pedestrian-native253-20260928/packet/{context,rig-near,rig-medium,rig-far}.json` and `artifacts/pedestrian-corner331-20260928/packet/{manifest,context,rig-near,rig-medium,rig-far}.json`. [1422](../work/0_shibuya-1km/reviews/1422_tactile-paving-implementation.md) records their restoration.
- Four literal historical files under `artifacts/local-walk-historical-source/`, separate from the active runtime cache:

| Relative file | Bytes | SHA-256 |
| --- | ---: | --- |
| `data/network/network.json` | 10,239,410 | `314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677` |
| `data/scene/decorations.json` | 80,890 | `f16d044aeefc16704f6bcd10c1e3d03039927d6226b68322631ea3edff1ac918` |
| `data/scene/control-hardware.json` | 100,180 | `6b8afb406d339cb8bed7926ef8ec800711f4f309ef69c4794203aa0603248b3b` |
| `data/scene/agents/vehicles.json` | 4,128 | `5b29efc7977949db1611273c8fb294b3ab23a1a55c8f42316cad9b5309c94a01` |

Paint, vegetation, emission, terrain, cutout, rail and hardware tests also read pinned scene files. Old/fresh tuple admission is finite, not a fallback to arbitrary current data. [AGENTS.md](../../AGENTS.md#gates) defines the required code gate chain. `npm run visual:install` installs its Chromium once; the visual gate requires the actual hardware renderer and native image review within the current Satellite scope. Docs-only edits use content/version/link checks, not runtime tests.
