# 648 — Startup integrated review

2026-10-11. Fresh independent read-only review of the four startup files installed in PRIMARY, against main base `5661d0c35761f9ccbbd906a7bd8ee4cb8a7c2cca`. No blocking source finding was found. Admit this exact source and dependency graph to the remaining qualification. This is source and actual CPU evidence acceptance, not all-five, fresh visual or main acceptance.

PRIMARY HEAD remains `5661d0c35761f9ccbbd906a7bd8ee4cb8a7c2cca`. FRONTAGE HEAD inspected was `9d26348041d0e1e2ff308583ada21319756e410e`. The LUT checkpoint is unmerged `883288994343eb4fc8533d3e0e439f11355fcbfc`; the two dependency manifests are adopted working-tree bytes, not a landed code revision. The review excludes the foreign PRIMARY AGENTS change and unrelated paths. Status-only source markers do not enlarge this four-file scope. PRIMARY's new sign-mask test is untracked and its exact bytes match the checkpoint.

| Actual PRIMARY file | Inspected raw SHA-256 |
| --- | --- |
| `src/scene/signage.ts` | `e39d0d2e3334877e910a9a9fc81234773458610d056ba8721a89540ca4153318` |
| `test/sign-mask.test.ts` | `f829e3f96308fe1f67efa8712242f5808f4714f900a64856dac67106aefa1e3e` |
| `package.json` | `e702a434fade1b82d52796c1a7085a5363c3dd2fa7d1ffc61dc863ba37271ef2` |
| `package-lock.json` | `abd8e25271671d985581c9a3363220dec5760d9f0694f1e1e302feff3509159a` |

The actual AGENTS, local rules, lessons and progress board were read, together with 632, 634, 638, 640 and 645. This review examined the actual baseline diff and current source, tests, manifests, installed package metadata and CPU records. It ran no gate, install, browser, server or runtime probe. This authored review is its only write.

## LUT equivalence and scope

The fast path is selected only by identity with the frozen `PLATEAU_SIGN_MASK` object and a complete RGBA buffer. Ordinary facade defaults retain that identity. The production caller still writes the mask before GPU de-lighting. For the supported eight-bit arrays, every RGB input has one of the 32,896 reachable `(max,min)` pairs. Each table entry repeats the baseline divisions, smoothstep calls, multiplication and maximum selection. Float64 storage retains the original double response. Alpha rounding, strict `mask > 0.5`, pixel traversal and double summation order remain unchanged. Unfilled table entries are unreachable under this contract.

Copied or custom settings retain the original loop, including per-pixel getter reads, nonfinite and degenerate thresholds. Incomplete buffers retain the baseline tail and count behavior. Empty buffers return unchanged empty statistics, though the first default call now constructs the table. Its fixed retained cost is 512 KiB per module instance; construction is lazy and synchronous, with no added texture, GPU or process lifetime.

The new test's independent literal thresholds and copied pre-change loop do not call the production response helper or inspect its table. It checks all extrema responses individually, channel and middle-value permutations in both array types, overwritten alpha, ordered statistics, incomplete buffers and custom/getter cases. Its literal boundary values and frozen-settings assertion would detect a threshold change. The change preserves numerical output rather than changing source eligibility or appearance. Historical warm component timing in 580 does not establish machine-cold startup, GPU completion, population performance or the cause of earlier stalls.

## Dependency graph and actual CPU evidence

Independent parsing of the actual LF lock against the baseline found 125 package rows with exactly two changed rows: source-map-js 1.2.1 to 1.2.2 and Tinypool 1.1.1 to 2.1.2. The lock header, package keys, other rows and dependency edges are unchanged. The package manifest only adds the two overrides; no original field or direct range changes. The only consumer edges are Vitest 3.2.7 to Tinypool and PostCSS 8.5.28 to source-map-js. The selectors match the unchanged direct Vitest range and exact current PostCSS version. Both replacement packages add no runtime dependencies. Node 24 satisfies the new Tinypool engine bound.

The inspected live package metadata and actual installed-consumer receipt resolve Vitest 3.2.7, Tinypool 2.1.2, PostCSS 8.5.28 and source-map-js 1.2.2 under the real PRIMARY `node_modules`. The adoption receipt records one successful `npm ci --ignore-scripts --no-audit --no-fund`, exact manifest hashes and retention of the prior dependency directory for rollback. This review did not repeat installation or audit the entire retained tree. The independently accepted 638/640 private source, archive-integrity, forks/threads and PostCSS proof remains bounded support for the cross-major override; it does not cover every upstream feature or security behavior.

I read all four actual CPU logs and independently rehashed each against `artifacts/mask632/live/cpu-gates.json`; all match. Recorded Node is 24.12.0. The owned Vitest configuration imports canonical configuration and adds only the explicit PRIMARY root, owned cache directory and `test.cache=false`; it preserves test selection and worker settings.

| Actual PRIMARY command | Exit | Recorded command time |
| --- | --- | --- |
| `npm run build` | 0 | 5.302 s |
| `npm run typecheck` | 0 | 9.607 s |
| `npm test -- --config <owned live/vitest.config.mjs> --configLoader runner` | 0 | 143.175 s |
| `npm run audit` | 0 | 5.841 s |

Vitest reports 120 passed files and 1,065 passed tests. Its own duration is 140.43 s. The high-threshold audit reports two moderate Vitest/mocker findings and no high or critical finding; it is not an all-severity clean audit. The existing large-chunk and experimental type-transform warnings remain. No dependency force fix or direct major upgrade is included.

The actual before/after CPU records compare equal for all 452 recorded source rows, all four candidate hashes, HEAD, raw index and empty staging. The after record reports unchanged mounted-data and installed-input pins. This review compared those records and checked the four current candidate bytes; it did not independently traverse and hash the whole source/data/dependency population.

| Inspected artifact under `artifacts/mask632/live/` | SHA-256 |
| --- | --- |
| `adoption.json` | `159b40f7a3e7dedec4424c742ac45d4b6037e2ecd8b18b981ad11f0f4fbb8e0c` |
| `installed-consumers.json` | `a72b51eb3691ec7e22cd18ca2b8e715fee3502cf188b50a35c7c442f6714d57a` |
| `cpu-gates.json` | `61800f3b1c7b5bd21744980e23d2d6c65627e1f4108061cb2f104387285bd2b5` |
| `before-cpu.json` | `5addec700306e1e641eeba77e3d497c59e8479c1f9d26aa72510741ac1776384` |
| `after-cpu.json` | `a2e6fc0fa05b38f3b4cf2fd59532ace5a40d386a75e8fbd7fa9f92a66efe3752` |
| `cpu-owned/process-cleanup.json` | `74a3ad43a5fdfb6502080351ebe5b9e9eabc6051d5ba6ea9f1394ee25b40136d` |
| `cpu-owned/process-closure-census.json` | `fecae1c83ac1d872fcdc33d3e9b4fe368ae61d22642ced0f444d8fa5e6b5f0b3` |

## Remaining acceptance

The original CPU wrapper cleanup is red, exit 1. It records PID 60804 exiting before `GetProcessById` could acquire its handle, an available census and `temporaryRemoved: false`. Four successful package commands do not erase that refusal. Root owns the separate closure and TEMP/cache cleanup supplement; this initial review does not accept it before inspection.

The 632 canonical run and 634 inspection of all 22 native Satellite originals are historical acceptance for this exact LUT on the earlier dependencies. They do not establish a new visual run on the adopted graph. Fresh canonical 44-frame/three-hardware-lifecycle certification, required native Satellite acceptance and basic style/control acceptance remain pending, followed by exact integrated revision binding and main integration. No current all-five or main acceptance is claimed. The full-map, population/FPS and temporal requirements remain outside this startup milestone.

The shared dependency reader lease is released. No reviewer-owned browser, GUI, server, daemon, runtime process or temporary artifact was created. The reviewer remains available for a focused visual/closure addendum after root supplies the completed evidence.

## Final gate and native round — 2026-10-11

Accept the exact four-file startup increment on the adopted dependency graph for integration. No blocking source or visible startup regression remains within this review's bound. All five required package commands now pass, with the two moderate audit findings disclosed above. The later evidence below closes this review's earlier CPU resource and fresh visual conditions. It does not rewrite the historical red wrapper receipt or establish a main merge. PRIMARY's recorded gate HEAD is still `5661d0c35761f9ccbbd906a7bd8ee4cb8a7c2cca`, with the four reviewed working-tree hashes unchanged on the final read.

The actual CPU closure supplement's `completed.json` SHA-256 is `6549a5af2e6f2741c9bf4021fba6fcb1e90a37343ad7139c2b5866f964fe8eee`. All seven original receipt/helper pins were independently rehashed and match, including both red receipts. Fresh available before/after records contain no present observed PID, PID 60804, descendant, marker or 4319/4335 listener. Their SHAs are `5df13e994d24a1c0a91df64b4955af5b4552940a0ad5ea18ed0432335252edc5` and `686fcd74e2eac5a8d7f7cdfeecb76b3dfa4bbe59a3de5485bf7440ac45827a4c`. This proves current absence, without inventing the missing historical creation identity.

The supplement removed the exact leftover CPU TEMP and cache through complete nonfollowing traversals: 1,178 TEMP entries and 485 cache entries, each with zero reparses. Census SHAs are `a0f99ca70bad08bc1bf18d1f92e31da40df313eec426f2f5e78e3bb84f0a58f5` and `57497577e20de0d2004c2108c8d68026250d1c4d9a7ee6fc43e54cf26b3d400e`. I read the actual cleanup and preservation body plus completion records. They preserve source/index/data/installed pins before and after cleanup, run no CPU gate again and attempt no kill. The original refusal remains preserved; its present resource condition is resolved.

The fresh canonical `npm run visual` passed and certified run `5810760abd3db903`. Certificate SHA-256 is `fd60f3e80870c2de3ac57108d1414417f24dce92e4534bc4df60e12acc4936f0`. Its recorded interval is 2026-10-11T08:41:29.109Z to 08:45:29.985Z. It names all 44 fresh frames, RTX 4090/driver 616.64, the hardware ANGLE renderer and three completed lifecycle records with empty console/page-error lists. I read and hashed all three actual lifecycle files: navigation/replacement pairs are 188/13,539 ms, 198/12,314 ms and 192/15,368 ms, matching the certificate. Their SHAs are `3645a677b8be1c1941900d3b943c169a045f222a0801f6eab5d0640d4c42d9d6`, `0e7fafa050a1ee0019c65e7e0d7c7360752d7a9288103d405f7f87f4ea753757` and `99da2bae23427e6b64a592e68657f2c27d6d039ce0dd56788c9dbdbe13bb0d25`.

The actual before/after visual records compare equal for 452 source rows, all four candidates, six dist rows, HEAD, index `610c2cd31f6bc168304220e63ee17234d86440476694d5e8e09ec51dc5408dd0` and empty staging. They report unchanged mounted-data and installed-input pins. Their SHAs are `18a629ff2e1f27bf08f0e31c757d00c7912903d56606a738cd10b588f3e027a0` and `c118a2114bb1d83e301deb7b492afd238362929cb6e91b2b308462c047bb7a52`. The certificate retains the same 151 served files and scene digest `dfa01d585ff5147745d2ce6e642179d820af89b4d986c0df89cee258247545ce`, plus the same 24-file harness digest `8f22bf47a0fe20f9c040010e11de6010834a33505feee07848f064da52e9c3c8`. These are inspected bindings and records, not a second independent full-tree census.

Visual owner cleanup exits 0, removes TEMP and has an available closure census: all 40 admitted identities and 28 omitted observations are absent, with no live admitted/omitted identity, descendant, ownership uncertainty, marker or port listener. Cleanup SHA is `90af56ede1bdadc5fa728049b39502530257b82bf8d711e658aa28b05d1b3969`; census SHA is `3df82b9662f9eb4c91e07dae23a637aa83a5942e4f613ea945d81a86dbd6aa78`. The separate seven-entry zero-reparse owned-cache removal receipt is `3590bac90f062adcc8a6f39c7fda4621817e944e12b9423e2251fb96a20984c2`. This reviewer inspected the actual owner records, without reconstructing a separate historical process census.

### Native appearance acceptance

All 22 Satellite originals are individually inspected at native 1280×720 across the two reviewers. This reviewer personally opened the four Satellite heroes and six Satellite plaza views, plus four Cartographic heroes for basic regression. Fresh reviewer `/root/satellite_outer_native_review` exclusively opened the six Satellite block and six overhead originals; its exact-byte bounded acceptance is [649](649_satellite-outer-native-review.md), SHA-256 `ad09702b82717e58d8e7255004791d2e147e78941368b91810273ec3809fc2e3`. I read that actual report and verified all twelve listed hashes against the current bytes, manifest and certificate. I did not personally open its twelve originals. No contact sheet or thumbnail supplied either verdict.

All 26 reviewed PNG dimensions were independently read from their headers. I hashed all 26 before viewing, after my fourteen and after accepting 649; every digest remains unchanged and matches its specification manifest and final certificate. The hero manifest SHA is `2f1345b11ee92822318df408fd9157a418fbc17994f43b1b698090d5b82eb954`; Satellite sweep manifest SHA is `dd80128b68ae67d1fa47aac1a3ea9dbf28c8177e0309f6f573a68ab24e169ff2`. Both and the certificate remain unchanged. The twelve outer-image pins are permanently listed in 649. This review's fourteen personally inspected originals are:

| Original under PRIMARY `artifacts/visual/` | SHA-256 |
| --- | --- |
| `hero/hero-satellite-dusk-crossing.png` | `388d85bff3fcd4b0bf145ad80cb16ffc126a0b31d4b5431b3497f422de25c946` |
| `hero/hero-satellite-dusk-approach.png` | `2db6b3c39103db148c1db8e5eacdea4b7a2206327f75e67815a668ed3174a56a` |
| `hero/hero-satellite-noon-crossing.png` | `8918ec347fe01ea4a638c52052c41a9574d5e4c92f7b892b30919b5bb5e7266f` |
| `hero/hero-satellite-noon-approach.png` | `a0d8f32d094d6b563b6e30f605c5d406059ba7603d3d77a9afd3cccf6a85d4d2` |
| `sweep/satellite/plaza-az000.png` | `e3b0d60ec794d5cb1056d0f8dd0c9e37a13b07f8a051484e0a2d5ae9f43c83e2` |
| `sweep/satellite/plaza-az060.png` | `3a45bd81e06452f19b556a68e1cd86925e4f119b453aaa666bd0c282b1f11790` |
| `sweep/satellite/plaza-az120.png` | `643e98618f3001ce3964265406ceb814887f522deba177e3d0c501964fa7f135` |
| `sweep/satellite/plaza-az180.png` | `6a65eb7bdb6840dfab653c8e778890161bcafb07a7a704b69230d453eaa8fbda` |
| `sweep/satellite/plaza-az240.png` | `0a7ad2be80576d765e0997b186798cdb4952aa069428a9ad09e0d26266f2d104` |
| `sweep/satellite/plaza-az300.png` | `6c84fdec7db785f3c06c43d322e64359322c59915eca6c4b1fbc3e665e837dff` |
| `hero/hero-cartographic-dusk-crossing.png` | `925c03b4b5b39c6df7bd6e9c9a9ef79714ceff1e286e16d611202e38023a871b` |
| `hero/hero-cartographic-dusk-approach.png` | `603c266ef6b662a56cad367e296e67331ca832bc1cf7f6582db1a2b20086c37b` |
| `hero/hero-cartographic-noon-crossing.png` | `10c530013663960156b33ab1a8518200a7d3234382cd1a46ad13226627254fe4` |
| `hero/hero-cartographic-noon-approach.png` | `5c5c6648c9e590e3327127213daf4ecf78978b6ddebdd7f5fc63177b932569db` |

The personally inspected Satellite views show loaded photographic facades and signs, coherent crossing paint and visible roof/rail geometry. Noon/dusk presentation remains distinct. The six plaza bearings expose the surrounding crossing at 45 m and 1.5 rad polar angle. 649 accepts its outer static views at 220/950 m and 1.28/0.62 rad, including the disclosed tower-obscured block 060° view. No material visible failure attributable to this startup increment was found. The four Cartographic heroes show intact geometry, readable style UI and the expected material switch. The actual hero record also shows two Satellite-to-Cartographic returns with exactly equal before/after camera values. Their return screenshots were not part of my fourteen-image inspection; the return observation is recorded gate evidence. Detailed Cartographic quality remains deferred.

This closes the new graph's static Satellite regression qualification, replacing reliance on the older 632/634 frame family. Historical originals were not reopened and no paired pixel-equality proof or visible quality gain is claimed. The familiar soft, flat facades, pole-like close trees, sparse streets and isolated bright dusk pools remain visible. 649 retains the foreground-tower coverage limit and cannot establish camera penetration from pixels. These are continuing whole-map limits, not solved by numerical mask equivalence.

Main merge, push and remote acceptance are still root's integration work. Machine-cold startup, general startup savings, GPU completion time at startup, the earlier Draco request-abort cause, populated agent continuity, 3,000 pedestrians/200 vehicles at 60 fps and 1920×1080, seeded traversal, temporal appearance and complete-map acceptance are unqualified by these static frames. The separate tree pilot remains visually unaccepted. All reviewer read leases are released. No reviewer-owned runtime resource or temporary artifact was created; only this LF addendum was authored.
