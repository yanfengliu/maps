# 1001 — commercial corner first runtime outcome

2026-10-14. Authored checkpoint of root's integrated checks and first candidate runtime. **Outcome: startup RED; candidate appearance DID NOT RUN.** The seven source-reviewed commercial files remain uncommitted in PRIMARY over accepted main `0cd564d`. No candidate appearance, final canonical visual gate, code commit or main behavior adoption is accepted.

[Integration receipt](C:/Users/38909/Documents/github/maps/artifacts/commercial-corner-20261014/accepted-baseline/integration.json), 2,419 bytes/SHA-256 `3dba2f1b09c55cc94abca45c01a6a947bed4e8f4b66f24e7b38582b3f24b50b1`, records the seven exact integrated files admitted by [993](C:/Users/38909/Documents/github/maps/docs/work/0_shibuya-1km/reviews/993_commercial-corner-source-rereview.md). All seven current lengths/hashes matched during this checkpoint; the pre-existing facade-emission test edit remains outside their scope.

| Integrated path | Bytes | SHA-256 |
| --- | ---: | --- |
| src/scene/commercial-corner.ts | 27,069 | `4151274f6fd9768c4efda836cbb514d081f1099e637c4ee62e71ddfb44ea9bf9` |
| src/scene/commercial-corner-recipe.ts | 12,724 | `4c3f7dcf1a0f242c1559843dad1244264a5c0e514e7b1898d3ffdb236c507090` |
| src/scene/facade-textures.ts | 18,867 | `42c82603d777ec0421c00afa58d2eb10aef0f3cd1af315555af50a49aa05d4fd` |
| src/render/post.ts | 15,146 | `a6811ed007d51edf4f8b4394e8cb3f306a21f62882f3c23b0fb3b7b664ac8dc6` |
| test/commercial-corner.test.ts | 21,354 | `e0b01b3651ed60bfd68c22469429f071e59443d2fbcc890b62c20e4d3d030e42` |
| test/crossing-corner-material.test.ts | 22,087 | `64290da165302cf2c2ba605cdff5301b1606e5852baffb6d603933a74c070f52` |
| src/scene/buildings.ts | 29,624 | `f7675e72b9e24dbd0d5d6d8579d82bbf42ccabc887126496cd65436f1e93495d` |

**Automated checks.** Root's [build](C:/Users/38909/Documents/github/maps/artifacts/commercial-corner-20261014/recovery/integrated-build.log) and [typecheck](C:/Users/38909/Documents/github/maps/artifacts/commercial-corner-20261014/recovery/integrated-typecheck.log) pass. Build reports 157 modules and 8.14 seconds, with its existing large-chunk warning. Fresh [audit](C:/Users/38909/Documents/github/maps/artifacts/commercial-corner-20261014/recovery/integrated-audit.log), 2,454 bytes/`84e6a0ac2fed103ad2a9cc07862831001ae1ce54dab49ee21c681084f1044a73`, exits 0 under the high-severity threshold: zero high/critical and two moderate findings, `@vitest/mocker` and `vitest`, under GHSA-82fw-gwwq-j7x9.

The [unit acceptance receipt](C:/Users/38909/Documents/github/maps/artifacts/commercial-corner-20261014/recovery/unit-suite-acceptance.json), 1,313 bytes/`3c69fdd2a6a3c09f7158fc22803e5d65e05d58446194bb2fe7b9c57652dcb129`, binds all four subsequent logs; their hashes matched here. Initial sandbox invocation did not load the Vitest config. Elevated default concurrency failed 13/1,154 cases, including the TEMP-inside-Git fixture error. With actual outside-Git TEMP and four workers, 1,151/1,154 passed with three timeouts. The three files pass 18/18 sequentially; the complete `npm test -- --maxWorkers=1 --minWorkers=1` then passes 125 files/1,154 tests in 475.13 seconds. Assertions and deadlines were unchanged. Earlier runs remain red; these results establish concurrency sensitivity, without proving a specific historical contention cause or product performance.

**Dispatch and runtime.** The first dispatch omitted the required empty output directory and refused before resource launch: DID NOT RUN. Automatic approval then rejected the corrected retry after 998 identified inherited Playwright debug aliases. The repaired caller received independent [999](C:/Users/38909/Documents/github/maps/docs/work/0_shibuya-1km/reviews/999_capture-process-safety-review.md) runtime admission under manifest `8172655b2192008c3b382567af855004485f8dfd9bac4ded77ebb7e6b4131949`, preserved in `capture/frozen-pre1003-runner/prepared-freeze.json`. Reviews 997/999 admit their source boundaries; they do not establish live runtime or appearance success.

The actual child runs 19:24:10.688–19:24:27.855 UTC at localhost port 4324. `OrbitDriver.waitForFirstFrame` refuses data518.b3dm: “Commercial corner face60 transformed plane/normal differs from reviewed data518/batch63.” It produces **zero PNGs**, no camera adjustments and no first-frame appearance evidence. The 341 before/after input records match exactly. The sealed child record reports `passed:false`, `unchanged:true` and all six closures true: page, context, browser, browserServer, server and esbuild. Its pinned GPU is RTX 4090/driver 616.64; that identity does not establish rendered candidate quality.

The following raw evidence remains under `C:/Users/38909/Documents/github/maps/artifacts/commercial-corner-20261014/capture/candidate/`:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| payload/capture.json | 327,624 | `24d5cb457c25044b04f162240a5a6b85ae0a8799146064faa1b03d0dd7f5a7d3` |
| run.log | 854 | `f4f72b85154ed9e2dec3e7e98c3e70fa25f419e338487db274621e1b54a74ec2` |
| run-errors.log | 178 | `08ff582804f1b8186ec82b6f59c1bb6446ad5dabea6fd8158b45c9ae1d5ae826` |
| process-cleanup.json | 9,053 | `dead8ab77756635adde64fcf8f2f71bcb57f7e83f48ed5fa044ba4e16fc0c1c9` |
| capture-completion.json | 2,260 | `6b0a7fedf49320321f27243a1edbb280a8f206a477cfb8044e5e4acd18ff730b` |
| root-closure.json | 4,240 | `7c1e368e9a19f881b61601ce7eff021d9cddd3ba9ec35c104edd54cff078631e` |
| root-temp-cleanup-preflight.json | 297 | `a07bbffcd78900e8226f8343e8e192d05248ffb03dd3fa3a0356f4df2e2fd076` |

**Closure observations.** The original outer completion remains RED: five recorded owned identities were checked, but final identity/edge evaluation refused an omitted node PID 40320 created 19:24:10.215 UTC with null `ExecutablePath`. It retained TEMP. Root's separate 19:26:49.272 UTC full census observes all nine recorded/omitted observations—seven unique PID/creation tuples—absent, no current historical-parent edges, no task-marked process and no port 4324 listener. Root then removed the unused TEMP after a one-entry census with zero links/errors; its target is absent at this checkpoint. These later observations release resources within their recorded scope; they do not recertify the original failed records or authorize killing from historical edges.

**Remaining work.** The source worker reports that installed GLTFLoader decomposes/recomposes a slightly nonorthogonal published matrix, producing about 3.075 mm displacement against the 20 µm position guard. This is a worker-reported diagnosis under investigation, without an accepted fix or root-cause proof in this checkpoint; 1002 owns subsequent repair evidence. Capture 1003 prepares the absent-versus-live unknown-path correction under freeze `9d5d856792de44b077a35c9796a97c1aae31b529fd15d66675e3d231c02020dd`, pending independent review, without recertifying this run. [1000](C:/Users/38909/Documents/github/maps/docs/work/0_shibuya-1km/reviews/1000_canonical-wrapper-rereview.md) now accepts the separate canonical 998 safety repairs for later dispatch, source only. Candidate acceptance and root authorization still precede that gate. Fresh candidate runtime, native appearance, final 44 frames/three lifecycle checks and integrated adoption remain open. Custom HTTP certification and historical request 218 attribution remain unavailable.

Only this authored report was written for 1001. The author read and hashed evidence, launched no browser or gate, ran no tests and changed no source, configuration, Git state or other status document.
