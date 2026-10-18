# 1475 — train PRIMARY gates; appearance HOLD

2026-10-17. PRIMARY base `ea98b89f0ae8286ce6c8ffa003a2816e201019b1`, with nine integrated/staged candidate files, remains uncommitted. Candidate freeze SHA-256 `c36361749b9952f9c39c62880aa101bf02a9eda00c64648d231d9b1418249be8`; integration receipt SHA-256 `740954507e3decd5921414c9c0c8f5d538e3f77dba0bfc7ed14417c010596301`.

Overall appearance is **HOLD**, and merge is pending an accepted AA repair. Root and independent appearance review reported severely jagged crossing stripes in `hero/hero-satellite-dusk-crossing.png`, SHA-256 `199e7f1feda40e4ef81d3981896f28be07541bf40749c0f95cc9873c6da37fe4`, compared with the retained ff28 baseline identified by root. This report records that review outcome; the gate worker did not independently inspect the native originals or determine the cause. Automated gate success does not resolve this material visual finding.

All five public commands ran once, serially, from PRIMARY with `C:/Program Files/nodejs/node.exe`, its installed `npm-cli.js`, and Node v24.12.0. Each exited 0. Times below are the recorded supervisor wall durations, including cleanup, rather than CPU timings.

| Public command | Seconds | Bound |
| --- | ---: | --- |
| `npm run build` | 6.291 | PASS; existing large-chunk warning |
| `npm run typecheck` | 11.248 | PASS |
| `npm test` | 127.497 | PASS; 136 files / 1,183 tests; suite 124.53 s |
| `npm run visual` | 364.290 | PASS; 44 fresh native 1280×720 frames and three hardware lifecycle runs |
| `npm run audit` | 3.927 | PASS at high threshold; two existing moderate Vitest/mocker advisories |

The unchanged canonical visual supervisor used `-RunName train1473-final` with its finite 1,200 s ceiling. The four nonvisual commands reused its ownership, CIM, finally cleanup and external TEMP implementation through a narrow argument/output/300 s/certificate-tail adaptation. Original and adapted SHA-256 values plus the small parameter diff remain in `artifacts/train1473/primary-gates/preflight.json` and `supervisor-parameters.diff`. No assertion, per-test deadline or public gate was weakened. No gate failure or retry occurred.

Visual run `ee8d31ba8462842f` certified RTX 4090 / driver 616.64 on the same hardware renderer in both lanes. Certificate SHA-256 is `a5539c6d47f43c3adcc8dc238175495041b3e0585f156e826e1e828ac9c7af21`. All three lifecycle records have empty console/page-error lists and completed outgoing teardown. Scene: 156 files / 364,187,965 bytes, digest `288997c50656c4adc6300b42beaa52903247b6c55e8cf22beb314954f4f32e62`. Harness: 25 files / 224,465 bytes, digest `78b2c9bffa0ee72da64e0ff5f407467e952687d54d52882b53b8732afe662467`.

The final actual-byte readback found zero changes across 622 frozen inputs, verified every certified PNG hash and native dimensions, and matched all four built-file hashes plus the complete served scene and harness digests. `artifacts/train1473/primary-gates/final-seal.json` SHA-256 `3d6600ee143cd0e5c9d5f796319b8f78f199ff323ccd48585c4bf315e27d24ff` retains the exact records. The root-owned plan status edit was outside that frozen executable/test/data/harness set.

All five supervisor final censuses passed and all five literal external nonlinked TEMP directories were removed after zero-reparse/error checks. A fresh census checked 120 recorded PID/birth/executable identities: zero exact survivors, zero task TEMP markers and zero port 4319 listeners. These are observed-identity bounds; never-observed descendants are outside the supervisor's 200 ms inventories. Protected AGENTS raw SHA-256 `3009aa563a6d4199646a12ff7832741d585f6c08ee80e3397f68aeb718787df3` and facade-emission test raw SHA-256 `48a3d4d9c0ae833c2fe12082ba59c8fd32335e062de76f062f8508496a3fc52a` were unchanged. User snapshot991 was untouched; gallery files remain ignored and never Git.

The inspected candidate1 public evidence is retained under `artifacts/train1473/candidate1-public-visual/`, with the original directory layout, certificate, manifests, ledgers, all 44 certificate-named frames, both actual Cartographic return originals, run metadata and exactly three certificate-named lifecycle records. This preserves the 22 Satellite and two return originals needed for the 24-image native review. Original manifest paths and bytes are verbatim; no rescoring occurred. `artifacts/train1473/candidate1-public-visual-preservation.json` records the nonfollowing source census and original-before/original-after/copied SHA-256 equality. Historical top-level frames and unrelated earlier lifecycle records were excluded.

Remote CI was **NOT RUN** because this candidate is uncommitted. Continuous motion/collision, full population/FPS, full-AOI quality, appearance acceptance and main adoption are not established by these five passes. The AA repair worker owns diagnosis and repair; future acceptance must name its actual changed source and evidence. Existing gate records remain unchanged.
