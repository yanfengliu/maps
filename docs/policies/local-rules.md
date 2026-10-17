# Unreal Shibuya branch rules

## Owner instruction and branch exception

The owner's 2026-10-11 request starts a new Unreal Engine 5.8 MCP branch for the same Shibuya crop, preserving only `AGENTS.md` and `CLAUDE.md` from the previous setup. Historical Vite/three.js/TypeScript source, dependencies, browser harness and Node gates are absent and superseded here. Keep the two instruction files byte-exact: SHA-256 `20a0a9529ffad04a2fc72ffe4cef72cc65eb0b1b41b15c72dd33f0de89d73206` and `336cc4fbf19beaada7ccf9986414fa91851a8d7a07dfb3ccbe800a69eed0ab49`, respectively.

The explicit branch request overrides the generic merge-to-main rule for this replacement tree. Keep it on `codex/shibuya-unreal-5.8`, retaining the active experimental worktree and ignored inputs. Integration into main requires a later owner scope decision. The source milestone at `e0d33fe` is reviewed and pushed; it does not establish full native city acceptance.

Do not import or link old project code, setup, assets, caches, tests, documentation or evidence. Fresh Unreal outputs may pass between declared worker scopes only through exact source/hash inventories with preserved provenance. No symlink/junction connects dependencies or data to an old checkout. Inspect every ancestor and leaf without following reparse points; refuse on reparse or enumeration/inspection error before reading, writing, fetching, promoting or deleting owned source/output paths.

## World, surfaces and movement contracts

The crop is latitude 35.6550–35.6640 N by longitude 139.6950–139.7060 E, with origin 35.6595 N, 139.7005 E. Prepared GLBs are X east/Y up/Z north in metres. Movement schema 1 is local-east-north-up in metres; native placement converts to X east/Y north/Z up centimetres. Preserve origin, geographic bounds, geometry, transforms and source vertical reference. Approximate local DEM/road calibration is not surveyed accuracy.

Photographs use the admitted 90-tile z18 GSI atlas. Photo-only terrain replacement preserves original positions, normals, indices and UVs. Faithful road imports preserve original geometry/transforms and compute geographic UVs for the shared atlas; native material assignment must actually use that atlas. Explicit Source3 repairs may change local derived terrain/road geometry to close physical gaps or native packing seams. Their edit ledger binds immutable raw/parent bytes, the declared region, original face lineage, inferred faces, packed native geometry and measured position/UV errors. Geometry outside the declared region stays unchanged. Inferred geometry is not relabelled as original GSI/PLATEAU data. Actual route legality, fullbody support, grade and native collision still qualify the result. Source hashes, native actor/bounds conservation and inspected image hashes are distinct acceptance evidence.

Mapped routes use actual admitted OSM ways, directed no/only turn relations and measured PLATEAU-road/GSI support. Unsupported conditional/via-way/incomplete restriction forms remain conservatively excluded. Vehicle lanes use source-directed Japanese left-hand centres. Every route segment and declared corridor uses measured support at no more than 2 m spacing, with vehicle grade at most 0.2, pedestrian grade at most 0.6, building-interior exclusion and no unsupported overpass/tunnel/layer ambiguity.

Closed endpoints coincide within 1e-6 m and repeat the same point; closures are real sampled connected segments. One unique central open vehicle path is admitted only through `boundary_flow` with original OSM continuation outside the actual crop, inward/outward heading, supported entry/exit within 20 m of the boundary and hash-bound full 4.4 m by 1.8 m endpoint-body profiles. Native traffic ends a generation at the supported exit and creates the next generation only at an available validated entry. Interior wrapping and invented last-to-first connectors are excluded.

Every fresh stop declares direction +1 or -1. Mapped pedestrian crossing entry stops are distance 0/+1 and exact route length/-1; agents already inside may finish after phase change. Vehicle stops use direction +1. Signals are simulated choices, not real Tokyo timing facts. Seeded fixed-step simulation, route/source/profile digests, physical occupancy across route IDs, native support and boundary generations remain explicit runtime contracts. Discrete source profiles do not prove unsampled corner arcs or actual native collision.

## Toolchain and gates

Use the exercised Unreal 5.8.3, changelist 58210709, bundled native MCP/Editor Toolset/Python/Interchange plugins and CPython 3.13 Windows-x64 source wheels. Hash-pinned requirements live in `tools/data/requirements.txt`; install to ignored `data/runtime`. Review any dependency change and rerun the exact-pin audit. The runtime is a C++ module, so build both Editor and Game targets; the old content-only project's no-compile statement no longer applies.

The actual portable Microsoft .NET Framework 4.6.2 SDK cache contains 152 original signed-payload-mapped files. `build_native.py --sdk-manifest` validates their bytes and confines `UE_SDKS_ROOT` to the child build environment. A cache is neither a global SDK installation nor an engine patch. UBT discovery, actual header/import-library use and resulting native binary digests are separate witnesses. New-machine paths/cache admission must be checked before building.

Use the [README command sequence](../../README.md). Gates have these bounds:

| Check | Bound |
| --- | --- |
| `tests/data/test_*.py` and exact-pin dependency audit | Actual admitted source/cache geometry, photo/UV/provenance, route restrictions, support and path/failure controls; no native scene claim. |
| `tools/runtime/test_core.ps1` and runtime runner units | Actual C++ core on synthetic routes and receipt/path verdict logic; no ordinary native input, physics or renderer claim. |
| `tools/runtime/build_native.py --target both` | Editor/Game compile and link with unchanged authored inputs and binary hashes. |
| `tools/unreal/mcp_run.py probe` | Live intended-project handshake, tool inventory and nondestructive observed action under NullRHI. |
| Native MCP `build`/`surface` | Fresh city import and scoped photo replacement with source geometry/actor checks. |
| Native runtime material preparation | D3D12/SM6 commandlet rendering, completed positive own-resource vertex/pixel shader evidence, instanced usage and checked saves; NullRHI is excluded from shader acceptance. |
| Native MCP `diagnose`/`render` | Actual SM6/D3D12/current-view resource and capture readiness, fresh exact PNG witnesses, fixed camera appearance and native image review. |
| Runtime `inventory` phase | Prepare the actual loaded map/package set and hashes, implementation and admitted source input bindings; every later arm requires this `--asset-receipt`. |
| `tools/runtime/run_native.py` functional/negative arms | Controls, negative-input, report-write-negative, oversize-negative and suppressed-source-failure on the same bound implementation/source/assets; ordinary native viewport controls, collision/support, animation/population and required failures. |
| Separate runtime `performance` phase | At least 30 actual warm unpaused seconds with 3,000 pedestrians/200 vehicles at 1920×1080, the asset inventory, all five same-implementation/source/assets prerequisite receipts and independent required performance verdict. |

A successful response, process exit, compile or report-save attempt is not acceptance by itself. Read the artifact and its required fields; failed, skipped and did-not-run remain distinct. The [active plan](../work/0_unreal-shibuya/plan.md) records current native observations and open product gates. Keep compiler/core proofs, ordinary native input, exact source/collision support, per-view hardware readiness, visual review and full-population performance separate. No remote CI workflow is configured on this branch.

The reach-only software Lumen experiment sets postprocess scene-view distance to240000cm and first global-SDF clipmap extent to7500cm, retaining local trace20000cm/detail1/cache1/quality1 and their original false overrides. The fixed-six static trial passes; coherent saved/runtime adoption and full-population performance remain required. The earlier combined trace240000/detail2 trial stays visually rejected. Preserve original fixed viewpoints and scoring thresholds while testing physical camera or lighting choices. Do not substitute alternate bright viewpoints, smaller populations, software/NullRHI rendering or source-only checks for a failed required gate.

## Source attribution and persistence

Record acquisition identity, exact hashes, selected-member CRCs, licences, attribution and processed-data notices for PLATEAU, GSI and OpenStreetMap/ODbL in manifests and the running HUD. A PLATEAU selected-member digest does not prove the whole ZIP. A rebuilt base manifest includes a new timestamp/digest; changed base or OSM bytes require source admission before updating the pinned surface config. Missing pinned inputs fail, rather than fetching implicitly or skipping checks.

Source/prepared data, project-local dependency/runtime caches, generated `/Game` packages, native binaries, DDC and task-run evidence remain ignored. Preserve exact manifest-bound inputs needed to reproduce accepted checks. Task evidence is retained only while a gate, review or integration needs it. It enters Git only through explicit review promotion under fleet size limits; large assets require an owner-approved asset store/LFS decision. A checkout is not a self-contained scene package, and session save/persistence compatibility remains unaccepted.

## Orchestration and owned resources

The orchestrator owns `docs/work/0_unreal-shibuya/plan.md`, shared interfaces, integration and final acceptance. Workers own disjoint bounded scopes and recoverable exact-byte handoffs; independent reviewers judge those bytes. This branch-local work-document sequence intentionally avoids the old main allocator/registry. Keep implementation, local checks, review, integration and final acceptance distinct.

Work headlessly by default. Serialize engine/UBT/GPU operations under the orchestrator's lease. Native rendered gates use offscreen hardware rendering; NullRHI serves only suitable load/probe checks. A visible launch requires an explained verification or user-exploration need. Every task-owned engine/MCP/helper/server has an identifiable process/session, finite deadline and finally cleanup of its own process tree; leave unrelated user processes alone. Keep a process alive only at the owner's request, with its closure plan reported.

Use ignored `artifacts/`/`Artifacts/` for evidence and `data/` for fresh source/generated data. Inspect rendered frames individually at native resolution, bind reviews to inspected digests and exercise controls through ordinary input over time. Check process leftovers before handoff. Cleanup validates absolute owned paths and reparse ancestry before deletion; it never follows a junction or broadly cleans another checkout.

Verification correction (owner steering, 2026-10-16): use the actual README product entry points to identify the next blocker. Experimental Source32/selected-loader and fixture-relocation qualification are not universal prerequisites for unrelated native observation. Retain actual source/geometry/support, ordinary input, hardware appearance, original population/performance and owned cleanup checks. Reject known-invalid requests before expensive unrelated reads; report end-to-end and phase times. Profiled process exits are not product verdicts: local cProfile catches SystemExit; read the native receipt and engine exit, and run native acceptance directly.
