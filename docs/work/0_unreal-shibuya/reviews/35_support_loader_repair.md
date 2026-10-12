# Review 35 — support loader numeric admission and diagnostics

Reviewed 2026-10-11 by the independent Astra/xhigh reviewer. This is a focused review of the R31/R32 repair in the runtime worker, based on the retained World source, its complete repair diff, adjacent production calls, installed UE Json implementation, and retained standalone native API evidence. R31 and R32 are closed for this exact implementation. No new material production finding was identified. This is not approval of final source publication, complete World.LoadNetwork execution, WorldReady, native collision, ordinary controls, contacts, or performance.

## Exact target and conservation

Worker root: `C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree`. The frozen evidence directory is `Artifacts/runtime-motion-diagnosis/support-loader-r31-r32`. The reviewer independently rehashed the inventory, all 18 listed evidence and failed-attempt files, the cleanup census, the live World/Core files, and all 21 source/library/fixture bindings in the successful probe receipt. They matched the declared digests at review completion. The live World matched the retained after.cpp; no target change was observed during this review. Only this report was written by the reviewer.

| Target or evidence | Bytes | SHA-256 |
| --- | ---: | --- |
| inventory-final.json | 7362 | `4ca06b3decf6895473f762486ddbe140e41aa826affb17abc5897d4b354fe840` |
| before.cpp — review33 World | 45654 | `59e3afab06eae1073c939ae7264b7ea1b0a4c14c6b2e912b334bb78edb02aaeb` |
| after.cpp — repaired World | 48066 | `0532f2a00588b362f9204ae252d364425eabe2f49c168caf5b60a955044953b1` |
| repair.diff | 8425 | `ca557d54f59498521a4b8703e7f142f7330b585e35c07f38d914bfc0ae89b3cc` |
| json-probe/extraction.json | 2181 | `e8eb0c88c201d4a8bbc23c4969ddbce2f16bff4c1c0edaeeda25d507221cdb03` |
| json-probe/report.json | 12884 | `9df4e3ac78dd77bf51225444d41d20d8fffbef03b1d1b0219389ab83a12dada3` |
| json-probe/before.cpp | 9947 | `476e81905116f855b5b55f36a288340e26d2c87bde735a8c65d977e7421f2d61` |
| json-probe/after.cpp | 12251 | `ad4173be8ae3c5f9073afa85790f22755d83562b20da1c73fbf05a0f9555b18a` |
| json-probe/before-run.log | 3795 | `2756f6ea7e90781f0f132a097674347493e3d0f9a388c3d055c356b987bdf066` |
| json-probe/after-run.log | 9483 | `15b54abd13ea644de5bfa78125f6106fbb43a05be2b60379be1ae7f3af17fb7e` |
| json-probe/before.exe | 114688 | `95c360eee5478f8952afaae67514e77b5118caed54fbf352cf0d14fc676469b8` |
| json-probe/after.exe | 118784 | `75fff2d401ad59f9801d65b692630b1efa61f5e2586d51415765f0a5a83a8432` |

The World delta changes the numeric helpers, their new support/derived-record callers, and adjacent record/file diagnostics. The suffix beginning with `AShibuyaExplorer::AShibuyaExplorer()` is identical between retained before/after files, preserving review32's pawn implementation. Core remains `956092133aaa4c4c4868894fe23a1ca9c0f1dc306aec745cf41b7ba4b06ed746`. There is no source-data writer, geometry edit, movement setter, raw-DEM fallback, or floor override in this repair.

## R31 — closed: require actual JSON numbers before conversion

[StrictNumber at after.cpp:77](C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/Artifacts/runtime-motion-diagnosis/support-loader-r31-r32/after.cpp:77) now requires a present `EJson::Number` and a finite value before returning it. [StrictPoint at line120](C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/Artifacts/runtime-motion-diagnosis/support-loader-r31-r32/after.cpp:120) requires an array of exactly three present number-typed finite values before calling the existing point conversion. Neither helper can accept boolean or numeric-string coercion.

The changed production callers use these helpers: record `bytes`/`size` at line199, support `schema_version` at line238, derived `triangles`/`vertices` at line261, and both derived bound points at line266. The existing whole-number byte range 1–33,554,432, schema version equality, count limits, minimum three vertices, ordered bounds, and horizontal/vertical limits remain in place. Reading the complete caller sequence confirms the helpers are used for the added fields, rather than merely existing beside the former calls.

`SameJSON` at lines129–148 remains unchanged. Its recursive type equality correctly distinguishes a string or boolean from a number; R31 concerned two matching, wrongly typed records subsequently passing a coercing accessor. The repair addresses required field types without weakening the structural manifest/source/frame/origin/datum/road comparisons or changing valid numeric values. Legacy route fields outside this repair still use the existing accessor; this review does not claim a global JSON-schema rewrite.

Primary source read outside the diff: installed [JsonObject.cpp:420](<C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/Json/Private/Dom/JsonObject.cpp:420>) delegates numeric field conversion to the value. [JsonValue.cpp:476](<C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/Json/Private/Dom/JsonValue.cpp:476>) converts booleans to 1/0, and [JsonValue.h:451](<C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/Json/Public/Dom/JsonValue.h:451>) converts numeric strings. These real APIs substantiate both the original defect and the need for the explicit type check.

## R32 — closed: actionable object, file, size and digest failures

[ObjectField at line103](C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/Artifacts/runtime-motion-diagnosis/support-loader-r31-r32/after.cpp:103) now names the required object record and directs restoration or regeneration/review of the complete source manifests. Missing or wrongly typed support_surface, derived_terrain, original_network, base_manifest, original_terrain, original_terrain_photo, atlas and native_ray_samples records therefore identify their failing field.

[ReadBoundInput at line42](C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/Artifacts/runtime-motion-diagnosis/support-loader-r31-r32/after.cpp:42) wraps bounded-reader failures with the input path, expected size and digest, recovery instruction, and underlying cause. A content mismatch reports the path and actual/admitted hashes. `AdmitRecord` at lines194–204 adds the input path to invalid path/digest and size errors, names the whole-byte range, and applies StrictNumber before conversion/allocation. No exception path converts failure into admission, and digest/size maps are updated only after a successful read and digest comparison.

The unchanged complete [RuntimeFiles.cpp](C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/Source/ShibuyaRuntime/Private/RuntimeFiles.cpp) was read outside the diff. It still checks safe relative paths and every existing drive/root/descendant component for reparses, bounds size before allocation, validates open/read/final sizes, and releases the reader through its owning pointer. Its hash is `27ca306967d5844cb43f4b2e746e50e71911d59e7aad064230f02b1d33b302c4`. The new diagnostic wrapper preserves these checks and their causes. This is not a new kernel-race resistance claim.

## Actual probe identity and its precise limits

The reviewer read the complete before/after probe sources, driver, compile commands, response-file settings, receipt and run logs. The probe uses installed Unreal JSON parsing and the unchanged production file reader, not a substitute parser. Its compile commands build the extracted helper/lambda and RuntimeFiles.cpp with the actual Core/Json import libraries and bcrypt. It uses `/utf-8`, `/EHsc`, `/fp:precise` and the runtime definitions. The actual run logs report loaded DLL paths under `C:/Program Files/Epic Games/UE_5.8/Engine/Binaries/Win64`.

| Native binding or harness | SHA-256 |
| --- | --- |
| UnrealEditor-Core.lib | `6440395dcdc9144fac7d0d5d6a3d141789f4a9b1eaaa8a14052b2bd35aead901` |
| UnrealEditor-Json.lib | `f93896df67b6d61bcf3f0712010946474710eb21e387a52775fdd7669c113606` |
| UnrealEditor-Core.dll | `4e623a427ea6737d48dffd237292e00de8106fab0f8839f22118f1fb2d5acdfc` |
| UnrealEditor-Json.dll | `077404f80628066a0dba0f876ce84749dafeca25d40b8d895203dfdb1606e87d` |
| json-probe/common.rsp | `8faf0c17482ef8192f1de515eeff18a0cba365f338892f0d6390c5d02bc5a611` |
| json-probe/run_probe.py | `a76d70daabc53b54bd695335c6513e345360825c2d4cde4b755be389c83f7931` |
| json-probe/before.cmd | `594f1b148ee6fe0869bcc9595428f8aba909b7cb0782999771ab64e9725ec66d` |
| json-probe/after.cmd | `7289332a75941bf22d0e4e745ddec5612b3bfa09687b48435932536c76dee717` |

The repaired production helper extraction and compiled probe contain identical text after ordinary CRLF/LF normalization: helper digest `47f2b0c0c09eba30e9ec6ed0f4afe876e40ff28486c1437b82853269c0d0b272`; AdmitRecord digest `198583bcef1786dcc5f159022a518943fa329f9aa57d14c7c9d6ef08f2782d00`, including its eight leading spaces and final newline. These were independently recomputed from retained after.cpp, then found exactly in the compiled probe source. The before helper extraction likewise matches digest `15ece7cd78f78352d807b2eee75850d26e400a26b71b7260085cf1b0c0e5291b`.

One qualification corrects the handoff's blanket exact-extraction wording: the before lambda's old size-error en dash was encoding-transformed to `â€“` in the compiled probe. Decoding the retained old production source as Windows-1252 reproduces the recorded extraction digest `0647f587c5c2d2d35638c3abf3aff100762c21f6c2c60d0b79c818336f2b8bb6`; comparison against the probe identifies only that diagnostic literal difference. Every predicate, call, return and other line in that lambda is unchanged. This does not change the 58 test decisions or the required diagnostic substrings, but the before lambda must not be called byte-identical to the compiled probe. The repaired lambda and helpers do have the exact identity described above.

The actual successful receipt records before compile exit0, before run exit1 with 58 checks/43 errors, after compile exit0, and after run exit0 with 58 checks/0 errors. The cases cover three scalar field names across numeric/boolean/string/null tokens; all three point coordinates across those tokens; both record size field names using an actual one-byte file; missing/wrongly typed forms of eight required objects; and actual wrong-hash/missing-file failures. The unchanged valid file is `x`, SHA-256 `2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881`. Both arms retain the same valid numeric/file inputs. Actual error logs identify the precise fields or file paths and regeneration action in the repaired arm.

Those 43 before errors are failed helper-level expectations, not 43 demonstrated full-loader admissions. For example, the probe intentionally calls the numeric helper with `vertices=1`; the complete production loader separately requires at least three vertices. The probe does not execute whole-manifest equality, schema/range combination, GLB validation, or World.LoadNetwork. Full production callers were reviewed statically. No final generated source dataset is accepted through this fixture.

The first two harness failures remain truthful failed evidence: attempt1 could not invoke its quoted compile command, and attempt2 collided with Unreal's `check` macro in the probe's local test function. Their reports are false with unchanged bindings, respectively `25ea69930ffd91027178aa5512789d88c47489d8f9b3cc41c5e6398f2204a64e` and `9ba45f4892222e6af1651773abf5a29fbfba511a220b62910d33488cdc7a4848`. They do not count as production red controls or successful compilation. The retained final logs show both actual compilations completing without those failures.

The successful driver uses the previously reviewed owned Windows Job launcher, assignment before resume, a 120-second deadline, and finally cleanup for each compile/run process. Its four rows report verified empty Jobs. The retained actual process census is `005d1cb6943ee23cee758372af242233e73451f37cea6ebccafa715a18b90e46`, with remaining `[]`. The reviewer launched no compiler, test executable, engine, UBT, browser, or native gate and owns no persistent process.

## Acceptance boundary

R31 and R32 are resolved for World SHA-256 `0532f2a00588b362f9204ae252d364425eabe2f49c168caf5b60a955044953b1`, supported by exact repaired helper extraction, actual installed UE JSON behavior and static production caller review. Final source publication is still refused separately. The complete loader must still admit the final reviewed derived terrain/support/original-source records, reject actual missing/changed integrated inputs and internally consistent malformed manifests, and complete the required native scene/controls/contact gates. This report grants no native lease and does not close collision findings R33–R36 or infer successful terrain/road coverage from the helper probe.
