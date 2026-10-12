# Round 23 — project Python startup context

Independent focused read-only review, 2026-10-11, assigned Astra/xhigh pin. Canonical workspace: `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree`, source HEAD `e0d33fe504d103b83b39aa0b2d2efc8bb0b2ccec` with the explicitly frozen integrations. Scope: project startup guard, its actual-source offline controls, installed API definition/common plugin usage and the adjacent helper registration path. The reviewer ran no engine, compiler, test, build, browser or network request and changed no implementation or native asset.

## Verdict

No material finding. The exact guard correctly uses the native running context to skip the project's editor-only toolset import/registration in Game. It preserves the editor import and registration path and catches no exceptions. Code and offline evidence are accepted within that bound. Actual positive Editor MCP registration and a Game run without this project's startup traceback remain pending. This does not fix or certify other engine/plugin startup scripts, the separate vehicle-loop failure, whole Game readiness, appearance, controls or performance.

## Exact target and evidence

Freeze receipt `artifacts/unreal/startup-guard/offline-20261011-131050/report.json`, SHA-256 `e50239e35f6315cbd7522bdd000ded764d1373ed756b2e5a1dfab8ca0c706ade`, binds these three files. All live and retained-copy hashes matched at entry and completion.

| Target | SHA-256 |
| --- | --- |
| `Content/Python/init_unreal.py` | `8d1a22025c9233cb763b39365bb8b6d636980c991cb6ac6b4b1620863d0497a3` |
| `tools/unreal/test_startup_guard.py` | `0a0699d38c798479768941840db331f3fc5dc676e4a4b80e2a08f5b48ce40f71` |
| `docs/work/0_unreal-shibuya/visual-startup-guard.md` | `c2118b1a273cf977b3a487b6e9f3ce35800d0b2a1c403b289ceb425119f9c320` |

Exact copies, receipt, unit log, original startup source and actual native failure log are retained under ignored `tmp/review-runs/startup-round23/target/`. Initial inventory SHA-256 is `2a880403e42ad02987750f73e8f62312c07782b3aae2f08a7160ec7ec4899574`; final inventory is `ae6c3c723ae087babead91f47181ff879c628190f56cc43137a9ea4653cdd1d5`. All seven evidence entries match. The helper remains SHA-256 `41da6c748858d88be5a6d32f8a7696a8f8369eeb636ac0875720e51f768a37d3` and active DefaultEngine.ini remains `4d35e4b5e1c405951a8a187590bd654fe2eec73cc7ee4f0001020c4343421948`; neither changed for this repair.

## Source and failure analysis

The independently read native Game log `artifacts/runtime-game/14f04c576ab042a78e0820a09158c11c/stdout.log` matches SHA-256 `396549734f32ef140c8ac0e4deeef7450555cc52b3f7f169255ca2ad35efa70e`. At lines1645–1657 the project startup imports `shibuya_tools`, which imports ToolsetRegistry registration; its annotation references unavailable `unreal.ToolsetDefinition` and raises AttributeError. The subsequent engine EditorToolset startup traceback is a distinct path. No plugin or engine file is disabled or altered by this project guard.

Installed `Engine/Plugins/Experimental/PythonScriptPlugin/Source/PythonScriptPlugin/Private/PyCore.cpp:1904–1906` implements `IsEditor()` by returning `PyConversion::Pythonize(GIsEditor)`, and `:2094` exports `is_editor()` with no arguments. The candidate note's implementation line reference is approximate; these are the actual installed lines inspected. `Engine/Source/Runtime/Launch/Private/LaunchEngineLoop.cpp:2269–2272` sets regular-client context false and `:2293–2300` sets editor context true. This is runtime context, not merely whether the executable was compiled with editor support. Installed MLDeformer NeuralMorphModel startup at line11 and CameraCalibrationML startup at line19 use the same API to guard reflected editor class creation.

The project now imports `unreal`, checks `unreal.is_editor()`, and only then imports `shibuya_tools` and calls `register()`. Thus a false Game context cannot reach the failing ToolsetRegistry import. The true path still reaches the existing `Registration([ShibuyaCityTools])` object and its native registration call; `register()` still raises when the registry refuses registration. Missing `is_editor`, helper import errors and registration errors remain visible because the guard has no catch or fallback. No helper, configuration, material, source geometry or map change was used to suppress the error.

## Offline controls and native limit

The retained unit log SHA-256 `17b6fa4e3ae0835b03a48abfbe39adf5a8b0f9553b2fb75551c5a1ae18fd9d8a` records five tests passing in 0.001 seconds. The receipt records owned Python PID51224 stopped with exit0 and syntax success. The reviewer inspected these author-run results without rerunning them.

Each test compiles and executes the actual project startup source with only the native context and import/registration dependencies mocked. Independent expected call sequences require Game to import only `unreal`, and Editor to import `unreal`, import the helper, then register. Three error controls require Editor import failure, Editor registration failure and missing native context API to propagate. The harness does not reproduce the production branch in an alternate implementation or use the source's own returned flag as its expected answer.

The retained original startup source has SHA-256 `4520bfe13e1b17c3c511aee76c2ea0351668ed817022eff4f8f87c6a621131c4`; it unconditionally imports/registers the helper. The receipt separately reports its reintroduction raising `ToolsetDefinition unavailable in Game` and the repaired Game call sequence containing only `import:unreal`. The five-test unit log itself does not list that separate original-source experiment, so the report distinguishes that receipt-recorded reproduction from the five logged tests. The actual native pre-repair log independently establishes the reported failure path.

Native follow-up must show real Editor MCP registration and absence of this project's traceback in an actual Game run with this exact guard. The mocked positive Editor path is not native registration, and a quiet project import cannot establish the rest of Game startup or runtime acceptance. Evidence remains retained for the active task; the reviewer owns no engine or GUI process to clean up.
