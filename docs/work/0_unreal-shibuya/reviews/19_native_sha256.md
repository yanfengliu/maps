# Review 19 — Windows native SHA-256 repair

Independent Astra/xhigh focused read-only review, 2026-10-11. The target is the frozen Windows SHA-256 repair in the isolated runtime checkout `C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree`, based on `33d386299ff7bd02d91bca38f655f41597ddb756`. The review covers both changed files, the complete changed functions and all hash call sites, the unchanged bounded-input reader, installed Windows SDK/UE primary definitions, and the supplied compile/old-native-failure evidence. The owner branch exception and fresh Unreal local rules apply.

## Verdict and acceptance bound

**No material finding in this bounded revision.** The repair uses the installed Windows CNG SHA-256 implementation, checks its status values, closes the opened provider before propagating hash failure or returning a digest, preserves full input bytes and the existing receipt comparisons, and runs independent fixed known values through the same helper before admitting source files. The explicit `bcrypt.lib` link matches the Windows API dependency. No custom cryptographic primitive, external package, source-digest relaxation or platform fallback is introduced.

The supplied Editor and Game builds passed against these source hashes. They prove compilation/linking, not execution of CNG, known-vector success, source-file admission, Game inventory, controls or performance. At this report's handoff, the repaired native boot and actual known-vector/source-digest receipt are pending. This source review allows the integration owner to proceed to that gate; it is not a native acceptance result.

## Exact target, diff and retention

The source was diffed against the byte-retained previously reviewed files from round 13. `ShibuyaWorld.cpp` changes only its Windows/CNG includes, `HashBytes`, and the two known-vector checks at the beginning of `LoadNetwork`. `ShibuyaRuntime.Build.cs` changes only the added system-library link at line 9. No simulation, input, route, source format, path admission, renderer or save logic was changed.

| Authored target | Bytes | SHA-256 | Previously reviewed SHA-256 |
| --- | ---: | --- | --- |
| `Source/ShibuyaRuntime/Private/ShibuyaWorld.cpp` | 36891 | `719e89d5105961fa8a2dfd119dda326fcff94e780b995a2d222efb63afa76c2d` | `519e87dda255ce0c1ed35cada662ba333b5828be0949cbd2ba7d098653bdd0fd` |
| `Source/ShibuyaRuntime/ShibuyaRuntime.Build.cs` | 464 | `e43bc7eba792d78cdf5f8a9877dc8cb1f656b9ec4969608466079711358efff5` | `65a962e873ec7305f91296ee5777c2f7ee8255319ec4d8a4018c51054ec8d4e3` |

The frozen worker inventory is `Artifacts/runtime-build/native-sha256-repair-prepared-20261011/inventory.json`, 1039 bytes, SHA-256 `0f72c3b613598aef7aecec2bbce91d7013dc135f1e2885296028220333cf89c0`. It also names the unchanged 5132-byte material preparer `6cc8e8d629172d221c2aed1fca99976397858d0fc36108543dbe5cb6a9bfe9d8`; review 18 covers that file and its actual material evidence. The preparer is not a C++ compilation input, and its absence from the build report's C++ source map is not treated as proof that it compiled.

Exact copies of the two changed files, frozen inventory, compile handoff/report, process census and old native failure are preserved in canonical `tmp/review-runs/runtime-round19/`. `review-inventory.json` records each retained file's byte count and SHA-256. Target copies were hashed against originals. A late read confirmed both worker implementation files still matched the frozen hashes and the material preparer remained unchanged. No implementation, existing report, index or global configuration was edited by the reviewer.

## CNG status, length and resource handling

At [ShibuyaWorld.cpp:29](C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/Source/ShibuyaRuntime/Private/ShibuyaWorld.cpp:29), `HashBytes` opens `BCRYPT_SHA256_ALGORITHM` with no requested third-party provider and flags zero. The installed SDK `shared/bcrypt.h:932` defines that algorithm identifier as `SHA256`; the provider-open signature at lines 1210–1217 matches the call. The one-shot `BCryptHash` declaration at lines 1595–1605 accepts an algorithm handle, optional secret, byte input and fixed output buffer. The null secret/zero secret length and plain SHA-256 provider do not request HMAC.

The SDK declares `NTSTATUS` as signed `LONG` with success on nonnegative return at lines 38–44. Therefore the code's `Open < 0`, `Hashed < 0` and `Closed < 0` checks implement the documented success convention rather than confusing a nonzero informational status with failure or treating a negative error as success.

Input length is `Bytes.Num()`, converted to `ULONG`. The actual source-reader callers admit a byte count of 1 through 33,554,432 before allocation; all are below both the signed TArray count limit and the Windows unsigned count limit. The only zero-length caller is the explicit empty known vector, for which the code supplies the address of a valid dummy byte while still passing length zero. The `abc` initializer supplies exactly three bytes, without a NUL terminator. No string encoding, terminator addition, truncation, endianness transform or partial-prefix hashing is introduced. The cast removing constness is used to satisfy the API's `PUCHAR` type; the SDK marks the input `_In_reads_bytes_(cbInput)`, not an output buffer.

The output array is exactly 32 bytes for SHA-256. `BytesToHex(Hash,32).ToLower()` runs only after both hash and close calls succeed and returns the same lowercase 64-character digest convention used by source receipts. Uninitialized output cannot be serialized on a negative hash status because that path throws first.

After a successful open, the straight-line code calls `BCryptHash` and then `BCryptCloseAlgorithmProvider` before any error throw or FString formatting. A hashing failure still reaches the close call. A close failure also rejects the operation; no digest is returned after a failed release attempt. The failure-to-open branch does not claim ownership of a successfully opened provider. There is no persistent provider, global mutable hash state or separate hash-object handle requiring cleanup. These statements concern the API's returned-status paths; they do not claim recovery from process termination or a hardware exception.

`PublicSystemLibraries.Add("bcrypt.lib")` at [ShibuyaRuntime.Build.cs:9](C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/Source/ShibuyaRuntime/ShibuyaRuntime.Build.cs:9) is the explicit link dependency for this installed Windows API. The SDK exposes the one-shot call under its Windows 10 threshold guard; this task targets the installed Windows 11/Win64 environment. This revision does not claim portability to Linux/macOS or older unsupported Windows versions, and no unrelated cross-platform abstraction is required for the assigned Windows milestone.

## Admission order and unchanged trust checks

`LoadNetwork` calls `HashBytes` for the empty byte array and three-byte `abc` array at lines 133–136 before reading a source file. Their expected SHA-256 values are fixed constants, independent of the CNG implementation. `SHIBUYA_NATIVE_SHA256_KNOWN_VECTORS_PASS` is logged only if both comparisons succeed. An open/hash/close failure or a digest mismatch throws inside the existing `try`, reaching the existing catch at lines 295–299 that sets `Ready=false`, retains the error and returns false. The marker alone is therefore a known-vector witness, not city readiness.

The first source file is read at line 143 through `ReadBoundInput`; its helper at lines 42–47 still calls `Shibuya::ReadBoundedProjectInput`, hashes the complete returned array, compares any expected digest, and records the measured digest and byte count. Network and movement-manifest digest fields at lines 144 and 148 use the same `HashBytes` helper. The record-admission lambda at lines 150–158 keeps declared size and digest checks and supplies that same bounded read for source/support records. Actual network-to-movement-manifest equality remains at lines 160–162. The changed code contains no bypass for a missing or mismatched digest.

`InputsUnchanged` at lines 302–314 rereads each recorded file through the existing bounded, confined reader using its original expected size and hashes it with the same CNG helper. A hash mismatch returns false; a provider/read exception is caught and also returns false. The source-tree search found no remaining executable call to the old `GetSHA256Signature` API or separate SHA-256 implementation in this module. The included boundary-admission helper continues to receive the existing record-admission callback, so its admitted bytes use the same path.

Directly read unchanged input code confirms the allocation bound: `RuntimeFiles.cpp:43–57` checks confined path, stat size, opened size and expected size before `SetNumUninitialized`, then checks complete reading and unchanged size. `RuntimeReadLimit.h:8–13` sets and enforces 32 MiB. These prior trust checks are retained, not replaced with a raw CNG file-open path.

## Actual failure and compile evidence

The original native inventory attempt is canonical `Artifacts/runtime-game/0cb989a3045a4106bb61c7fafb75199d/`. Its report, 54326 bytes, SHA-256 `2634275ea7fe9ba297ea7346c4958c8cccd6868c018dba8c8aed6a17a5c9156b`, records `passed=false`, exit 3 and no fresh valid native result. Its 239375-byte stdout, SHA-256 `9805013ec3c04028d9076219524fdcfcefb0cacbc64d68f84d26698a0c9e0c88`, records the actual `No SHA256 Platform implementation` assertion at lines 1786–1793. The old attempt remains red; it is not a native source-admission success.

The installed `FGenericPlatformMisc::GetSHA256Signature` implementation at `GenericPlatformMisc.cpp:2019–2023` contains that assertion, zeros the output and returns false. The Windows platform header does not override this method. This directly supports replacing the inherited stub rather than assuming that successful linking meant Windows implemented it.

The new compile handoff is worker `Artifacts/runtime-build/20261011-121918/compiled-handoff.json`, 2124 bytes, SHA-256 `66e7a903247e8c111ff13bfe3a30ad72f36f2a12618ea6dbe728fa0ed1582b15`. It binds the frozen inventory and build report. The build report is 4968 bytes, SHA-256 `538d845a27392ca5c04a34a5934e2e19ee7dab0e71114655e95319bb0b1e4c82`, records unchanged source during the build and contains both exact changed source hashes.

| Build | Actual exit | Elapsed seconds | Recorded binary SHA-256 |
| --- | ---: | ---: | --- |
| Win64 Development Editor | 0 | 15.0533 | `057978e5e8b8dce600cfcecdb9afe2f96fac92f023b28a02bb24bf927e747247` |
| Win64 Development Game | 0 | 18.8652 | `ad7b40cae40a912a01b384a515c36780e0ecea3e08c0eb57aac5b12d1c07d8b5` |

The receipt identifies installed UE 5.8.3, compatible build ID 55116800 and the existing portable .NET Framework SDK admission with 152 verified files. The review did not install an SDK, introduce a new downloaded dependency or repeat a compiler run. Binary hashes above are the build handoff's measurements; this review independently rehashed the authored target and evidence, not the 332 MB Game executable. The owner remains responsible for exact binary integration and the native boot using those bytes.

The 74-byte compile process census SHA-256 is `e2a181145803465305fc87af39a10aa4047457f71a1a97c8ed23eac01d9cc947`. It lists owned build roots 59788 and 74100 and no remaining processes. The reviewer launched no engine/compiler/server or persistent helper and did not interfere with another worker's native lease.

## Direct-read primary identities and remaining native gate

| Directly read source | SHA-256 |
| --- | --- |
| `C:/Program Files (x86)/Windows Kits/10/Include/10.0.26100.0/shared/bcrypt.h` | `c979ee7490ec190779385d69a39026f9d79308eeb6aaada64ef0766c1e3e0376` |
| `C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/Core/Private/GenericPlatform/GenericPlatformMisc.cpp` | `3e6c82cce692d2620631344232226223d1e6e9227f8ee9a9cfe3c41c49e58d5f` |
| `C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/Core/Public/Windows/WindowsPlatformMisc.h` | `31a7f7dbfd6fe6668cce0f67bc27223031fc3505c070c54065dc779ecae795ee` |
| Worker `Source/ShibuyaRuntime/Private/RuntimeFiles.cpp` | `27ca306967d5844cb43f4b2e746e50e71911d59e7aad064230f02b1d33b302c4` |
| Worker `Source/ShibuyaRuntime/Public/RuntimeReadLimit.h` | `8b41ff12f62c3e754889e59a2103ee963854ee3074f2cc5c6037ef8cf5dcd007` |

The next gate must observe the known-vector marker from the repaired loaded binary, then a fresh native report with actual admitted file digests equal to the intended source receipts and complete owned-process cleanup. Do not infer those results from compilation, this static review or a stale inventory report. The material gate retains review 18's scoped acceptance; full native Game inventory, input, motion/physics, rendering and performance remain separate acceptance criteria.
