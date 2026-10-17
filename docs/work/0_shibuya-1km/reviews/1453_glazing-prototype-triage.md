# 1453 — frozen TSUTAYA reflection triage

2026-10-17. Independent read-only review of the six frozen files in `artifacts/glazing1452/worktree`, based on executable `9e4508ee3f7ca4e75ed853ae73e71a82112ce7be`. All six raw hashes match `code-freeze.json` before review. Both capture manifests match the supplied digests, their before/after pin records compare equal, and all twelve actual image hashes match their manifests. No runtime, tests, gates or new capture were run.

**NO ADOPTION. No clear correctable rendering defect found. Whether the cube actually contains useful nearby-city imagery remains UNKNOWN.** The exact candidate has a valid visible failure; the available evidence cannot distinguish missing city content from inadequate content, projection or material presentation. This does not establish that local-city reflection is impossible or justify another tuning campaign.

All twelve original 1280×720 images were opened individually at native resolution. Baseline block/lateral views retain photographic glazing rhythm; baseline dusk is flat. Candidate block changes little. Candidate lateral and each of its three orbit samples show a broad pale horizontal band instead of recognizable neighboring buildings. Candidate dusk remains largely flat. Coca-Cola artwork, lower signs and occupied base remain legible in these views. The band changes across samples, but those changes do not establish convincing glass or coherent motion of identifiable city forms.

The fixed pair poses match to numerical precision: noon block/lateral azimuths 0.785398/0.450000 rad, polar 1.150000, distance 180 m; dusk 0.785398/1.280000/220 m. The runner uses actual left-pointer movement in three 12px increments, eight steps each, with 200ms waits (`runner/capture.mjs:42`). Motion-start azimuths are baseline 0.698651/0.592263/0.491098 and candidate 0.698651/0.594989/0.491259 rad. Completion-time gaps are baseline 931/588ms and candidate 744/616ms; observation-start frame gaps are 42/39 and 43/36. Each screenshot spans 15–18 observed frame advances and changing poses. These are sparse, imperfectly paired samples, with no continuous-motion verdict.

The relevant implementation is internally consistent on inspection:

- `app.ts:364–366` exposes the city for capture after `buildings.ready`; `buildings.ts:416–422` borrows prepared leaves. `tsutaya-reflection.ts:14–28` invokes the installed visibility API and restores it. Installed `3d-tiles-renderer/src/three/renderer/tiles/TilesRenderer.js:974–1002` actually attaches scenes to the rendered group; the unloader cancels pending GPU release on visibility. I found no retained main-camera visibility restriction that clearly excludes the city.
- `tsutaya-reflection.ts:87–107` creates one 256px half-float cube, positions it at (-7,42,-27), updates its six child matrices and renders all faces. Face order, WebGL orientation and last-face mip generation agree with installed `three/src/cameras/CubeCamera.js:105–233`. The target GML is discarded during capture (`tile-materials.ts:170`), with the lower surround hidden separately. Recorded runtime reports six completed renders, one active cube and an estimate of 5,767,152 bytes; it does not observe face contents.
- `tile-materials.ts:175,308–314` converts the normal back to world space, reflects the world view vector and directly samples the cube. The cube render-target X convention agrees with installed `WebGLMaterials.js:241`. The sample is blended into outgoing light after PBR; ordinary PBR roughness does not control this custom reflection sample. No specific direction, colour-space or mip setup error was established.

The focused test explicitly mocks cube rendering (`test/tsutaya-reflection.test.ts:57–70`); its installed-renderer visibility test uses empty groups (`82–100`). Those checks support source/lifetime/visibility plumbing, not city imagery. The smallest unresolved gap is the actual pixels in the captured cube along the directions sampled by this facade. They were not retained. There is therefore no evidenced corrective edit whose counterfactual visual success can be granted; root owns any decision to obtain new evidence.

Review closeout: only this ignored report and its seal were created. No browser, GUI, server, worktree, subagent or persistent helper was launched. Read commands completed. A final marker-filtered `Get-CimInstance Win32_Process` census returned Access denied; system-wide process absence is unverified. The worker's sealed resource record separately reports its twelve identities, port4319 and TEMP closed. Frozen source, originals, protected facade test, AGENTS, main/index/cache and historical trees were untouched. All fourteen final criteria remain OPEN.

## Essential digests

SHA-256: freeze `777e019105b7227f3962ca51508d738be3b8a796834baee73166d97c00dcba84`; baseline capture `7c6b91785dc6d5684896659403b7ae5cffabd8fb9fd7bfeea00550dd77cd99f2`; candidate capture `67940016dfeadb2de05f4882354aad7d8f869743ff25c78f25d55497d8cfbda1`; source `33afd4d250f416512b47efa3a609ef7e1579f46f5bc88c9f44c077c32f3901d2`; sealed handoff `2c089672d7d31e95e46fdf23495f217b396a32d7d2f9596fc108f348086b8bbe`.

Images are under `artifacts/glazing1452/runner/{arm}/payload/`:

| Arm | Original | SHA-256 |
| --- | --- | --- |
| baseline | noon-crossing-block.png | a8b23e3a7da7d85b965d235af1575fa580e47b8a34f6f2f98dbc4640a7078fab |
| baseline | noon-crossing-lateral.png | 6aa9b71ae6f140c1e6952e66be77a9a3ec08d4cefdfbb083960b33d036b41691 |
| baseline | dusk-approach.png | 64010d89dffc7e8b62fbfe2ea1caeec4a398f9c61ae59dab740d0b679f85624f |
| baseline | motion-0.png | a788ba7c9ab5b760cdb1c87795a08dbc99ccfa0bf92b789f9483d986a00b85b6 |
| baseline | motion-1.png | 6aac2f97e0bfb7785d41f49a75ba2b3b0147879472ebb2e135977a794195cefd |
| baseline | motion-2.png | 4d6a461b16016e8193c416dab7c3ad5dd7bae401c63caf870d24ae01564f44ec |
| prototype1 | noon-crossing-block.png | 9ba06f672e85c41e5190ed897932605e7fcfd01b136872088bc9101bdc70bda7 |
| prototype1 | noon-crossing-lateral.png | 941b8c7791f6f6ab1993c027b1e71ffd417234a5e5d66ae2b23965f7df5c12fa |
| prototype1 | dusk-approach.png | fe62371f4d7f78b020aab8f770755a49237009201504ccf0655540d68f205ec7 |
| prototype1 | motion-0.png | a083be949cc5cfeeb24977fd4f4c122adad3ce05313db27fc5eca1d23058ba1d |
| prototype1 | motion-1.png | 7d9fb2ce7ac47c009d2a5076580ecbca16ab67ed3483023373dafac36d7db4ed |
| prototype1 | motion-2.png | 63dfcd96ceea708a6cf98579fd3765aa975118d9519e0700320e601c06ffbd00 |
