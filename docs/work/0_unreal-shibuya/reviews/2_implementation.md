# Review 2: implementation

## Target

The frozen authored code on `codex/shibuya-unreal-5.8`, based on bootstrap commit `af4403654cfa2917c17bc52caf838da61939770e`, at `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree`. The reviewer's exact SHA-256 inventory below identifies the reviewed target. The orchestrator bound those exact bytes to implementation commit `9df42139ef1747bedc435cb60ecd226cfb69a60a` and verified all 17 committed blob hashes. The report below preserves the reviewer's pre-commit wording.

## Reviewers and coverage

`implementation_review` was the independent in-chat Astra reviewer with xhigh reasoning. It read the complete final authored code and native engine headers, compared source repairs against their preserved initial bytes, and inspected the native probe and writer-boundary proof. It did not run tests or engines or inspect the final capture images. Its authored limits remain intact below.

Transport: the parent copied the authored report into ignored `tmp/review-runs/round2-authored-report.md`, changing link formatting only. That retained parent copy has SHA-256 `63c4f12de673c78dd7aaa290d6f5045fea91f4e3e08a484335c99d54520fd684`. Its substantive text is copied unchanged into this record. Approved external CLI lanes were actually smoked on public instructions, but final code review was this independent pinned in-chat Astra agent, not a full Codex and Claude code review.

## Reports

### implementation_review

No additional material findings in this focused review. **R1 and R2 are closed for the frozen code below.**

- **R1 — closed.** `Content/Python/shibuya_tools.py:182` creates a separate validation level; line 200 reopens the city without clearing or saving it. `tools/unreal/mcp_run.py:201` repeats the probe twice and checks saved bytes and restored actor identity. I read the completed `probe-20261011-003814/report.json`: both iterations restored 112 actors, preserved map SHA-256 `4b6de737d9403d2f6f76e9ee21a8197a7af14d251d83d25ee31ca4ce6478b43d`, and the editor exited successfully.

- **R2 — closed.** `tools/data/build_city.py:524` rejects Windows drives, roots, alternate streams, traversal, reserved names and ambiguous path components. Line 541 checks confinement and rejects existing symlinks/reparse points; line 615 applies it at the actual cache boundary and rechecks before writing. The new regressions exercise admission, actual writes and linked cache reads. I inspected the retained actual-writer red/green proof.

The unusable GSI fallback was removed from both implementation and configuration. Missing DEM5A inputs now fail explicitly. This resolves the earlier fallback limitation without changing the prepared manifest, whose SHA-256 remains `edba2060ee919ef2d1f2c3b8304eea5e9e55778fee33e8cb56a8ecd8bef3d09e`.

I read the complete final native helper and runner, including daylight/exposure configuration, capture changes, Nanite counters and probe handling. I also checked native engine source outside the diff: `Engine/Classes/Engine/StaticMesh.h:2165` and `:2171` declare the Nanite count APIs; the SkyLight, PostProcessVolume and SceneCaptureComponent2D headers expose the edited reflected properties. The completed probe reports 112 Nanite-enabled meshes and 468,500 Nanite triangles, matching the prepared source total. Its 127,099 LOD0 triangles are a distinct reported representation.

The probe receipt used helper hash `dd562f4…`; the final `ed2c537…` change adjusts reflected daylight/capture property setters and does not alter the probe or Nanite paths. Final rendering still needs the separate capture receipt and image review. I did not inspect live capture output, run tests or engines, mutate files, or launch persistent processes.

The retained first-round **engine** snapshot already contains interim lighting edits, so it is not byte-identical to the original first-round engine inventory. I accounted for that by reading the final files completely. Source repair comparisons used the matching original source snapshot.

Verified final authored-file inventory:

```text
eb53754bb51e5bcea16c177e13b6a6d3c65e2a13078f3a79edcc2468a81e7088  .gitattributes
c2eeee20342df9068cace9939ad01f637c4371b0ef6f71a2144fda3905f9fa12  .gitignore
5e735036d41fdb614c4a27cefba25e02fbe2e98c97fc2ed45096c30e0773388c  Config/DefaultEditorPerProjectUserSettings.ini
1b85b1c827bed86b768ca62e8f530c7e00ef65ef30653d88e488cbdc641e3920  Config/DefaultEngine.ini
61e3fb622f7ba0121c8036ac599acc7122bb3987a97b02b25ad13c56d5ce8e3a  Config/DefaultInput.ini
4520bfe13e1b17c3c511aee76c2ea0351668ed817022eff4f8f87c6a621131c4  Content/Python/init_unreal.py
ed2c53773c73a5ae62047e420323b14b8c7f46da6b067127982bae55b9476e5b  Content/Python/shibuya_tools.py
7318bd4cee6ab89209aaf04eca13187e5c78375cf6a2e32f211d7b0b636fce2f  ShibuyaUnreal.uproject
b90409f29e4754b7cdbc799afe7ce2f766abdb246aff43b3574708a98f65f6ac  sources/shibuya.json
9d61cb90840b0fa9a128032ee7fba1cef062a83496bd599a288d552c72bb5a72  tests/data/test_city.py
5d89dc2867e03eb414e7e107135d2edcc7edb3c08898accf761cc81d5da3093e  tools/data/build_city.py
4780a7945f5e02ebd82656f3b6e0681ba9b9ac142c1e1340c6e0160cc4aa1856  tools/data/check_dependencies.py
e9afdfe5bfb53d9b34f41f9580bbaa70136d57dd9adf5e82dd06478e78e2f570  tools/data/dependencies.lock.json
1ac6f55a0405000b3eab716b0c27ae26eaafeecedd13c21f98d7cdeb81526811  tools/data/fetch_gsi.ps1
eeccd064e53664848782ccc0de4e4300e7d1e36e3b6af1d58799f902252c8915  tools/data/requirements.txt
5d9e9e16df14f2c6a6693fc69175f02065ef60508a6576ac96111ecbecac50a9  tools/unreal/mcp_run.py
74183f3095a00795a6e904915dbbf7f45f58fa169a0697c497498128eba0e42f  tools/unreal/test_mcp_run.py
```

`Config/DefaultEditor.ini` is removed. Both preserved instruction files still match their recorded original hashes. This review closes the code findings; it does not establish visual, landmark, motion, performance or final committed-revision acceptance.
## Findings and disposition

| ID | Finding | Owner disposition and reason | Verification |
| --- | --- | --- | --- |
| R1 | Probe overwrote the saved city. | Closed by independent focused review. Distinct validation worlds restore the city without clearing or saving it. | Both the earlier repeated probe and the exact-final-helper daylight-map probe preserved saved bytes and 112 mesh actors. |
| R2 | Windows ZIP cache confinement was incomplete. | Closed by independent focused review. Admission and actual writer/read boundaries reject ambiguous Windows names and linked escapes. | Fifteen source checks and actual red/green writer-boundary proof passed. |

The unusable DEM fallback was removed. Root accepts the reviewed repair scope; full appearance, interactive runtime controls, independent surveyed placement, motion, and performance remain outside this code verdict.

## Verification

Root's final offline checks passed twenty cases: fifteen source cases and five native MCP contract cases. The three pinned runtime versions passed the exact-version OSV query; that result covers known records at query time, not package safety. Source preparation remains bound to manifest SHA-256 `edba2060ee919ef2d1f2c3b8304eea5e9e55778fee33e8cb56a8ecd8bef3d09e`. The corrected source and engine gate results and commands are in the plan and README.

The separate final capture receipt is `artifacts/unreal/render-20261011-004319/report.json`, SHA-256 `544b15bdcfa95795577c2b4b02becc42d8b2175ef4298ab2cbbc0cef3dd6120d`, using the reviewed final helper SHA-256 `ed2c53773c73a5ae62047e420323b14b8c7f46da6b067127982bae55b9476e5b`. It passed technical capture on D3D12, RTX 4090 driver 616.64, with graceful exit code 0 and the owned editor stopped. The saved daylight map is 271,708 bytes, SHA-256 `6197141cdb38cbdf240f1c1e16e7c871d4fb83fdbf79993bb1584389e3cef1bc`. Its 112 meshes, 43 textures, 113 materials, and 468,500 Nanite input triangles remain observed.

The owner and engine worker opened all six final 1280 by 720 images individually. Whole-crop and block geometry is visible; close crossing views remain dark and obstructed. This establishes an observed static crop, not recognizable frontage or photoreal acceptance. The reviewer did not author this visual conclusion.

The exact-final-helper probe of the daylight map subsequently passed in `artifacts/unreal/probe-20261011-004923/report.json`, SHA-256 `7f7bb8ce07719a803783ac00e1835197e9855a302c52d2e1fe9baf3b9ebb7497`. Two validation-world iterations each restored all 116 actors, including 112 mesh actors, and preserved daylight map SHA-256 `6197141cdb38cbdf240f1c1e16e7c871d4fb83fdbf79993bb1584389e3cef1bc`. Axis verification passed. Graceful exit code 0, removal of the exact two temporary maps, unchanged retained hashes, and no owned editor/ShaderCompileWorker/Zen processes were reported by the engine worker.

Historical Node gates are expressly superseded. This content-only project needs no Unreal C++ compilation. No CI workflow is configured on this branch; a GitHub Actions query of exact implementation commit `9df42139ef1747bedc435cb60ecd226cfb69a60a` returned zero runs. Root verified the review inventory and instruction hashes against its committed blobs. Git whitespace checking with CRLF recognized reports only final blank lines in the two engine-generated INI files; the exact verified bytes are retained.

## Round outcome

No new material code findings. R1 and R2 are closed for the exact frozen inventory above. The initial clean-branch/static-crop/native-MCP milestone is technically verified and bound to pushed implementation commit `9df42139ef1747bedc435cb60ecd226cfb69a60a`. The full city work unit stays active; no photoreal, surveyed landmark, motion, runtime-control, or performance acceptance is granted by this report.
