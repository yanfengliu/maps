# Shibuya in Unreal Engine 5.8

This branch starts a fresh Unreal Engine 5.8 experiment for the same roughly 1 km square around Shibuya Scramble Crossing. The intended result is a photoreal leaning city with moving pedestrians and vehicles.

Only `AGENTS.md` and `CLAUDE.md` were carried into this checkout. They preserve the owner's instructions byte for byte. Every other file here is new. The previous Vite project, dependencies, source code, configuration, documentation, scene cache, and assets are excluded.

The initial clean-branch/static-crop/native-MCP milestone is verified on Unreal Engine 5.8.3, changelist 58210709: 70 fresh GLBs became 112 static mesh actors with 43 textures. Twenty unit checks passed, and independent focused review closed both code findings. The reviewed implementation is committed and pushed as `9df42139ef1747bedc435cb60ecd226cfb69a60a` on `origin/codex/shibuya-unreal-5.8`. The [plan](docs/work/0_unreal-shibuya/plan.md) retains the full city's open criteria.

The [branch rules](docs/policies/local-rules.md) record the owner's explicit stack and isolation instructions. They explain how the historical browser gates inside the preserved instruction file apply to this fresh Unreal branch.

## Geographic scope

The origin is Shibuya Scramble Crossing at latitude 35.6595 N, longitude 139.7005 E. The crop is latitude 35.6550-35.6640 N and longitude 139.6950-139.7060 E, approximately 1 km square. Fresh PLATEAU FY2025 buildings and roads accompany a GSI elevation terrain grid. The GLB frame is X east, Y up, Z north in metres; a native asymmetric fixture verified Unreal X east, Y north, Z up in centimetres. Independent surveyed landmark and vertical accuracy remain open.

The source pipeline retains triangles only when all vertices lie inside the crop, omitting 120,099 triangles not wholly inside the crop and two empty road members. Ground has a neutral material because aerial imagery retrieval failed; building photos are present. Close crossing views remain dark and obstructed. Photoreal appearance, recognizable frontage, interactive runtime controls, motion, independent surveyed placement, and the population/performance target remain open.

## Prepare and check the fresh source

Run from this checkout in PowerShell. The source runtime is CPython 3.13 on Windows x64; the local interpreter verified here is 3.13.9. Install only the hash-pinned wheels into the ignored project-local runtime:

```powershell
& 'C:\Users\38909\miniconda3\python.exe' -m pip install --only-binary=:all: --require-hashes --no-deps --target data/runtime -r tools/data/requirements.txt
& 'C:\Users\38909\miniconda3\python.exe' tools/data/build_city.py --inspect
& 'C:\Users\38909\miniconda3\python.exe' tools/data/build_city.py --sample
& 'C:\Users\38909\miniconda3\python.exe' tools/data/build_city.py --build
& 'C:\Users\38909\miniconda3\python.exe' -m unittest discover -s tests/data -p 'test_*.py' -v
& 'C:\Users\38909\miniconda3\python.exe' tools/data/check_dependencies.py
```

The inspect/sample/build commands, fifteen repaired source tests, and three-pin OSV audit were exercised. The audit covers known OSV records for the exact pins at query time. The removed DEM fallback is not available; a missing or failed required DEM5A tile stops preparation. Downloads and generated data stay under `data/`; the manifest records selected-member hashes rather than claiming a measured digest of the entire remote ZIP. [Focused independent review](docs/work/0_unreal-shibuya/reviews/2_implementation.md) closed the source and probe findings.

## Native MCP build and captures

These commands use the installed engine's bundled Python and native MCP, Editor Toolset, Python, and Interchange plugins. No global MCP configuration or third-party MCP server is required. The runner owns loopback port 18758 and closes its editor process; probe uses NullRHI, while build/render use D3D12 offscreen rendering.

```powershell
& 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\ThirdParty\Python3\Win64\python.exe' tools/unreal/mcp_run.py probe --manifest data/prepared/manifest.json --startup-timeout 360
& 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\ThirdParty\Python3\Win64\python.exe' tools/unreal/mcp_run.py build --manifest data/prepared/manifest.json --startup-timeout 360
& 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\ThirdParty\Python3\Win64\python.exe' tools/unreal/mcp_run.py render --manifest data/prepared/manifest.json --startup-timeout 360
& 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\ThirdParty\Python3\Win64\python.exe' -m unittest discover -s tools/unreal -p test_mcp_run.py -v
```

Build regenerates the city map and generated asset packages under `Content/`. These binary outputs are ignored; authored `Content/Python/` stays tracked. Reports and captures go under `artifacts/unreal/`. The final probe preserved the daylight map bytes and all 116 actors, including 112 mesh actors, through two validation worlds. It used the exact reviewed helper, removed its two temporary map files, and closed its owned processes. Five offline MCP contract checks also passed.

Final capture passed on D3D12, RTX 4090 driver 616.64, with graceful exit code 0. All six 1280 by 720 images were opened individually; block and whole-crop geometry is visible, while close crossing views remain dark and obstructed. This is static-crop evidence, not photoreal acceptance. The content-only project needs no C++ compilation. Historical Node gates are superseded. No CI workflow is configured on this branch; the exact implementation commit has zero GitHub Actions runs.

## Branch ownership

The orchestrator owns scope, shared contracts, and acceptance. Workers own bounded implementation and independent review. This experiment stays on `codex/shibuya-unreal-5.8`; main and its active work remain separate. Its worktree and ignored source/generated assets are intentionally retained for the active city work. Task-owned engine processes have been closed. Do not merge the replacement tree onto main under the standing generic merge rule.
