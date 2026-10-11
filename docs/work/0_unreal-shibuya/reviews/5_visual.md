# Visual implementation review — round 5

Independent Astra/xhigh review, 2026-10-11. **Two material P2 findings remain: R10, unenforced capture readiness/provenance, and R11, unchecked road material asset saves.** The existing native surface receipt remains failed. This review does not relabel dark views, certify photorealism or authorize another engine run during the runtime lease.

## Frozen target

Reviewed canonical worktree `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree`, base `33d386299ff7bd02d91bca38f655f41597ddb756`. All four files below were read completely. The scoped diff is 512 insertions and 34 deletions across four files. Before code inspection, their full original bytes were retained under `tmp/review-runs/visual-round5/target/`. The retained `frozen-authored-inventory.json` has SHA-256 `a8eb71a1b5acdc87af49f76f44ca9df9e7613f531c623ab0e96b2721ddf6dab8`.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `Content/Python/shibuya_tools.py` | 40,787 | `5b3f7c02fbc69d3d31e363764dcda65d71fd68615d68a584214582a64faafce1` |
| `tools/unreal/mcp_run.py` | 24,687 | `a2404b3e29fb104377c0849ff82ac70a41a03a22e1102852b4b9d6f87eec224d` |
| `tools/unreal/test_mcp_run.py` | 7,332 | `a3d5cfa93074149c8c56b4f1651637ea69bc7038222cd1a41ecde59700decab8` |
| `Config/DefaultEngine.ini` | 806 | `c120179b75bc784be2e9f14671412e877af40b1acf4d30773e584e536fce1d96` |

The Config edit was checked without printing the removed values: the current bytes equal the exact base prefix before the generated AndroidFileServer section. Only that final section, 386 bytes/14 lines, was removed. This does not establish a fresh native run against the stripped config. The surface receipt records the earlier config digest `1b85b1c827bed86b768ca62e8f530c7e00ef65ef30653d88e488cbdc641e3920`; its helper and runner digests match this review target.

## R10 — P2: readiness and capture provenance are recorded but cannot make the gate fail

Locations: `tools/unreal/mcp_run.py:329–346`; corresponding evidence fields are produced at `Content/Python/shibuya_tools.py:544–547` and `605–609`. The runner attaches `readiness`, warmup and final capture metadata without checking their values. It does not require started/persistent state, intended Lumen methods, actual camera position/direction, format/gamma, 60/80 capture counts or elapsed native frames. It does not require returned paths to be the requested fresh run paths, or independently compare the returned SHA-256 to the bytes measured. The only acceptance predicates are decoded dimensions/population, final central luma and warmup/final mean-luma agreement.

Consequently, a successful MCP envelope containing an empty readiness object, false persistence, a wrong camera, zero elapsed native frames or a repeated old valid PNG path can pass those predicates. A tool reporting its configuration is not an enforced observation. This contradicts `visual-next.md`'s explicit requirement that missing camera/readiness witnesses report failure or did-not-run. It can also defeat the fixed-camera and independently ticked warmup bounds without requiring any PNG corruption.

Validate each response against the runner's independently specified view, expected format/gamma and frame counts. Require complete finite native witnesses; compare actual camera centimetres and normalized direction to the requested metre coordinates with a justified tolerance; require the intended persistent state and PP modes; enforce 60 warmup and 80 final capture calls with advancing native frames. Resolve each returned path to the exact requested file in the new evidence directory and independently hash the bytes used by the pixel gate. Missing or mismatched fields must fail before scoring. Keep readiness requests separate from unproven actual Lumen execution/resource readiness; this repair does not make a PP enum proof of indirect lighting.

Use negative envelope controls for absent/false readiness, wrong position/direction/format/gamma, stale or incorrect paths/digests and nonadvancing/count-mismatched frames, followed by a complete valid control. The existing tests exercise PNG contents and MCP errors but not these acceptance fields. This reviewer did not run mutation controls or gates during the compile lease.

Current evidence bound: the actual `surface-20261011-091720` receipt contains correct camera witnesses, persistent state, matching requested directions, 80 final capture calls and 927–1,034 elapsed native frames across its eight views. Its known darkness failure remains valid. R10 identifies a gate that would fail to reject missing/wrong witnesses; it does not claim those witnesses are wrong in this retained run.

## R11 — P2: shared road material persistence can fail while the helper reports success

Location: `Content/Python/shibuya_tools.py:476–488`, particularly line 480. After changing each road mesh's material slots, `apply_photo_roads` ignores the boolean from `unreal.EditorAssetLibrary.save_loaded_asset(mesh)`. It then verifies bindings in the same in-memory mesh and later saves the level. If the asset package cannot be saved, those binding checks can still pass and the map can still save its asset reference; reopening may restore the previously saved placeholder material. The tool nevertheless returns shared-atlas success.

Installed primary source confirms this is a result that must be checked: `Engine/Plugins/Editor/EditorScriptingUtilities/Source/EditorScriptingUtilities/Private/EditorAssetLibrary.cpp:435–438` forwards the boolean; `Engine/Source/Editor/UnrealEd/Private/Subsystems/EditorAssetSubsystem.cpp:1290–1309` returns false on admission failures and returns the package-save result. The corresponding public header at `:271–277` defines true as successful package save. This is not an exception-only API.

Treat false as a tool failure naming the road asset, before reporting successful replacement. Add a bounded failed-save control proving that the helper cannot return success when this API returns false, and a successful-save control. When the native lease is available, reopen the saved city in a fresh editor and inspect all 25 road material slots against the one admitted atlas. Checking the map file alone cannot establish external mesh-package persistence. No save failure is asserted for the retained 091720 run; the missing failure handling is the finding.

## PNG implementation and retained-byte checks

The native prefix helper at `shibuya_tools.py:31–50` verifies signature, bounded chunk framing, CRC and empty IEND, then returns an exact slice of the native export. It performs no image decoding, colour correction or recompression. Export records original native digest and discarded-tail length/digest before returning the prefix digest. The installed primary implementation `Engine/Source/Runtime/Engine/Private/ImageUtils.cpp:1266–1282` really serializes `CompressedData.GetAllocatedSize()` at line 1280, supporting the spare-allocation-tail diagnosis.

The prefix helper deliberately does not fully validate PNG semantics. The runner's decoder supplies those checks: one initial IHDR, only the observed RGB/RGBA8 noninterlaced format, no unsupported chunks, pixel data after the header, empty IEND, CRC, bounded decompression, exactly one complete zlib stream, exact scanline population, supported row filters and fully opaque alpha. Repeated/reordered headers, tRNS/unknown critical chunks, missing/nonempty IEND, extra/truncated zlib streams, incomplete populations and transparent pixels reject in the authored code and retained earlier control reports. The final runner requires actual 1280×720 and 387,072 central pixels for both warmup and final lanes. Truncated chunk headers may produce a struct exception rather than a tailored RuntimeError; this still rejects and is not a false pass.

The nine-test file and prior parser/prefix reports were read, not rerun. The earlier parser reports name earlier runner hashes; their closure is corroborating evidence for those revisions, not a substitute for reading the present implementation. The helper prefix report names the current helper hash and records exact Pillow/native pixel equality on retained 084901 fixtures. This reviewer independently parsed all 16 current saved final/warmup PNGs without executing the gate: every file digest matched its receipt, every chunk CRC matched, IHDR/contiguous IDAT/empty IEND were the complete saved file, each header was 1280×720 RGBA8, and each zlib stream terminated without unused/unconsumed bytes at exactly 3,687,120 scanline bytes. No allocation tail remains in these saved files. This structural inspection did not independently rerun alpha unfiltering or luma arithmetic; those bounds remain the reviewed parser and previous decoder controls.

The pixel thresholds remain mean encoded luma ≥40, median ≥30, fraction below12 ≤0.30 and fraction above245 ≤0.20. Mean-luma settlement is a deliberately narrow central-luma comparison, not image convergence, material readiness or lighting execution. It cannot establish that a dark static frame is correct.

## Source imports, geometry and native evidence

The terrain and road functions resolve source paths inside the project, hash the declared source files and compare POSITION/NORMAL/index geometry fingerprints and node/scene placement before replacement. Terrain requires the original tagged actor and one imported mesh. Road replacement requires exactly 25 distinct original source actors, uses one existing terrain material/texture, checks every returned material binding and compares native bounds within 0.01 cm. These checks preserve the supplied reviewed geometry; manifest digests remain external admission/review identities, not an independent signature authority.

Independent inspection of `artifacts/unreal/surface-20261011-091720/report.json` confirms 436,754 bytes and SHA-256 `1b62f010bd8a685929d36ae7a9dabb1e6a14b18caa52f8a3953ede08347afc69`. Its terrain manifest digest is `8d1a4149c2e17627a9be15a151bd57e1108cff2d11be3e5ab6a4946b0aecf347`; road manifest digest is `5657bdbf446867762ae8c6831c02c05aaa905dfb5ef390279299ba774a2e2bcd`, the source outputs inspected in round4. Movement-network R7–R9 findings do not alter those photographic geometry bytes.

The receipt's pre-import and post-daylight snapshots both contain 112 distinct mesh actors/assets, 112 Nanite-enabled meshes and 468,500 native Nanite input triangles. The 86 building actors outside the terrain/road swap have identical complete snapshot records, including material bindings. All 112 actor labels, locations and native bounds are preserved. Terrain replacement reports 111 unaffected source actors; road replacement reports 87. All 25 roads name the same native terrain atlas resource. Current saved map SHA-256 is `4203bd6085a60b99570dc3cfb25c02a503f4642719166b9f07f1f9e20df52808`.

| Final native view | PNG SHA-256 | Retained darkness result |
| --- | --- | --- |
| crossing | `58319db6fcd34894b6a082111239e417ffb86c5865e83735cbc7852f6a620a4b` | Failed |
| crossing-west | `644b2e15fda0cf711dc33f65fb5a3699e1db4a5fcd438a17e1858b1594691ae4` | Passed, bounded pixel check only |
| block | `3920c81a0f2c66e9138aabeb6ec361d39d7ee70f6a4095e7265b27690fd54f2a` | Failed |
| block-north | `c0d505c0f507feb520cc1c4fc9e070c241c7bf60dff273bbe345ae7ba191df52` | Passed, bounded pixel check only |
| crop | `e2e9dd773f4910f0472b2ddb761bc3f6ce2a6d8568bdf0d9f4106a594a323163` | Failed |
| crop-opposite | `2e7145d19b8118328535c6590aa6685cadf667beb1a07c7a538d923a3835d8ae` | Passed, bounded pixel check only |
| street-explore | `38fb3965e58ee8f48b18b8a31cc565b5d52656219578cb467fe082281bb1fcc1` | Passed, bounded pixel check only |
| sky-up | `913bca6de26452b89c26af883709e85ac3d02352e4713d8829bff597c2d5f787` | Failed |

The receipt says `passed=false`, `darkness_gate.status=failed`, `visual_verification=false`, and records the error. In particular, crossing median luma is 13.1656 with 48.48% below12; block median is 10.4464 with 54.64% below12. Nothing in this review changes those results. The integration owner and engine owner inspected the eight final images at native resolution; this code reviewer did not duplicate that visual inspection or infer appearance from file hashes.

The authored daylight path uses 100,000-lux sun, captured-scene skylight at intensity1, manual ISO100/f16/shutter125 with zero bias, and explicit Lumen PP methods. It does not create emissive/unlit acceptance materials. The base-colour/unlit diagnostic capture is separately labelled and is not scored as the final view. The installed `Renderer/Private/ReflectionEnvironmentRealTimeCapture.cpp:343–353` excludes scene-capture views from realtime sky updating, supporting the explicit sky-recapture choice. The `configure_daylight` docstring still mentions a built-in cubemap although the code clears it; this is stale wording, not evidence that a cubemap was used.

## Safety, limits and next gates

The capture/export path resolves its output under `artifacts/unreal` and enforces a PNG suffix. Input files resolve under the project. Native package destinations are fixed project-generated paths. Source hashes, native bounds and unaffected actor checks materially constrain photo swaps. Rollback restores actor mesh references in memory but is not a transaction over already imported/reimported asset packages; callers must preserve the admitted saved map/assets and not treat a failed import as successfully rolled back on disk. R11 makes one currently silent save failure explicit. A fresh-editor reload is the relevant persistence evidence.

The MCP client checks response IDs and protocol/tool errors, connects only to 127.0.0.1, and uses the observed native returnValue envelope. Config retains loopback binding and disables Python remote execution. The runner launches an identifiable hidden editor, requests graceful shutdown in finally, waits, and can terminate only the owned PID tree. The retained run records graceful exit0, owned-editor-stopped true, D3D12 RTX4090 and driver616.64. Its fallback taskkill has no explicit subprocess timeout, and a parent-exited result alone does not prove absence of surviving descendants; the owner's separate process census is therefore needed for a full cleanup claim. This review launched no engine, compiler, browser, GUI, server, downloader or external CLI and owns no such remaining process.

Read outside the diff included the saved native report and PNGs, source handoff/renderer-contract documents, prior independent parser/prefix reports, and installed ImageUtils, reflection capture and asset-save implementation/header sections. No tests or expensive gates ran while the runtime/source leases were active. Snapshot retention and this new authored report were the only reviewer writes.

After bounded R10/R11 repairs, require focused review of exact new hashes and offline red/green controls. When the engine lease is available, validate fresh requested capture files, actual camera/readiness/format/gamma/frame witnesses and saved/reopened road materials against the admitted source assets; bind the final integrated config/code/map/source bytes. Preserve the original six views and held-out views and their unchanged pixel thresholds. Actual processed sky/SH, SDF/cards and indirect execution remain observations to obtain under the renderer diagnostic contract. No PP enum, warmup count, mean-luma settlement or successful compilation establishes those renderer properties, ordinary input, continuous physics, simulation correctness or performance. Native appearance remains open independently of whether this code milestone is repaired.
