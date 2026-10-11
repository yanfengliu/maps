# Review 1: implementation

## Target

The initial uncommitted implementation on `codex/shibuya-unreal-5.8`, based on bootstrap commit `af4403654cfa2917c17bc52caf838da61939770e`, at `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree`.

The orchestrator retained the seven source files and their digests under ignored `tmp/review-runs/round1-target/`, with `inventory.json` identifying the exact snapshots. These source bytes matched the initial review target. Keep them until this target is recoverable after repair integration.

| Source path | Reviewed SHA-256 |
| --- | --- |
| `sources/shibuya.json` | `864caf438d8825069aad9927d002331989b71b5ccc385f12169009e1160ec3f6` |
| `tests/data/test_city.py` | `57ca954f92526241ebc6ca7e6bca1d9bd24cfa48f123ef8166559439ccdb1157` |
| `tools/data/build_city.py` | `7bc82a8eacbc06c7f158e0909817f8655ff003658b2ecb56b6d6f5fcebeb8084` |
| `tools/data/check_dependencies.py` | `4780a7945f5e02ebd82656f3b6e0681ba9b9ac142c1e1340c6e0160cc4aa1856` |
| `tools/data/dependencies.lock.json` | `e9afdfe5bfb53d9b34f41f9580bbaa70136d57dd9adf5e82dd06478e78e2f570` |
| `tools/data/fetch_gsi.ps1` | `1ac6f55a0405000b3eab716b0c27ae26eaafeecedd13c21f98d7cdeb81526811` |
| `tools/data/requirements.txt` | `eeccd064e53664848782ccc0de4e4300e7d1e36e3b6af1d58799f902252c8915` |

The engine files initially identified for review were `Content/Python/shibuya_tools.py`, SHA-256 `bcad1202f1db6938fa83d343659e2b7f754ea4552ee576ef2193f22c761d1024`, and `tools/unreal/mcp_run.py`, SHA-256 `5ea35284766e6fc2415e4247774e4a7ab8758f2cfd6c55093bafafa318870d8d`. A premature lighting/camera edit superseded these bytes before target preservation. Their exact old bytes are unavailable; the pre-repair snapshot preserves the finding functions in the then-current files, with different hashes recorded by the inventory. Engine freeze and coverage were withdrawn. Those snapshots cannot establish review of the later engine revision.

## Reviewers and coverage

`implementation_review` was an independent read-only in-chat reviewer using Astra with xhigh reasoning. It directly read every requested authored implementation file, the dependency and native reports, and relevant policy outside the diff at `docs/policies/local-rules.md:23/27`. It launched no engine, browser, server, or expensive gate and made no writes.

The report below is the parent's transcription of the reviewer's substantive authored findings and limits. It is not a literal full raw transcript; the original report is in the parent chat. README and plan were evolving context, not accepted final documentation.

## Reports

### implementation_review

Two material findings were identified in the initial review target.

**R1 [P2]: Probe deletes the saved city.** `tools/unreal/mcp_run.py:187-188` unconditionally calls `create_empty_map`. `Content/Python/shibuya_tools.py:72-79` loads the existing `/Game/Maps/Shibuya`, destroys every `ShibuyaSource` actor, and immediately saves. A probe run after a successful build therefore persists an empty city. Minimal safer behavior is to import the axis fixture without clearing the city, or use a dedicated temporary validation level and restore the original without save or mutation. This blocks bounded reversible probe acceptance.

**R2 [P2]: Windows ZIP confinement is incomplete.** `tools/data/build_city.py:562-565` validates `PurePosixPath`, then line 585 joins it to the Windows cache before lines 596-597 write it. `PureWindowsPath(cache) / PurePosixPath("C:/outside/tile.b3dm")` replaces the cache root; drive names and colon/ADS names pass. Reject Windows drives, roots, and colons, and verify that the resolved target is confined before access or write, with malformed-name regression checks. No escape was observed in the current official admitted archive, but the boundary is incomplete.

The GSI fallback mismatch is real at lines 321-323 versus 356-358: a .NET failure raises `ValueError` and cannot reach the `HTTPError` fallback. All four required DEM5A tile inputs are present, so this does not invalidate the current prepared crop. Retain the unexercised-fallback limitation or remove/fix the advertised path.

The full native receipt of 112 actors and 43 textures does not establish a Nanite explanation for the difference in triangle counts. Coordinate checks prove mathematical conventions and crop bounds, not independently surveyed Shibuya landmarks. The reviewer gives no visual, motion, or performance approval. Source/data files remained unchanged through review. Root withdrew the engine freeze, so the review gives no approval of subsequent engine edits.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| R1 | Probe overwrites the saved city. | Accepted by the orchestrator; initial probe acceptance was blocked. | Distinct validation worlds, restoration, city-byte and actor-identity checks passed the focused native probe. Frozen repair review remains pending. |
| R2 | Windows ZIP names can escape the cache boundary. | Accepted by the orchestrator; the guard must protect the whole class. | Repaired guards passed fifteen source tests and actual writer-boundary red/green controls. Frozen repair review remains pending. |

The orchestrator also authorized removal or repair of the unusable advertised GSI fallback. It authorized measured native geometry counters and one bounded lighting/capture correction. These are assigned increments, not accepted outcomes.

## Verification

The initial source gate passed ten checks; root reran them in 2.631 seconds. The three admitted dependency pins passed the recorded OSV audit. Native full import was observed in `artifacts/unreal/build-20261011-002614/report.json`: 70 GLBs, 112 static mesh actors, 43 textures, 113 material assets, and a saved map of 263,353 bytes with SHA-256 `4b6de737d9403d2f6f76e9ee21a8197a7af14d251d83d25ee31ca4ce6478b43d`. Its input manifest is SHA-256 `edba2060ee919ef2d1f2c3b8304eea5e9e55778fee33e8cb56a8ecd8bef3d09e`. It used D3D12 on RTX 4090 driver 616.64 and exited gracefully with code 0.

At initial review, native LOD0 counts of 286,041 vertices and 127,099 triangles differed from prepared-source counts of 1,205,901 vertices and 468,500 triangles, and actual Nanite counter evidence was pending. Early six-view captures were dark or obstructed and did not establish appearance acceptance. No old Node gate or full runtime/CI verification applied or was claimed.

**Subsequent repair verification, supplied by the orchestrator:** `artifacts/unreal/probe-20261011-003814/report.json` passed two validation-world probes, restored 112 city mesh actors each time, preserved saved map SHA-256 `4b6de737d9403d2f6f76e9ee21a8197a7af14d251d83d25ee31ca4ce6478b43d`, verified the axis fixture, and exited with code 0. Actual native APIs reported 112 Nanite-enabled meshes and 468,500 input triangles, matching the source total. Native welded vertices (769,872), source accessor vertices (1,205,901), and LOD0 fallback vertices/triangles are distinct metrics; no full vertex correspondence is inferred.

The source worker reported fifteen repaired tests and syntax checks passing; root reran the fifteen tests in 1.493 seconds and passed the five offline native MCP checks. `tmp/review-runs/zip-cache-boundary-proof.json` retains an actual pre-repair Windows absolute-path writer escape within the owned temporary directory, followed by repaired refusal of drive, ADS, root, noncanonical and reparse paths plus junction write/read controls. The unusable DEM fallback was removed; required DEM5A inputs now stop explicitly on failure. Prepared manifest bytes remained unchanged. These checks advance repair evidence but do not replace the focused independent review.

## Round outcome

Initial implementation acceptance is withheld. R1 and R2 are accepted findings with reported repair checks passing, pending focused independent review of a frozen recoverable target. The engine target provenance gap and withdrawn coverage remain recorded. This round does not accept the branch's later executable files, final documentation, rendered appearance, motion, or performance.
